import type { Viewer } from 'cesium'
import type { CameraManager } from '../../camera/CameraManager'
import DistanceLegendViewModel from './viewModels/DistanceLegendViewModel'
import NavigationViewModel from './viewModels/NavigationViewModel'
import type { NavigationContext, NavigationOptions } from './types'

/** 导航插件，包含罗盘、外环旋转、内盘环绕观察、缩放、视角复位和比例尺。 */
export class Navigation {
    private root?: HTMLElement
    private viewModel?: NavigationViewModel
    private readonly distanceLegend: DistanceLegendViewModel

    constructor(private readonly viewer: Viewer, private readonly camera: CameraManager) {
        this.distanceLegend = new DistanceLegendViewModel(viewer)
    }

    get isCreated(): boolean { return this.root !== undefined }

    /** 创建完整导航插件，替换已有实例及其配置。 */
    create(options: NavigationOptions = {}): this {
        this.assertAlive()
        const position = options.position ?? 'top-right'
        if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(position)) throw new RangeError('Invalid navigation position')
        if (options.duration !== undefined && (!Number.isFinite(options.duration) || options.duration < 0)) throw new RangeError('duration must not be negative')
        const resolvedOptions = {
            ...options,
            enableCompass: options.enableCompass ?? true,
            enableZoomControls: options.enableZoomControls ?? true,
            enableDistanceLegend: options.enableDistanceLegend ?? true,
            enableCompassOuterRing: options.enableCompassOuterRing ?? true,
        }
        this.destroy()
        const host = this.viewer.container
        const doc = host.ownerDocument
        const root = doc.createElement('div')
        root.className = resolvedOptions.enableDistanceLegend
            ? 'geoearth-navigation geoearth-navigation--with-distance-legend'
            : 'geoearth-navigation'
        const panel = doc.createElement('div')
        panel.className = `geoearth-navigation-panel geoearth-navigation-panel--${position}`
        root.appendChild(panel)
        host.appendChild(root)
        this.root = root
        const context: NavigationContext = {
            viewerWidget: this.viewer,
            options: resolvedOptions,
            cameraManager: this.camera,
            container: panel,
            get trackedEntity() { return context.viewerWidget.trackedEntity },
            set trackedEntity(entity) { context.viewerWidget.trackedEntity = entity },
            beforeNavigate: () => this.camera.cancelFlight(),
            reportError: error => { if (resolvedOptions.onError) resolvedOptions.onError(error); else console.error('[GeoEarth navigation]', error) },
        }
        try {
            if (context.options.enableCompass || context.options.enableZoomControls) this.viewModel = NavigationViewModel.create(context)
            if (resolvedOptions.enableDistanceLegend) this.distanceLegend.open(root)
        } catch (error) {
            this.destroy()
            throw error
        }
        return this
    }

    show(): void {
        this.assertAlive()
        if (!this.root) return
        this.root.style.display = ''
        this.distanceLegend.show()
    }

    hide(): void {
        this.viewModel?.stopInteraction()
        if (this.root) this.root.style.display = 'none'
        this.distanceLegend.hide()
    }

    destroy(): void {
        this.viewModel?.destroy()
        this.viewModel = undefined
        this.distanceLegend.destroy()
        this.root?.remove()
        this.root = undefined
    }

    /** 锁定或解锁导航交互，控件保持可见。 */
    setLocked(locked: boolean): void { this.viewModel?.setNavigationLocked(locked) }

    private assertAlive(): void {
        if (this.viewer.isDestroyed()) throw new Error('Navigation has been destroyed')
    }
}
