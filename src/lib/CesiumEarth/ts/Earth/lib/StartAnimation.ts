// src/core/animation/StartAnimation.ts
import * as Cesium from 'cesium';
import { ConfigTool } from '../../Config';

export interface StartAnimationConfig {
  /** 是否启用开场动画 */
  enabled: boolean;
  /** 是否先全球旋转一圈 */
  rotateGlobe: boolean;
  /** 旋转圈数（默认 1 圈） */
  rotateTurns: number;
  /** 旋转速度（rad/s） */
  rotateSpeed: number;
  /** 飞入目标位置（经纬度 + 高度） */
  destination: {
    longitude: number;
    latitude: number;
    height: number;
    headingRadians?: number;
    pitchRadians?: number;
    rollRadians?: number;
  };
  /** 飞入动画时长（秒） */
  flyDuration: number;
}

export class StartAnimation {
  private viewer: Cesium.Viewer;
  private config: StartAnimationConfig;
  private rotating = false;
  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    const APPConfig = ConfigTool.config;
    // 默认配置 
    this.config = {
      enabled: APPConfig.startAnimation,
      rotateGlobe: true,
      rotateTurns: 1,
      rotateSpeed: 0.018,
      destination: {
        longitude: APPConfig.homeView.longitude,
        latitude: APPConfig.homeView.latitude,
        height: APPConfig.homeView.height,
        headingRadians: APPConfig.homeView.headingRadians,
        pitchRadians: APPConfig.homeView.pitchRadians,
        rollRadians: APPConfig.homeView.rollRadians
      },
      flyDuration: 2.0,
    };
  }

  /** 激活动画 
   * - 返回 Promise
   */
  async activate(): Promise<void> {
    if (!this.config.enabled) return;

    // 步骤1：设置初始全局视角(Earth初始化调用initViewerStata已处理)
    // this.viewer.camera.setView({
    //   destination: Cartesian3.fromDegrees(
    //     APPConfig.homeView.longitude,
    //     APPConfig.homeView.latitude,
    //     APPConfig.homeView.height
    //   ),
    //   orientation: {
    //     heading: APPConfig.homeView.headingRadians,
    //     pitch: APPConfig.homeView.pitchRadians,
    //     roll: APPConfig.homeView.rollRadians
    //   }
    // });


    // 步骤2：全球旋转动画
    if (this.config.rotateGlobe) {
      await this.rotateGlobe();
    }
    // 步骤3：飞入目标位置
    // const destination = Cesium.Cartesian3.fromDegrees(
    //   this.config.destination.longitude,
    //   this.config.destination.latitude,
    //   this.config.destination.height
    // );
    // await this.viewer.camera.flyTo({
    //   destination,
    //   orientation: {
    //     heading: this.config.destination.headingRadians,
    //     pitch: this.config.destination.pitchRadians,
    //     roll: this.config.destination.rollRadians
    //   },
    //   duration: this.config.flyDuration,
    // });
  }

  /** 全球旋转 */
  private rotateGlobe(): Promise<void> {
    return new Promise(resolve => {
      if (!this.config.rotateGlobe || this.config.rotateTurns <= 0) {
        resolve();
        return;
      }

      this.rotating = true;
      let angle = 0;
      const totalAngle = Math.PI * 2 * this.config.rotateTurns;
      const speed = this.config.rotateSpeed;

      const handler = () => {
        if (!this.rotating) {
          this.cleanupRotation(handler)
          resolve();
          return;
        }
        angle += speed;
        if (angle >= totalAngle) {
          this.rotating = false;
          this.cleanupRotation(handler)
          resolve();
          return;
        }
        const rotationMatrix = Cesium.Matrix3.fromRotationZ(-angle);
        const rotation = Cesium.Matrix4.fromRotationTranslation(rotationMatrix);
        let offset = Cesium.Cartesian3.clone(this.viewer.camera.position);
        this.viewer.camera.lookAtTransform(rotation, offset);
      };
      this.viewer.scene.postUpdate.addEventListener(handler);
    });
  }
  private cleanupRotation(handler: () => void) {
    this.viewer.scene.postUpdate.removeEventListener(handler);
    // 恢复默认坐标系
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    this.viewer.scene.requestRender();
  }
  /** 强制停止动画 */
  stop() {
    this.rotating = false;
    this.viewer.camera.cancelFlight?.(); //取消飞行 
  }
}