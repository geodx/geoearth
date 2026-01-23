import { Cartesian3, Ellipsoid } from "cesium";

/**
 * @description: 椭球地平线遮挡判断：点是否被椭球遮挡(不考虑地形/建筑)。
 * @param {Cartesian3} pointWC 点位
 * @param {Cartesian3} cameraWC 相机位置
 * @param {Ellipsoid} ellipsoid 椭球,默认为wgs84
 * @return {boolean}
 */
function isOnBack(
    pointWC: Cartesian3,
    cameraWC: Cartesian3,
    ellipsoid: Ellipsoid = Ellipsoid.WGS84
): boolean {
    // 把位置缩放到“单位球体空间”：x' = x/rx, y' = y/ry, z' = z/rz
    const oneOverRadii = ellipsoid.oneOverRadii;

    const cv = Cartesian3.multiplyComponents(cameraWC, oneOverRadii, new Cartesian3());
    const pv = Cartesian3.multiplyComponents(pointWC, oneOverRadii, new Cartesian3());

    // 在单位球空间下：球心在原点，半径=1
    // 相机到球心距离：
    const c2 = Cartesian3.magnitudeSquared(cv);
    if (c2 <= 1.0) {
        // 相机在椭球内部(理论上不会)，全可见/或按需求返回false
        return true;
    }

    // 关键判定：点是否在相机的可见半空间里
    // 在单位球上，地平线平面法向量与cv同向，
    // 平面方程：cv · x = 1  (切点处满足 x 在球面且与cv同向)
    // 对任意点pv：若 cv·pv > 1 则在可见侧；否则被遮挡
    const dot = Cartesian3.dot(cv, pv);
    return dot > 1.0;
}
export { isOnBack };
