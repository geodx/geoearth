/****************************************************************************
 名称：创建一个专用于鹰眼的极简 Cesium Viewer

 最后修改日期：2025-11-18
 ****************************************************************************/

import type { Viewer } from "cesium";
import { CesiumWidget } from "cesium";
import { Color, ImageryLayer, OpenStreetMapImageryProvider, SceneMode } from "cesium";

function createOverview(): CesiumWidget {
  // 确保容器存在
  const container = document.getElementById("ol-container");
  if (!container) throw new Error('Overview container not found');

  const viewer = new CesiumWidget(container, {
    requestRenderMode: true,                    // 只有变化时渲染 
    maximumRenderTimeChange: Infinity,
    baseLayer: new ImageryLayer(new OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
    })),
    sceneMode: SceneMode.SCENE2D,
  });

  // 隐藏默认版权 
  viewer.creditDisplay.container.remove();
  viewer.scene.backgroundColor = Color.BLACK
  viewer.resolutionScale = window.devicePixelRatio;

  viewer.scene.screenSpaceCameraController.enableRotate = false;
  viewer.scene.screenSpaceCameraController.enableTilt = false;
  viewer.scene.screenSpaceCameraController.enableZoom = false;
  viewer.scene.screenSpaceCameraController.enableTranslate = false; //平移
  viewer.scene.screenSpaceCameraController.enableLook = false;

  // 可选：加个边框更好看
  // container.style.border = '3px solid rgba(255,255,255,0.8)';
  // container.style.borderRadius = '10px';
  // container.style.overflow = 'hidden';
  // container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';

  return viewer;
}

export { createOverview };
