import { ArcGisMapServerImageryProvider, GeographicTilingScheme, ImageryLayer, ImageryProvider, IonImageryProvider, Rectangle, Resource, SingleTileImageryProvider, TileMapServiceImageryProvider, UrlTemplateImageryProvider, Viewer, WebMapServiceImageryProvider, WebMapTileServiceImageryProvider, WebMercatorTilingScheme } from 'cesium'
import { CesiumData } from './impl/CesiumData'
import { LayerSchemeEnum } from '../../Config/Enum/LayerSchemeEnum'
import type { ResourceItem } from '../../Config/ResourceItem'
import type { ImageryLayerProps } from '../../Config/ResourceItem/ImageryLayerProps'
import { SceneUtils } from '../../Utils/SceneUtils'
class CesiumLayer extends CesiumData<ImageryLayer> {

  constructor(viewer: Viewer) {
    super(viewer)
  }

  async addData(resourceItem: ResourceItem): Promise<unknown> {
    const prop = resourceItem.properties as ImageryLayerProps
    const url = prop.url
    let layer = null
    switch (prop.scheme) {
      case LayerSchemeEnum['layer-wms']:
        layer = this.addWebMapTileServiceImageryProvider(url, resourceItem)
        break
      case LayerSchemeEnum['layer-tms']:
        layer = this.addImageryXYZ_TMS_Provider(url, resourceItem)
        break
      case LayerSchemeEnum['layer-wmts']:
        layer = this.addWebMapTileServiceImageryProvider(url, resourceItem)
        break
      case LayerSchemeEnum['layer-singleTileImagery']:
        layer = this.addSingleTileImagery(url, resourceItem)
        break
      case LayerSchemeEnum['layer-xyz-3857']:
        layer = this.addImageryXYZ_3857_Provider(url, resourceItem)
        break
      case LayerSchemeEnum['layer-xyz-4326']:
        layer = this.addImageryXYZ_4326_Provider(url, resourceItem)
        break
      case LayerSchemeEnum['layer-arcgisMapServer']:
        layer = this.addArcGisMapServerImagery(url, resourceItem)
        break
      case LayerSchemeEnum['layer-geoserver']:
        layer = this.addGeoserverWMS(url, resourceItem)
        break
      case LayerSchemeEnum['IonImageryProvider']: {
        const img = await IonImageryProvider.fromAssetId((resourceItem.properties as ImageryLayerProps).assetId)
        layer = this.addImageryProvider(img, resourceItem)
        break
      }
      case LayerSchemeEnum['WebMercatorTilingScheme2x2']:
        layer = this.addImageryWebMercatorTilingScheme2x2_Provider(url, resourceItem)
        break
      default: {
        console.log('数据项，缺少图层类型标识符', prop)
        return null
      }
    }

    return layer
  }


  async flyToByPid(pid: string): Promise<boolean> {
    const sourcesItem = this.getSourcesItemsByPid(pid)
    if (!sourcesItem) return false
    const r = (sourcesItem.properties as ImageryLayerProps).rectangle

    if (r) {
      return new Promise(() => {
        this.viewer.camera.flyTo({
          destination: r
        })
      })
    } else {
      return await SceneUtils.viewerFlyToLonLat(110, 40, 15000000)
    }
  }

  removeByPid(pid: string): boolean {
    let removeRes = false
    const instance = this.getInstancesByPid(pid)
    this.sourcesItems = this.sourcesItems.filter(item => item.pid !== pid)

    if (instance) {
      removeRes = this.viewer.imageryLayers.remove(instance)
      if (!instance.isDestroyed()) {
        instance.destroy()
      }
      this.instancesMap.delete(pid)

    }
    return removeRes
  }

  async addSingleTileImagery(url: string, param: ResourceItem) {

    console.log();
    url = url || (await import('../../../img/earth/worldimage2.png')).default
    const properties = param.properties as ImageryLayerProps
    let layerRectangle = properties.rectangle
    if (Array.isArray(layerRectangle)) {
      layerRectangle = Rectangle.fromDegrees(...layerRectangle)
    } else {
      layerRectangle = Rectangle.MAX_VALUE
    }
    const paramDefault = {
      url: url,
      rectangle: layerRectangle,
      tileWidth: properties.tileWidth || 256,
      tileHeight: properties.tileHeight || 256
    }
    return this.addImageryProvider(new SingleTileImageryProvider({
      ...paramDefault,
      ...param.properties
    }), param)
  }

  // 添加 wmts 服务的地图
  addWebMapTileServiceImageryProvider(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties.queryParameters || {}
    const resource = new Resource({ url, queryParameters })
    const paramDefault = {
      layer: '',
      style: '',
      tileMatrixSetID: '',
      url: resource,
      format: 'image/jpeg'
    }
    const provider = new WebMapTileServiceImageryProvider({
      ...paramDefault,
      ...param.properties
    })
    return this.addImageryProvider(provider, param)
  }

  addImageryXYZ_TMS_Provider(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties.queryParameters || {}
    const resource = new Resource({ url, queryParameters })
    const paramDefault = {
      url: resource,
      show: param.show || true,
      minimumLevel: properties.minimumLevel || 0,
      maximumLevel: properties.maximumLevel || 22
    }
    const imageryProvider = new TileMapServiceImageryProvider({
      ...paramDefault,
      ...param.properties
    })

    return this.addImageryProvider(imageryProvider, param)
  }


  addImageryXYZ_3857_Provider(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties.queryParameters || {}
    const resource = new Resource({ url, queryParameters })

    let rectangle = Rectangle.MAX_VALUE
    if (properties.rectangle) {
      rectangle = properties.rectangle
    }

    const imageryProvider = new UrlTemplateImageryProvider({
      ...param.properties,
      url: resource,
      // show: param.show || true,
      tilingScheme: new WebMercatorTilingScheme(),
      rectangle: rectangle
    })

    return this.addImageryProvider(imageryProvider, param)
  }

  addImageryWebMercatorTilingScheme2x2_Provider(url: string, param: ResourceItem) {
    const imageryProvider = new UrlTemplateImageryProvider({
      ...param.properties,
      url: url,
      tilingScheme: new WebMercatorTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2
      })
    })
    return this.addImageryProvider(imageryProvider, param)
  }

  addImageryXYZ_4326_Provider(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties || {}
    const resource = new Resource({ url, queryParameters })
    const imageryProvider = new UrlTemplateImageryProvider({
      ...param.properties,
      url: resource,
      // show: param.show || true,
      tilingScheme: new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 1
      }),
      minimumLevel: properties.minimumLevel || 0,
      maximumLevel: properties.maximumLevel || 22
    })
    return this.addImageryProvider(imageryProvider, param)
  }

  // 添加 ArcGisMapServerImagery 的服务
  async addArcGisMapServerImagery(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties.queryParameters || {}
    const resource = new Resource({ url, queryParameters })
    // const provider = new ArcGisMapServerImageryProvider({
    //   url: resource,
    //   show: param.show || true,
    //   enablePickFeatures: false
    // })
    const provider = await ArcGisMapServerImageryProvider.fromUrl(
      resource,
      {
        enablePickFeatures: false
      }
    );

    return this.addImageryProvider(provider, param)
  }

  // 添加 geoserver 的 wms 服务
  addGeoserverWMS(url: string, param: ResourceItem) {
    const properties = param.properties as ImageryLayerProps
    const queryParameters = properties.queryParameters || {}
    const resource = new Resource({ url, queryParameters })
    const provider = new WebMapServiceImageryProvider({
      url: resource,
      // show: param.show || true,
      layers: properties.layers,
      parameters: {
        service: 'WMS',
        format: 'image/png',
        transparent: true
      }
    })
    return this.addImageryProvider(provider, param)
  }

  addImageryProvider(provider: ImageryProvider, resourceItem: ResourceItem) {
    const layer = this.viewer.imageryLayers.addImageryProvider(provider)
    if (layer) {
      layer.pid = resourceItem.pid
      layer.param = resourceItem
      // 如果该图层是底图，则把该图层降到最底层
      const properties = resourceItem.properties as ImageryLayerProps
      if (properties.baseLayer) {
        this.viewer.imageryLayers.lowerToBottom(layer)
      }
      this.instancesMap.set(resourceItem.pid, layer)
      this.sourcesItems.push(resourceItem)
    }
    return layer
  }

  destroy(): boolean {
    return this.removeAll()
  }
}



export { CesiumLayer }
