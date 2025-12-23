import { Resource, UrlTemplateImageryProvider, WebMercatorTilingScheme } from "cesium"

function ImageryXYZ_3857_Provider(url: string, param: any) {
  let queryParameters = param.properties.queryParameters || {}
  let resource = new Resource({ url, queryParameters })

  return new UrlTemplateImageryProvider({
    url: resource,
    tilingScheme: new WebMercatorTilingScheme(),
    minimumLevel: param.properties.minimumLevel || 0,
    maximumLevel: param.properties.maximumLevel || 22,
  })
}

export default ImageryXYZ_3857_Provider
