import { Cartesian3, EasingFunction, Math as CesiumMath, type Viewer } from 'cesium'

/**
 * 相机视角。
 *
 * 经纬度和姿态角均使用度，高度使用米。
 */
export interface CameraView {
    longitude: number
    latitude: number
    height: number
    heading?: number
    pitch?: number
    roll?: number
}

export interface StartAnimationOptions {
    /**
     * 最终目标视角。
     *
     * 不传时使用播放动画前的当前相机视角。
     */
    center?: CameraView

    /**
     * 动画开始时的初始位置。
     */
    initialView?: CameraView

    /**
     * 第一阶段飞行高度。
     * @default 23000000
     */
    cruiseHeight?: number

    /**
     * 第一阶段飞行时间，单位为秒。
     * @default 2
     */
    duration1?: number

    /**
     * 第二阶段飞行时间，单位为秒。
     * @default 2
     */
    duration2?: number

    /**
     * 最终飞入目标视角的时间，单位为秒。
     * @default 2
     */
    duration3?: number

    /**
     * 低空倾斜视角是否启用中间过渡阶段。
     * @default true
     */
    enableIntermediateFlight?: boolean

    /**
     * 启用中间过渡阶段的高度阈值。
     * @default 200000
     */
    intermediateHeightThreshold?: number
}

interface ResolvedStartAnimationOptions {
    center?: CameraView
    initialView: CameraView
    cruiseHeight: number
    duration1: number
    duration2: number
    duration3: number
    enableIntermediateFlight: boolean
    intermediateHeightThreshold: number
}

/**
 * 开场相机飞入动画。
 *
 * 动画流程：
 * 1. 瞬间定位到初始全球视角。
 * 2. 在高空飞到目标经纬度上方。
 * 3. 低空倾斜视角可先飞到过渡高度。
 * 4. 飞入最终目标位置和姿态。
 */
export class StartAnimation {
    private readonly viewer: Viewer
    private readonly defaultOptions: ResolvedStartAnimationOptions

    private playing = false
    private destroyed = false

    /**
     * 每次播放生成新的任务编号。
     * stop() 修改编号后，旧任务不会继续执行后续阶段。
     */
    private taskId = 0

    /**
     * 当前飞行动画的 Promise 结束函数。
     */
    private settleFlight?: (completed: boolean) => void

    constructor(
        viewer: Viewer,
        options: StartAnimationOptions = {}
    ) {
        this.viewer = viewer
        this.defaultOptions = this.resolveOptions(options)
    }

    get isPlaying(): boolean {
        return this.playing
    }

    /**
     * 播放开场动画。
     *
     * @returns true 表示完整播放结束，false 表示被取消。
     */
    async play(
        options: StartAnimationOptions = {}
    ): Promise<boolean> {
        this.ensureAvailable()

        // 停止上一次尚未完成的动画。
        this.stop()

        const currentTaskId = ++this.taskId
        const resolvedOptions = this.mergeOptions(options)

        /*
         * 必须在修改相机位置前读取目标视角。
         * 未传 center 时，动画最终回到播放前的相机视角。
         */
        const target =
            resolvedOptions.center ??
            this.getCameraView()

        this.playing = true

        try {
            this.setInitialView(
                resolvedOptions.initialView
            )

            // 第一阶段：飞到目标经纬度的全球高度。
            const firstCompleted = await this.flyTo({
                destination: {
                    longitude: target.longitude,
                    latitude: target.latitude,
                    height: resolvedOptions.cruiseHeight
                },
                duration: resolvedOptions.duration1,
                easingFunction:
                    EasingFunction.LINEAR_NONE
            })

            if (
                !firstCompleted ||
                !this.isCurrentTask(currentTaskId)
            ) {
                return false
            }

            /*
             * 当最终目标高度较低并且不是垂直俯视时，
             * 先下降到过渡高度，避免直接改变姿态产生突兀效果。
             */
            if (
                this.shouldUseIntermediateFlight(
                    target,
                    resolvedOptions
                )
            ) {
                const intermediateHeight =
                    this.calculateIntermediateHeight(
                        target.height
                    )

                const secondCompleted = await this.flyTo({
                    destination: {
                        longitude: target.longitude,
                        latitude: target.latitude,
                        height: intermediateHeight
                    },
                    duration: resolvedOptions.duration2
                })

                if (
                    !secondCompleted ||
                    !this.isCurrentTask(currentTaskId)
                ) {
                    return false
                }
            }

            // 最后一阶段：恢复目标高度和完整相机姿态。
            const finalCompleted = await this.flyTo({
                destination: target,
                duration: resolvedOptions.duration3,
                applyOrientation: true
            })

            return (
                finalCompleted &&
                this.isCurrentTask(currentTaskId)
            )
        } finally {
            if (this.taskId === currentTaskId) {
                this.playing = false
                this.settleFlight = undefined
            }
        }
    }

    /**
     * 停止当前动画。
     */
    stop(): void {
        ++this.taskId
        this.playing = false

        const settleFlight = this.settleFlight
        this.settleFlight = undefined

        if (!this.isViewerDestroyed()) {
            this.viewer.camera.cancelFlight()
        }

        /*
         * 某些情况下 cancelFlight 不一定触发 cancel 回调，
         * 因此主动结束当前 Promise。
         */
        settleFlight?.(false)
    }

    /**
     * 兼容旧项目的 deactivate 命名。
     */
    deactivate(): void {
        this.stop()
    }

    destroy(): void {
        if (this.destroyed) {
            return
        }

        this.stop()
        this.destroyed = true
    }

    /**
     * 获取当前相机视角。
     */
    getCameraView(): CameraView {
        this.ensureAvailable()

        const camera = this.viewer.camera
        const position = camera.positionCartographic

        return {
            longitude: CesiumMath.toDegrees(
                position.longitude
            ),
            latitude: CesiumMath.toDegrees(
                position.latitude
            ),
            height: position.height,
            heading: CesiumMath.toDegrees(
                camera.heading
            ),
            pitch: CesiumMath.toDegrees(
                camera.pitch
            ),
            roll: CesiumMath.toDegrees(
                camera.roll
            )
        }
    }

    private flyTo(options: {
        destination: CameraView
        duration: number
        applyOrientation?: boolean
        easingFunction?: EasingFunction.Callback
    }): Promise<boolean> {
        if (
            !this.playing ||
            this.destroyed ||
            this.isViewerDestroyed()
        ) {
            return Promise.resolve(false)
        }

        return new Promise(resolve => {
            let settled = false

            const settle = (completed: boolean) => {
                if (settled) {
                    return
                }

                settled = true

                if (this.settleFlight === settle) {
                    this.settleFlight = undefined
                }

                resolve(completed)
            }

            this.settleFlight = settle

            const destination = options.destination

            this.viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(
                    destination.longitude,
                    destination.latitude,
                    destination.height
                ),

                orientation: options.applyOrientation
                    ? {
                        heading: CesiumMath.toRadians(
                            destination.heading ?? 0
                        ),
                        pitch: CesiumMath.toRadians(
                            destination.pitch ?? -90
                        ),
                        roll: CesiumMath.toRadians(
                            destination.roll ?? 0
                        )
                    }
                    : undefined,

                duration: options.duration,
                easingFunction: options.easingFunction,

                complete: () => {
                    settle(true)
                },

                cancel: () => {
                    settle(false)
                }
            })
        })
    }

    private setInitialView(view: CameraView): void {
        this.viewer.camera.setView({
            destination: Cartesian3.fromDegrees(
                view.longitude,
                view.latitude,
                view.height
            ),

            orientation: {
                heading: CesiumMath.toRadians(
                    view.heading ?? 0
                ),
                pitch: CesiumMath.toRadians(
                    view.pitch ?? -90
                ),
                roll: CesiumMath.toRadians(
                    view.roll ?? 0
                )
            }
        })

        this.viewer.scene.requestRender()
    }

    private shouldUseIntermediateFlight(
        target: CameraView,
        options: ResolvedStartAnimationOptions
    ): boolean {
        if (!options.enableIntermediateFlight) {
            return false
        }

        if (
            target.height >=
            options.intermediateHeightThreshold
        ) {
            return false
        }

        const pitch = target.pitch ?? -90

        /*
         * 浮点数不直接使用 pitch !== -90 判断。
         */
        return Math.abs(pitch + 90) > 0.001
    }

    /**
     * 计算低空飞入前的过渡高度。
     *
     * 保留原逻辑：
     * 最终高度的 1.2 倍，再增加 8000 米缓冲。
     */
    private calculateIntermediateHeight(
        targetHeight: number
    ): number {
        return targetHeight * 1.2 + 8_000
    }

    private isCurrentTask(taskId: number): boolean {
        return (
            this.playing &&
            !this.destroyed &&
            this.taskId === taskId &&
            !this.isViewerDestroyed()
        )
    }

    private mergeOptions(
        options: StartAnimationOptions
    ): ResolvedStartAnimationOptions {
        return this.resolveOptions({
            ...this.defaultOptions,
            ...options,
            initialView: {
                ...this.defaultOptions.initialView,
                ...options.initialView
            },
            center: options.center
                ? {
                    ...this.defaultOptions.center,
                    ...options.center
                }
                : this.defaultOptions.center
        })
    }

    private resolveOptions(
        options: StartAnimationOptions
    ): ResolvedStartAnimationOptions {
        return {
            center: options.center,

            initialView: options.initialView ?? {
                longitude: -85.16,
                latitude: 13.71,
                height: 23_000_000,
                heading: 0,
                pitch: -90,
                roll: 0
            },

            cruiseHeight: Math.max(
                options.cruiseHeight ?? 23_000_000,
                0
            ),

            duration1: Math.max(
                options.duration1 ?? 2,
                0
            ),

            duration2: Math.max(
                options.duration2 ?? 2,
                0
            ),

            duration3: Math.max(
                options.duration3 ?? 2,
                0
            ),

            enableIntermediateFlight:
                options.enableIntermediateFlight ?? true,

            intermediateHeightThreshold: Math.max(
                options.intermediateHeightThreshold ??
                200_000,
                0
            )
        }
    }

    private ensureAvailable(): void {
        if (this.destroyed) {
            throw new Error(
                'StartAnimation has been destroyed.'
            )
        }

        if (this.isViewerDestroyed()) {
            throw new Error(
                'Cannot use StartAnimation because Viewer has been destroyed.'
            )
        }
    }

    private isViewerDestroyed(): boolean {
        return this.viewer.isDestroyed()
    }
}