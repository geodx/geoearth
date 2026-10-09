/****************************************************************************
 名称：创建一个专用于鹰眼的CesiumWidget

 最后修改日期：2025-11-18
 ****************************************************************************/

import { CesiumWidget, Color, Credit, CreditDisplay, ImageryLayer, OpenStreetMapImageryProvider, SceneMode, Viewer } from 'cesium';

import { resolveContainer } from '../../viewer/resolveContainer';
import { OverviewMapOptions } from './types';
import { createRoot } from './createRootContainer';

function createOverview(root: HTMLElement, options: OverviewMapOptions): CesiumWidget {

  const cesiumWidget = new CesiumWidget(root, {
    baseLayer: options.baseLayer ?? createDefaultBaseLayer(),
    sceneMode: SceneMode.SCENE2D,
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
    skyBox: false,
    skyAtmosphere: false
  })
  configureWidget(cesiumWidget)
  return cesiumWidget;
}

function configureWidget(cesiumWidget: CesiumWidget): void {
  cesiumWidget.scene.backgroundColor = Color.fromCssColorString('#08131d')
  cesiumWidget.scene.globe.baseColor = Color.fromCssColorString('#08131d')

  cesiumWidget.scene.screenSpaceCameraController.enableInputs = false
}



function createDefaultBaseLayer(): ImageryLayer {
  // return ImageryLayer.fromProviderAsync(
  //     SingleTileImageryProvider.fromUrl(defaultImage)
  // )
  return new ImageryLayer(new OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  }))
}



export { createOverview };
