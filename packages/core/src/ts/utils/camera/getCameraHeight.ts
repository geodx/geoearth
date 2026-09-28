import { Cartesian2, Cartesian3, defined, EllipsoidGeodesic, Viewer } from 'cesium';

// 获取镜头距离地面的高度
function getCameraHeight(viewer: Viewer) {
    let scene = viewer.scene;

    let width = scene.canvas.clientWidth;
    let height = scene.canvas.clientHeight;

    let left = scene.camera.getPickRay(new Cartesian2((width / 2) | 0, height - 1));
    let right = scene.camera.getPickRay(new Cartesian2(1 + (width / 2) | 0, height - 1));

    let globe = scene.globe;
    let leftPosition;
    let rightPosition;

    if (left && right && defined(left) && defined(right)) {
        leftPosition = globe.pick(left, scene);
        rightPosition = globe.pick(right, scene);
    }

    if (!defined(leftPosition) || !defined(rightPosition)) {
        return NaN;
    }

    let leftCartographic = globe.ellipsoid.cartesianToCartographic(<Cartesian3>leftPosition);
    let rightCartographic = globe.ellipsoid.cartesianToCartographic(<Cartesian3>rightPosition);

    let geodesic = new EllipsoidGeodesic();
    geodesic.setEndPoints(leftCartographic, rightCartographic);
    let pixelDistance = geodesic.surfaceDistance;

    return pixelDistance * 100;
}

export { getCameraHeight };