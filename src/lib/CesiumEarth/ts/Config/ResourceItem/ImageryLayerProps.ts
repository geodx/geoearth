
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
  scheme: LayerSchemeEnum
  baseLayer?: boolean
  minimumLevel?: number,
  maximumLevel?: number
  url: string

  queryParameters?: object
  assetId?: number
  rectangle?: Rectangle
  layers?: string,
  layer?: string
  tileWidth?: number,
  tileHeight?: number
  scale?: number
  position?: {
    longitude: number,
    latitude: number,
    height?: number
  }
  orientation?: any
  DistanceDisplayCondition?: {
    near: number,
    far: number
  }
  minimumPixelSize?: number
  motion?: {
    path: [number, number][],
    speed: number
  }
  type?: string
}

export type { ImageryLayerProps };
