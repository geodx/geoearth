import { ImageryResourceItem } from "../sources";

declare module 'cesium' {
    interface ImageryLayer {
        id?: string | number;
        param?: ImageryResourceItem;
    }
    interface Entity {
        type?: string;
        subType?: string;
    }
    interface Viewer {
        enableCursorStyle?: boolean;
    }
}

/** Cesium.Cartographic 是以弧度制来表示，使用时有诸多不便。
 * 本接口是角度制的经纬度坐标对象
 * 例如：{longitude:120.123, latitude:30.123, height:0}!
 * */
export interface WorldDegree {
    longitude: number;
    latitude: number;
    height: number;
}

/** Rectangle，单位：度 */
export interface WorldRectangle {
    west: number;
    south: number;
    east: number;
    north: number;
}