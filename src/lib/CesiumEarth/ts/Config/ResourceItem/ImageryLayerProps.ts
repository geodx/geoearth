
// 可参见：
// Cesium.ArcGisMapServerImageryProvider.ConstructorOptions
// Cesium.BingMapsImageryProvider.ConstructorOptions
// Cesium.GoogleEarthEnterpriseImageryProvider.ConstructorOptions
// Cesium.GridImageryProvider.ConstructorOptions
// Cesium.ImageryProvider.ConstructorOptions
// Cesium.IonImageryProvider.ConstructorOptions
// Cesium.MapboxImageryProvider.ConstructorOptions
// Cesium.MapboxStyleImageryProvider.ConstructorOptions
// Cesium.OpenStreetMapImageryProvider.ConstructorOptions
// Cesium.SingleTileImageryProvider.ConstructorOptions
// Cesium.TileCoordinatesImageryProvider.ConstructorOptions
// Cesium.TileMapServiceImageryProvider.ConstructorOptions
// Cesium.UrlTemplateImageryProvider.ConstructorOptions
// Cesium.WebMapServiceImageryProvider.ConstructorOptions
// Cesium.WebMapTileServiceImageryProvider.ConstructorOptions

import { Rectangle } from "cesium";
import type { LayerSchemeEnum } from "../Enum/LayerSchemeEnum";

interface ImageryLayerProps {
  scheme: LayerSchemeEnum,
  baseLayer?: boolean,
  minimumLevel: number,
  maximumLevel: number,
  url: string,
  rectangle: Rectangle,
  queryParameters: string,
  tileWidth: number,
  tileHeight: number,
  layers: string,
  assetId: number,
}
export type { ImageryLayerProps };
