
import {
  defined, Camera, Cartographic,
  Math as CesiumMath, Ellipsoid,
} from "cesium";
import NavigationControl from "./NavigationControl";
import type { Terria } from "..";
import svgReset from "../svgPaths/svgReset";



class ResetViewNavigationControl extends NavigationControl {
  public override name: string;
  public override svgIcon: string;
  public override svgHeight = 15;
  public override svgWidth = 15;
  public override cssClass = "navigation-control-icon-reset";

  private navigationLocked = false;
  private resetSvg?: string;
  private resetSuccess?: () => void;

  constructor(private terria: Terria) {
    super(terria.viewerWidget);

    this.name = terria.options.resetTooltip || "重置视图";
    this.svgIcon = terria.options.resetSvg || svgReset;
    this.resetSvg = terria.options.resetSvg;
    // this.resetSuccess = terria.options.resetSuccess;
  }

  public setNavigationLocked(locked: boolean): void {
    this.navigationLocked = locked;
  }

  public override activate(): void {
    this.resetView();
  }

  private resetView(): void {
    if (this.navigationLocked) return;

    const scene = this.terria.viewerWidget.scene;
    const sscc = scene.screenSpaceCameraController;
    if (!sscc.enableInputs) return;

    this.isActive = true;

    const camera = scene.camera;

    // 如果正在跟踪实体，先取消再恢复（保持跟踪状态）
    if (defined(this.terria.trackedEntity)) {
      const tracked = this.terria.trackedEntity;
      this.terria.trackedEntity = undefined;
      this.terria.trackedEntity = tracked;
    } else {
      const duration = this.terria.options.duration ?? 3;
      const defaultResetView = this.terria.options.defaultResetView;
      const orientation = this.terria.options.orientation ?? {
        heading: CesiumMath.toRadians(5.729578), // 默认朝北偏一点
        pitch: -CesiumMath.PI_OVER_TWO,
        roll: 0,
      };

      if (defaultResetView) {
        if (defaultResetView instanceof Cartographic) {
          camera.flyTo({
            destination: Ellipsoid.WGS84.cartographicToCartesian(defaultResetView),
            orientation,
            duration,
            complete: this.resetSuccess,
          });
        }
      } else {
        // 默认飞到全球视野
        camera.flyTo({
          destination: Camera.DEFAULT_VIEW_RECTANGLE,
          duration,
        });
      }
    }

    this.isActive = false;
  }
}

export default ResetViewNavigationControl;