import './loadResources'

import type { JulianDate } from "cesium";

declare module 'cesium' {
  interface ImageryLayer {
    pid?: string | number;
    param?: any;
  }
}

type CameraViewType = {
  destination: {
    x: number,
    y: number,
    z: number,
  },
  orientation: {
    heading: number,
    pitch: number,
    roll: number,
  },
}

/** Cesium.Cartographic 是以弧度制来表示，使用时有诸多不便。
 * 本接口是角度制的经纬度坐标对象
 * 例如：{longitude:120.123, latitude:30.123, height:0}!
 * */
interface WorldDegree {
  longitude: number;
  latitude: number;
  height: number;
}

interface WorldDegreeWithTime extends WorldDegree {
  isoTime: string;
}
interface WorldDegreeWithJulianDate extends WorldDegree {
  julianDate: JulianDate;
}


export type {
  CameraViewType,
  WorldDegree,
  WorldDegreeWithTime,
  WorldDegreeWithJulianDate
};

