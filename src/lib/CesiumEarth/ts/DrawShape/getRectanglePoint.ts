import { Cartesian3, Ellipsoid, Math as CesiumMath } from "cesium";

/**
 * 画正矩形的点位计算辅助函数，根据A、C两点，计算出 B、D两点
 * 假设一个矩形由 A-B-C-D-A 坐标连接成闭合矩形
 * @param start A点 笛卡尔直角坐标系
 * @param end   B点 笛卡尔直角坐标系
 */
function getRectanglePoint(start: Cartesian3, end: Cartesian3) {
    // start 的经纬度
    let cartographic1 = Ellipsoid.WGS84.cartesianToCartographic(start);
    let lon1 = CesiumMath.toDegrees(cartographic1.longitude); // 经度
    let lat1 = CesiumMath.toDegrees(cartographic1.latitude); // 纬度

    // end 的经纬度
    let cartographic2 = Ellipsoid.WGS84.cartesianToCartographic(
        end);
    let lon2 = CesiumMath.toDegrees(cartographic2.longitude); // 经度
    let lat2 = CesiumMath.toDegrees(cartographic2.latitude); // 纬度

    let minLon = Math.min(lon1, lon2),
        maxLon = Math.max(lon1, lon2),
        minLat = Math.min(lat1, lat2),
        maxLat = Math.max(lat1, lat2);

    let cartesianA = Cartesian3.fromDegrees(minLon, maxLat);
    let cartesianB = Cartesian3.fromDegrees(maxLon, maxLat);
    let cartesianC = Cartesian3.fromDegrees(maxLon, minLat);
    let cartesianD = Cartesian3.fromDegrees(minLon, minLat);

    // 四点连成的闭合图形 笛卡尔直角坐标系
    return [cartesianA, cartesianB, cartesianC, cartesianD, cartesianA];
}


export { getRectanglePoint };