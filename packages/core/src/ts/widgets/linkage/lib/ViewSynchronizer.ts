import {
    Cartesian2,
    Cartesian3,
    Cartographic,
    HeadingPitchRange,
    Matrix4,
    PerspectiveFrustum,
    SceneMode,
    type Viewer,
} from 'cesium'

interface ViewState {
    longitude: number
    latitude: number

    /** 中心距离处，每个 CSS 像素对应的近似尺度。 */
    scale: number
}

export class ViewSynchronizer {
    private active: Viewer
    private enabled = false
    private signature = ''

    private readonly removers: Array<() => void> = []
    private readonly secondaryInputs: boolean

    constructor(
        private readonly primary: Viewer,
        private readonly secondary: Viewer,
        private readonly bidirectional: boolean,
        private readonly onError: (error: unknown) => void,
    ) {
        this.assertSupported(primary)
        this.assertSupported(secondary)

        this.active = primary

        this.secondaryInputs =
            secondary.scene.screenSpaceCameraController.enableInputs

        this.bind(primary)

        if (bidirectional) {
            this.bind(secondary)
        }

        for (const viewer of [primary, secondary]) {
            this.removers.push(
                viewer.scene.preRender.addEventListener(() => {
                    if (this.active === viewer) {
                        this.update()
                    }
                }),
            )
        }
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled
        this.signature = ''

        if (!this.secondary.isDestroyed()) {
            this.secondary.scene.screenSpaceCameraController.enableInputs =
                enabled && !this.bidirectional
                    ? false
                    : this.secondaryInputs
        }

        if (enabled) {
            this.sync()
        }
    }

    sync(): void {
        this.signature = ''
        this.update()
    }

    syncFrom(viewer: Viewer): void {
        if (viewer !== this.primary && viewer !== this.secondary) {
            throw new Error('[GeoEarth linkage] 视图不属于当前关联')
        }

        if (!this.bidirectional && viewer !== this.primary) {
            throw new Error('[GeoEarth linkage] 当前为主视图单向驱动')
        }

        this.active = viewer
        this.sync()
    }

    destroy(): void {
        this.setEnabled(false)
        this.removers.splice(0).forEach(remove => remove())
    }

    private bind(viewer: Viewer): void {
        const activate = () => {
            if (!this.enabled || viewer.isDestroyed()) return
            if (this.active === viewer) return

            this.active = viewer
            this.signature = ''

            const follower = viewer === this.primary
                ? this.secondary
                : this.primary

            if (!follower.isDestroyed()) {
                follower.camera.cancelFlight()
            }
        }

        for (const type of ['pointerdown', 'wheel', 'keydown']) {
            viewer.canvas.addEventListener(type, activate, {
                capture: true,
                passive: true,
            })

            this.removers.push(() => {
                viewer.canvas.removeEventListener(type, activate, true)
            })
        }
    }

    private update(): void {
        if (!this.enabled) return

        const source = this.active
        const target = source === this.primary
            ? this.secondary
            : this.primary

        if (source.isDestroyed() || target.isDestroyed()) return

        // 模式切换、实体跟踪期间暂停，避免争抢相机控制权。
        if (
            source.scene.mode === SceneMode.MORPHING ||
            target.scene.mode === SceneMode.MORPHING ||
            source.trackedEntity ||
            target.trackedEntity
        ) return

        if (
            source.canvas.clientWidth === 0 ||
            source.canvas.clientHeight === 0 ||
            target.canvas.clientWidth === 0 ||
            target.canvas.clientHeight === 0
        ) return

        try {
            this.assertSupported(source)
            this.assertSupported(target)

            // 二维缩放也会改变投影矩阵，因此不能只比较 viewMatrix。
            const signature = [
                source.scene.mode,
                source.canvas.clientWidth,
                source.canvas.clientHeight,
                ...Matrix4.toArray(source.camera.viewMatrix),
                ...Matrix4.toArray(source.camera.frustum.projectionMatrix),
            ].join(',')

            if (signature === this.signature) return

            if (
                source.scene.mode === SceneMode.SCENE3D &&
                target.scene.mode === SceneMode.SCENE3D
            ) {
                this.copy3D(source, target)
            } else {
                const state = this.readState(source)
                if (!state) return

                this.applyState(target, state)
            }

            this.signature = signature
            target.scene.requestRender()
        } catch (error) {
            this.setEnabled(false)
            this.onError(error)
        }
    }

    private readState(viewer: Viewer): ViewState | undefined {
        const width = viewer.canvas.clientWidth
        const height = viewer.canvas.clientHeight
        const ellipsoid = viewer.scene.mapProjection.ellipsoid

        const center = viewer.camera.pickEllipsoid(
            new Cartesian2(width / 2, height / 2),
            ellipsoid,
        )

        // 朝向天空时保留跟随视图的上一次有效位置。
        if (!center) return undefined

        const position = Cartographic.fromCartesian(center, ellipsoid)

        const distance = viewer.scene.mode === SceneMode.SCENE3D
            ? Cartesian3.distance(viewer.camera.positionWC, center)
            : 1

        const pixel = viewer.camera.frustum.getPixelDimensions(
            width,
            height,
            distance,
            1,
            new Cartesian2(),
        )

        if (!Number.isFinite(pixel.y) || pixel.y <= 0) {
            return undefined
        }

        return {
            longitude: position.longitude,
            latitude: position.latitude,
            scale: pixel.y,
        }
    }

    private applyState(viewer: Viewer, state: ViewState): void {
        const camera = viewer.camera
        const width = viewer.canvas.clientWidth
        const height = viewer.canvas.clientHeight
        const ellipsoid = viewer.scene.mapProjection.ellipsoid

        camera.cancelFlight()

        if (viewer.scene.mode === SceneMode.SCENE2D) {
            // Cesium 二维 setView 的高度参数用于设置视锥宽度。
            camera.setView({
                destination: Cartesian3.fromRadians(
                    state.longitude,
                    state.latitude,
                    state.scale * width,
                    ellipsoid,
                ),
                orientation: {
                    heading: 0,
                    pitch: -Math.PI / 2,
                    roll: 0,
                },
                endTransform: Matrix4.IDENTITY,
            })

            return
        }

        const unitPixel = camera.frustum.getPixelDimensions(
            width,
            height,
            1,
            1,
            new Cartesian2(),
        )

        const range = Math.max(state.scale / unitPixel.y, 1)

        const center = Cartesian3.fromRadians(
            state.longitude,
            state.latitude,
            0,
            ellipsoid,
        )

        // 保留三维视图自己的观察方向，避免操作二维后变成俯视。
        const heading = camera.heading
        const pitch = Math.max(
            -Math.PI / 2,
            Math.min(camera.pitch, -Math.PI / 180),
        )

        camera.lookAt(
            center,
            new HeadingPitchRange(heading, pitch, range),
        )

        // 解除 lookAt 引入的局部坐标变换，保留当前世界坐标姿态。
        camera.lookAtTransform(Matrix4.IDENTITY)
    }

    private copy3D(source: Viewer, target: Viewer): void {
        target.camera.cancelFlight()

        target.camera.setView({
            destination: Cartesian3.clone(source.camera.positionWC),
            orientation: {
                direction: Cartesian3.clone(source.camera.directionWC),
                up: Cartesian3.clone(source.camera.upWC),
            },
            endTransform: Matrix4.IDENTITY,
        })
    }

    private assertSupported(viewer: Viewer): void {
        const mode = viewer.scene.mode

        if (
            mode !== SceneMode.SCENE2D &&
            mode !== SceneMode.SCENE3D
        ) {
            throw new Error('[GeoEarth linkage] 当前仅支持二维和三维场景')
        }

        if (
            mode === SceneMode.SCENE3D &&
            !(viewer.camera.frustum instanceof PerspectiveFrustum)
        ) {
            throw new Error('[GeoEarth linkage] 三维视图需要使用透视相机')
        }
    }
}