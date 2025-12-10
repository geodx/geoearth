import { defined, Ray, Cartesian3, Cartographic, SceneMode, } from "cesium";
import type { Terria } from "..";

const unprojectedScratch = new Cartographic();
const rayScratch = new Ray();

const Utils = {
    /**
     * 获取相机当前聚焦点（视线与地球的交点）
     * @param terria Viewer 或包含 scene 的对象
     * @param inWorldCoordinates true = 返回世界坐标（Cartesian3），false = 返回投影坐标（2D/Columbus View 下为平面坐标）
     * @returns Cartesian3 | undefined
     */
    getCameraFocus(terria: Terria, inWorldCoordinates: boolean): Cartesian3 | undefined {
        const scene = terria.viewerWidget.scene;
        const camera = scene.camera;
        if (scene.mode === SceneMode.MORPHING) {
            return undefined;
        }

        let result: Cartesian3 | undefined;

        // 跟踪实体时直接使用实体位置
        if (defined(terria.trackedEntity)) {
            const position = terria.trackedEntity.position?.getValue(terria.viewerWidget.clock.currentTime, result);
            if (defined(position)) {
                return position;
            }
        } else {
            // 正常情况：射线与地球求交
            rayScratch.origin = camera.positionWC;
            rayScratch.direction = camera.directionWC;
            result = scene.globe.pick(rayScratch, scene, new Cartesian3());
        }

        if (!result) return undefined

        // 2D 或 Columbus View 需要坐标转换
        if (scene.mode === SceneMode.SCENE2D || scene.mode === SceneMode.COLUMBUS_VIEW) {
            result = camera.worldToCameraCoordinatesPoint(result, result);

            if (inWorldCoordinates) {
                const cartographic = scene.mapProjection.unproject(result, unprojectedScratch);
                result = scene.globe.ellipsoid.cartographicToCartesian(cartographic, result);
            }
        } else if (!inWorldCoordinates) {
            // 3D 模式下若不需要世界坐标，则转为相机坐标系
            result = camera.worldToCameraCoordinatesPoint(result, result);
        }

        return result;
    },
};

export default Utils;