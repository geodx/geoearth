/****************************************************************************
 名称：获取摄像机的信息，【xyz坐标】、【俯仰角、偏航角、翻滚角】

 最后修改日期：2022-03-19
 ****************************************************************************/

import { Viewer, Cartographic, Math as CesiumMath } from "cesium";

// 获取镜头高度
function getCameraInfo(viewer: Viewer) {
    let { position, heading, pitch, roll } = viewer.camera;
    let cartographic = Cartographic.fromCartesian(position);
    cartographic.longitude = Math.floor(CesiumMath.toDegrees(cartographic.longitude) * 10_0000) / 10_0000
    cartographic.latitude = Math.floor(CesiumMath.toDegrees(cartographic.latitude) * 10_0000) / 10_0000
    cartographic.height = Math.floor(cartographic.height * 10_0000) / 10_0000

    return { destination: position, cartographic, orientation: { heading, pitch, roll } };
}

export { getCameraInfo };