import {
  defined, SceneMode, Camera, Cartesian3, Ray,
  IntersectionTests, ScreenSpaceCameraController,
} from "cesium";
import NavigationControl from "./NavigationControl";
import Utils from "../core/Utils";
import type { Terria } from "..";

/**
 * 放大/缩小导航控件
 */
class ZoomNavigationControl extends NavigationControl {

  public zoomInSvg?: string;
  public zoomOutSvg?: string;
  public terria: Terria;

  // 缩放倍率（放大时 <1，缩小 >1）
  private relativeAmount = 1;

  /**
   * The model for a zoom in control in the navigation control tool bar
   *
   * @alias ZoomOutNavigationControl
   * @constructor
   * @abstract
   *
   * @param {Terria} terria The Terria instance.
   * @param {boolean} zoomIn is used for zooming in (true) or out (false)
   */
  constructor(terria: Terria, zoomIn: boolean = true) {
    super(terria.viewerWidget);
    this.terria = terria
    // 名称
    if (zoomIn) {
      this.name = terria.options.zoomInTooltip || "放大";
      this.text = terria.options.zoomInSvg ? undefined : "+";
      this.zoomInSvg = terria.options.zoomInSvg;
    } else {
      this.name = terria.options.zoomOutTooltip || "缩小";
      this.text = terria.options.zoomOutSvg ? undefined : "−";
      this.zoomOutSvg = terria.options.zoomOutSvg;
    }

    // CSS 类
    this.cssClass = `navigation-control-icon-zoom-${zoomIn ? "in" : "out"}`;
    // 放大时取倒数，保证放大和缩小是对称的
    this.relativeAmount = 2;
    if (zoomIn) {
      this.relativeAmount = 1 / this.relativeAmount;
    }
  }

  public override activate(): void {
    this.zoom(this.relativeAmount);
  }

  private scratchCartesian = new Cartesian3();

  private zoom(relativeAmount: number): void {
    this.isActive = true;
    const scene = this.scene
    const sscc: ScreenSpaceCameraController = scene.screenSpaceCameraController;
    if (!sscc.enableInputs || !sscc.enableZoom) return;

    const camera: Camera = scene.camera;

    try {
      if (scene.mode === SceneMode.SCENE2D) {
        // 2D 模式：直接按高度缩放
        const height = camera.positionCartographic.height;
        camera.zoomIn(height * (1 - relativeAmount));
        return;
      }
      // 3D / Columbus View
      let focus: Cartesian3 | undefined;
      if (defined(this.viewer.trackedEntity)) {
        focus = new Cartesian3(); // 跟踪实体时不计算焦点
      } else {
        focus = Utils.getCameraFocus(this.terria, false);
      }

      let orientation: any;

      if (!defined(focus)) {
        // 相机没对准地球 → 用地平线交点作为焦点
        const ray = new Ray(camera.positionWC, camera.directionWC);
        focus = IntersectionTests.grazingAltitudeLocation(ray, scene.globe.ellipsoid);

        orientation = {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll,
        };
      } else {
        orientation = {
          direction: camera.direction,
          up: camera.up,
        };
      }

      // 超高空保护（避免数值爆炸）
      if (camera.position.z >= 406944828719368.56) {
        return
      }
      // 计算新位置：沿相机到焦点方向移动
      const direction = Cartesian3.subtract(camera.position, focus, this.scratchCartesian);
      const movement = Cartesian3.multiplyByScalar(direction, relativeAmount, direction);
      const endPosition = Cartesian3.add(focus, movement, new Cartesian3());

      if (defined(this.viewer.trackedEntity) || scene.mode === SceneMode.COLUMBUS_VIEW) {
        // 跟踪实体或 2.5D 时：瞬移（避免 flyTo 抖动）
        camera.position = endPosition;
      } else {
        // 平滑飞行
        camera.flyTo({
          destination: endPosition,
          orientation: orientation,
          duration: 0.5,
          convert: false,
        });
      }
    } finally {
      this.isActive = false;
    }
  }
}

export default ZoomNavigationControl;