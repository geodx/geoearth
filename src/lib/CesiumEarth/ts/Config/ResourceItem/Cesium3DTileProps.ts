interface Cesium3DTileProps {
  url: string,
  queryParameters: string,
  offset: {
    lon: number,
    lat: number,
    height: number
  };
  type?: string,
}

export type { Cesium3DTileProps };
