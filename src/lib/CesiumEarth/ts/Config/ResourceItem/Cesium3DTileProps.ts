interface Cesium3DTileProps {
  scheme?: string,
  url?: string,
  queryParameters?: string,
  offset?: {
    lon: number,
    lat: number,
    height: number
  };
  type?: string,
  layers?: string,

  tileWidth?: number,
  tileHeight?: number,
  minimumLevel?: number,
  maximumLevel?: number,
  assetId?: number,
  debugShowUrl?: boolean,
}

export type { Cesium3DTileProps };
