import { defined, Ray, Cartesian3, Cartographic, SceneMode, } from "cesium";
import type { NavigationContext } from '../types';

const unprojectedScratch = new Cartographic();
const rayScratch = new Ray();

const Utils = {
    /**
     * 获取相机当前聚焦点（视线与地球的交点）
     * @param context 导航插件上下文
     * @param inWorldCoordinates 为 true 时返回世界坐标，否则返回相机参考系中的坐标，二维或二维半模式下为平面坐标。
     * @returns 焦点坐标；无法获取时返回 undefined。
     */
    getCameraFocus(context: NavigationContext, inWorldCoordinates: boolean): Cartesian3 | undefined {
        const scene = context.viewerWidget.scene;
        const camera = scene.camera;
        if (scene.mode === SceneMode.MORPHING) {
            return undefined;
        }

        let result: Cartesian3 | undefined;

        // 跟踪实体时直接使用实体位置
        if (defined(context.trackedEntity)) {
            const position = context.trackedEntity.position?.getValue(context.viewerWidget.clock.currentTime, result);
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

        // 二维或二维半模式需要坐标转换。
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
