import {
  defined, SceneMode, Camera, Cartesian3, Ray,
  IntersectionTests, ScreenSpaceCameraController, Math as CesiumMath
} from "cesium";
import NavigationControl from "./NavigationControl";
import Utils from "../core/Utils";
import type { NavigationContext } from '../types';

/**
 * 放大/缩小导航控件
 */
class ZoomNavigationControl extends NavigationControl {

  public zoomInSvg?: string;
  public zoomOutSvg?: string;
  private readonly context: NavigationContext;

  // 缩放倍率（放大时 <1，缩小 >1）
  private relativeAmount = 1;

  /**
   * 创建放大或缩小导航控件。
   *
   * @param context 导航插件上下文。
   * @param zoomIn 为 true 时放大，为 false 时缩小。
   */
  constructor(context: NavigationContext, zoomIn: boolean = true) {
    super(context.viewerWidget);
    this.context = context
    // 名称
    if (zoomIn) {
      this.name = context.options.zoomInTooltip || "放大";
      this.text = context.options.zoomInSvg ? undefined : "+";
      this.zoomInSvg = context.options.zoomInSvg;
    } else {
      this.name = context.options.zoomOutTooltip || "缩小";
      this.text = context.options.zoomOutSvg ? undefined : "−";
      this.zoomOutSvg = context.options.zoomOutSvg;
    }

    this.svgIcon = zoomIn ? this.zoomInSvg : this.zoomOutSvg;

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
    const scene = this.scene
    const sscc: ScreenSpaceCameraController = scene.screenSpaceCameraController;
    if (this.context.navigationLocked || !sscc.enableInputs || !sscc.enableZoom || scene.mode === SceneMode.MORPHING) return;
    this.context.beforeNavigate();
    this.isActive = true;

    const camera: Camera = scene.camera;

    try {
      if (scene.mode === SceneMode.SCENE2D) {
        // 2D 模式：直接按高度缩放
        const height = camera.positionCartographic.height;
        let targetHeight = height * relativeAmount
        if (sscc.enableCollisionDetection) {
          targetHeight = CesiumMath.clamp(targetHeight, sscc.minimumZoomDistance, sscc.maximumZoomDistance)
        }
        camera.zoomIn(height - targetHeight)
        return;
      }
      // 三维或二维半模式。
      let focus: Cartesian3 | undefined;
      if (defined(this.viewer.trackedEntity)) {
        focus = new Cartesian3(); // 跟踪实体时不计算焦点
      } else {
        focus = Utils.getCameraFocus(this.context, false);
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
      if (!focus) return;
      const direction = Cartesian3.subtract(camera.position, focus, this.scratchCartesian);
      const movement = Cartesian3.multiplyByScalar(direction, relativeAmount, direction);
      const endPosition = this.limitZoomTarget(Cartesian3.add(focus, movement, new Cartesian3()))
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
      scene.requestRender();
      this.isActive = false;
    }
  }

  private limitZoomTarget(target: Cartesian3): Cartesian3 {
    const scene = this.scene
    const camera = scene.camera
    const controller = scene.screenSpaceCameraController

    // 与 Cesium 的配置语义保持一致。
    if (!controller.enableCollisionDetection) return target

    const minimum = Math.max(0, controller.minimumZoomDistance)
    const maximum = Math.max(minimum, controller.maximumZoomDistance)

    if (this.viewer.trackedEntity) {
      // 原缩放算法在跟踪坐标系下以原点作为焦点。
      const range = Cartesian3.magnitude(target)
      if (range === 0) return target

      const limitedRange = CesiumMath.clamp(range, minimum, maximum)

      return Cartesian3.multiplyByScalar(
        target,
        limitedRange / range,
        new Cartesian3(),
      )
    }

    const world = camera.cameraToWorldCoordinatesPoint(
      target,
      new Cartesian3(),
    )

    const cartographic = scene.mode === SceneMode.SCENE3D
      ? scene.globe.ellipsoid.cartesianToCartographic(world)
      : scene.mapProjection.unproject(
        // 二维半模式的场景坐标依次对应高度、投影 X 和投影 Y。
        new Cartesian3(world.y, world.z, world.x),
      )

    if (!cartographic) return target

    const terrainHeight = scene.globe.getHeight(cartographic) ?? 0
    const minimumHeight = terrainHeight + minimum
    const maximumHeight = Math.max(minimumHeight, maximum)

    const limitedHeight = CesiumMath.clamp(
      cartographic.height,
      minimumHeight,
      maximumHeight,
    )

    if (limitedHeight === cartographic.height) return target
    cartographic.height = limitedHeight

    if (scene.mode === SceneMode.SCENE3D) {
      scene.globe.ellipsoid.cartographicToCartesian(cartographic, world)
    } else {
      const projected = scene.mapProjection.project(cartographic)
      Cartesian3.fromElements(
        projected.z,
        projected.x,
        projected.y,
        world,
      )
    }

    return camera.worldToCameraCoordinatesPoint(world, new Cartesian3())
  }
}

export default ZoomNavigationControl;
