/****************************************************************************
 名称：初始化 Viewer视图 的状态，去除商标，设置初始相机姿态等

 最后修改日期：2022-03-25
 ****************************************************************************/

import { Camera, Cartesian3, Color, Rectangle, Viewer, } from 'cesium';
import { ConfigTool } from '../../Config/ConfigTool';

// 隐藏 Cesium icon商标，飞到初始位置
function initViewerStata(viewer: Viewer) {
  const APPConfig = ConfigTool.config;

  viewer.scene.skyAtmosphere!.show = false;
  viewer.scene.globe.show = false;

  viewer.scene.globe.baseColor = Color.WHITE; // 没有影像图层时地球的底色
  // viewer.scene.globe.depthTestAgainstTerrain = true; // 开启深度检测
  // 去除Cesium版权信息 
  viewer.creditDisplay.container.remove()
  // home定位到中国范围
  Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
    APPConfig.homeView.longitude - 0.5,
    APPConfig.homeView.latitude - 0.5,
    APPConfig.homeView.longitude + 0.5,
    APPConfig.homeView.latitude + 0.5
  );

  // 设置相机位置在中国位置
  viewer.scene.camera.setView({
    destination: Cartesian3.fromDegrees(
      APPConfig.homeView.longitude,
      APPConfig.homeView.latitude,
      APPConfig.homeView.height
    ),
    orientation: {
      heading: APPConfig.homeView.headingRadians,
      pitch: APPConfig.homeView.pitchRadians,
      roll: APPConfig.homeView.rollRadians
    }
  });

  // 是否开启抗锯齿，开启抗锯齿会导致文字模糊
  viewer.scene.postProcessStages.fxaa.enabled = false;

}

export { initViewerStata };
