import { Cartographic, Rectangle, Math as CesiumMath } from 'cesium'
import NavigationControl from './NavigationControl'
import type { NavigationContext } from '../types'
import svgReset from '../svgPaths/svgReset'

class ResetViewNavigationControl extends NavigationControl {
  public override cssClass = 'navigation-control-icon-reset'
  private navigationLocked = false

  constructor(private readonly context: NavigationContext) {
    super(context.viewerWidget)
    this.name = context.options.resetTooltip || '重置视图'
    this.svgIcon = context.options.resetSvg || svgReset
  }

  public setNavigationLocked(locked: boolean): void { this.navigationLocked = locked }

  public override activate(): void {
    if (this.navigationLocked || this.context.navigationLocked || !this.scene.screenSpaceCameraController.enableInputs) return
    this.context.beforeNavigate()
    this.isActive = true
    try {
      if (this.viewer.trackedEntity) {
        const tracked = this.viewer.trackedEntity
        this.viewer.trackedEntity = undefined
        this.viewer.trackedEntity = tracked
        return
      }
      const { defaultResetView: destination, orientation, duration = 3 } = this.context.options
      if (destination instanceof Cartographic || destination instanceof Rectangle) {
        this.camera.flyTo({
          destination: destination instanceof Rectangle ? destination : this.scene.globe.ellipsoid.cartographicToCartesian(destination),
          orientation: orientation ?? { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
          duration,
        })
      } else {
        const flight = destination
          ? this.context.cameraManager.flyTo({ ...destination, duration })
          : this.context.cameraManager.reset(duration)
        void flight.catch(this.context.reportError)
      }
    } finally {
      this.isActive = false
      this.scene.requestRender()
    }
  }
}
export default ResetViewNavigationControl
