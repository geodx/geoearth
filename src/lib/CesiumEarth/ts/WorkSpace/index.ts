/****************************************************************************
 名称：工作区管理器

 描述：工作区是一个资源管理器，存放着【当前地球上】已载入各种类型的资源，包括：图层、地形、模型、无人机倾斜摄影模型，
 以及在开发 SDK 时，我们自定义的各种类型资源，例如水体特效等。
 初始化地球后会将资源配置信息从【配置文件】中读取，载入工作区。工作区负责将这些资源进行统一管理，载入 Viewer，并且提供资源的访问接口。


 最后修改日期：2022-04-06
 ****************************************************************************/

import { Viewer } from "cesium";
import { ScopeType } from "../EventManage/impl/ScopeType";
import type { ResourceItem } from "../Config/ResourceItem";
import { ResourceItemTool } from "../Config/ResourceItemTool";
import { SourceEvent } from '../EventManage/lib/SourceEvent';
import { DataTypeEnum } from "../Config/Enum/DataTypeEnum";
import * as listenType from '../EventManage/impl/ListenType';
import { EventManage } from "../EventManage";
import { CesiumLayer } from "./dataManage/CesiumLayer";
import { CesiumTerrain } from "./dataManage/CesiumTerrain";
import { Cesium3DTiles } from "./dataManage/Cesium3DTiles";
import { AsyncTool } from "../Utils";
import { CesiumPoi } from "./dataManage/CesiumPoi";
import { CesiumGLTF } from "./dataManage/CesiumGLTF";



class WorkSpace {
  private readonly scopeType: ScopeType;
  private viewer: Viewer;
  private sourceEvent: SourceEvent;

  public layerManage: CesiumLayer;
  public terrainManage: CesiumTerrain;
  public _3DTileManage: Cesium3DTiles;
  public poiManage: CesiumPoi;
  public gltfManage: CesiumGLTF;

  constructor(viewer: Viewer, scopeType: ScopeType) {
    this.scopeType = scopeType;
    this.viewer = viewer;

    this.layerManage = new CesiumLayer(viewer);
    this.terrainManage = new CesiumTerrain(viewer);
    this._3DTileManage = new Cesium3DTiles(viewer);
    this.gltfManage = new CesiumGLTF(viewer);
    this.poiManage = new CesiumPoi(viewer);

    this.sourceEvent = EventManage.sourceEvent;
    this.listenSource();
  }

  // 监听 Cesium 球上的数据变化
  listenSource = () => {
    // 监听图层集合的变化，如果没有,通过工作区的增删方法来操作地球，工作区也要进行状态同步
    this.viewer.scene.globe.imageryLayersUpdatedEvent.addEventListener(async () => {
      await AsyncTool.sleep(100);
      this.getNodes().forEach((node) => {
        if (node.dataType === 'layer') {
          let layer = null
          for (let index = 0; index < this.viewer.imageryLayers.length; index++) {
            const currentlayer = this.viewer.imageryLayers.get(index)
            let param = currentlayer.param || {}
            if (param.pid === node.pid) layer = currentlayer
          }
          if (!layer) {
            // 如果图层不存在，则删除该节点
            this.removeDataByPid(node.pid);
            this.sourceEvent.raiseEvent(listenType.DataEventType.removeData, ScopeType.Viewer3D, {});
          }
        }
      });
    });
  };

  addData = async (sourceItem: ResourceItem) => {
    let resourceInstance = null;
    let loadErr;

    if (!ResourceItemTool.checkSourceItem(sourceItem)) {
      console.log('该资源项不合法', sourceItem);
      return null;
    } else {
      sourceItem = ResourceItemTool.completeParams(sourceItem);
    }

    const old = this.getNodes().find(item => sourceItem.pid === item.pid);
    if (old) {
      console.warn('工作区已加载该数据!不允许重复加载：', sourceItem.name);
      return this.getInstances(sourceItem.pid);
    } else {
      let mes = ScopeType[this.scopeType] + ' 正在加载数据：' + sourceItem.name;
      mes = sourceItem.offlineCache ? mes + '，已开启 IndexDB 缓存' : mes;
      console.info('%c' + mes, 'color:green');
    }
    // 注释
    switch (String(sourceItem.dataType)) {
      case DataTypeEnum.layer:
        [loadErr, resourceInstance] = await AsyncTool.awaitWrap(this.layerManage.addData(sourceItem));
        break;
      case DataTypeEnum.terrain:
        [loadErr, resourceInstance] = await AsyncTool.awaitWrap(this.terrainManage.addData(sourceItem));
        break;
      case DataTypeEnum.gltf:
        [loadErr, resourceInstance] = await AsyncTool.awaitWrap(this.gltfManage.addData(sourceItem));
        break;
      case DataTypeEnum.Cesium3DTile:
        [loadErr, resourceInstance] = await AsyncTool.awaitWrap(this._3DTileManage.addData(sourceItem));
        break;
      case DataTypeEnum.poi:
        [loadErr, resourceInstance] = await AsyncTool.awaitWrap(this.poiManage.addData(sourceItem));
        break;
      default: {
        console.log('无效资源项');
      }
    }

    if (loadErr) {
      console.error('加载数据失败：', sourceItem.name, loadErr);
      return null;
    }

    // 添加数据到数组中
    this.sourceEvent.raiseEvent(listenType.DataEventType.addData, this.scopeType, sourceItem);

    return resourceInstance;
  };
  // 移除数据
  removeDataByPid = (pid: string): boolean => {
    let sourceItem = this.getNodeByPid(pid);
    let removeRes = false;
    removeRes = removeRes || this.layerManage.removeByPid(pid);
    removeRes = removeRes || this.terrainManage.removeByPid(pid);
    removeRes = removeRes || this._3DTileManage.removeByPid(pid);
    // removeRes = removeRes || this.geoJsonManage.removeByPid(pid);
    // removeRes = removeRes || this.waterManage.removeByPid(pid);
    removeRes = removeRes || this.gltfManage.removeByPid(pid);
    removeRes = removeRes || this.poiManage.removeByPid(pid);

    if (removeRes) {
      this.sourceEvent.raiseEvent(listenType.DataEventType.removeData, this.scopeType, sourceItem);
    }
    return removeRes;
  };
  // 飞向资源
  flyToDataByPid = (pid: string) => {
    this.layerManage.getSourcesItemsByPid(pid) && this.layerManage.flyToByPid(pid);
    this.terrainManage.getSourcesItemsByPid(pid) && this.terrainManage.flyToByPid(pid);
    this._3DTileManage.getSourcesItemsByPid(pid) && this._3DTileManage.flyToByPid(pid);
    // this.geoJsonManage.getSourcesItemsByPid(pid) && this.geoJsonMana.flyToByPid(pid);
    // this.waterManage.getSourcesItemsByPid(pid) && this.waterMana.flyToByPid(pid);
    this.gltfManage.getSourcesItemsByPid(pid) && this.gltfManage.flyToByPid(pid);
    this.poiManage.getSourcesItemsByPid(pid) && this.poiManage.flyToByPid(pid);
  };
  getNodeByPid = (pid: string) => {
    return this.getNodes().find(item => item.pid === pid);
  };
  getNodes() {
    let nodes: ResourceItem[] = [];
    nodes = nodes.concat(this.layerManage.sourcesItems);
    nodes = nodes.concat(this.terrainManage.sourcesItems);
    nodes = nodes.concat(this._3DTileManage.sourcesItems);
    // nodes = nodes.concat(this.geoJsonManage.sourcesItems);
    // nodes = nodes.concat(this.waterManage.sourcesItems);
    nodes = nodes.concat(this.gltfManage.sourcesItems);
    nodes = nodes.concat(this.poiManage.sourcesItems);
    return nodes;
  }
  getInstances(pid: string) {
    let instances: unknown = this.layerManage.instancesMap.get(pid);
    instances = instances || this.terrainManage.instancesMap.get(pid);
    instances = instances || this._3DTileManage.instancesMap.get(pid);
    // instances = instances || this.geoJsonManage.instancesMap.get(pid);
    // instances = instances || this.waterManage.instancesMap.get(pid);
    instances = instances || this.gltfManage.instancesMap.get(pid);
    instances = instances || this.poiManage.instancesMap.get(pid);

    return instances;
  }
}
export { WorkSpace };
