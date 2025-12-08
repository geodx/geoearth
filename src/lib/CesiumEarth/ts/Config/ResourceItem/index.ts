import { DataTypeEnum } from "../Enum/DataTypeEnum";
import type { Cesium3DTileProps } from "./Cesium3DTileProps";
import type { ImageryLayerProps } from "./ImageryLayerProps";


/**
 * 资源项
 */
interface ResourceItem {
  pid: string,
  name: string,
  catalog: string,
  dataType: DataTypeEnum,
  showInTree: boolean,
  defaultLoad: boolean,
  show: boolean,
  netRootPaths?: string[],
  offlineCache: boolean,
  decryptionKey?: string,
  properties: ImageryLayerProps | Cesium3DTileProps;
}


export type { ResourceItem };
