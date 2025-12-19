import type { ConfigImpl } from "./ConfigImpl";
import { DefaultConfig } from "./DefaultConfig";
import type { ResourceItem } from "./ResourceItem";
import type { ImageryLayerProps } from "./ResourceItem/ImageryLayerProps";

const config: ConfigImpl = DefaultConfig;
/**
 * 名称：SDK 配置参数 的操作工具
 */
const ConfigTool = {
  /**
     * 获取配置参数
     */
  get config() {
    // 设置页面标题
    window.document.title = config.appTitle;
    // 设置页面 Tabs 图标
    const links = [...document.getElementsByTagName('link')];
    const iconLink = links.find((item) => {
      return item.rel === 'shortcut icon' && item.type === 'image/x-icon';
    });
    if (!iconLink) {
      const link: HTMLLinkElement = document.createElement('link');
      link.href = config.appIcon;
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0]?.appendChild(link)
    }


    return config;
  },
  getBaseLayer() {
    const s = this.config;
    return s.layerList.find((item: ResourceItem) => {
      return item.dataType === 'layer' && (item.properties as ImageryLayerProps).baseLayer;
    });
  },
  getBaseTerrain() {
    const s = this.config;
    return s.terrainList.find((item: ResourceItem) => {
      return item.dataType === 'terrain' && item.defaultLoad;
    });
  },
  getResourcesByPid(pid: string) {
    return this.getAllSources().find(item => {
      return item.pid === pid;
    });
  },
  getAllSources() {
    const s = this.config;
    return [
      ...s.layerList,
      ...s.terrainList,
      ...s.modelList,
      ...s.cesium3DTileSetList,
      ...s.geoJsonList,
      ...s.poiList
    ];
  },
}

export { ConfigTool };
