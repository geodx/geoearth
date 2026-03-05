/*
 * 热力图
 */
import { Viewer } from "cesium";
import type { BboxType } from "../../Impl/Declare";
import { HeatMapJS, type BaseHeatmapConfiguration, } from "./HeatMapJS";
import type { HeatmapPoint } from "./lib/heatmapjs";
export type heatMapOptionType = {
    zoomToLayer: boolean;   // 创建后是否自动飞向实体
    cameraListener: boolean;    // 是否开启相机监听
    distance: number;   // 重渲染高度间隔(开启监听才会生效)
    renderType: "primitive" | "imagery" | "entity"; // 创建类型，可选 "primitive" | "imagery" | "entity"
    bounds: BboxType;   // 最大范围
    heatmapOptions: BaseHeatmapConfiguration;   // 热力图配置项
}
export class HeatMap {
    #viewer: Viewer;
    constructor(viewer: Viewer) {
        this.#viewer = viewer;
    }

    /**
     * @description: 创建热力图
     * @param {pointType} points 点位坐标(角度经纬度)和值
     * @param {number} max 热力最大值(用于对真实值渲染颜色)
     * @param {number} min 热力最小值(用于对真实值渲染颜色)
     * @param {Partial<heatMapOptionType>} options (可选)配置项
     * @return {HeatMapJS} 热力图实例
     */
    createHeatmapjs(points: HeatmapPoint[], max: number, min: number, options: Partial<heatMapOptionType> = {}) {
        let { zoomToLayer, cameraListener, distance, renderType, bounds, heatmapOptions } = Object.assign(this.defaultOptions, options);

        let map = new HeatMapJS(this.#viewer, {
            points: points,
            zoomToLayer: zoomToLayer,
            noLisenerCamera: !cameraListener,
            cameraHeightDistance: distance,
            renderType: renderType,
            bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
            heatmapOptions: heatmapOptions,
            heatmapDataOptions: {
                max: max,
                min: min,
            },
        });

        return map
    }

    /**
     * @description: 移除热力图
     * @param {HeatMapJS} map 热力图
     * @return {*}
     */
    remove(map: HeatMapJS) {
        map.remove();
    }

    /**
     * @description: 更新半径
     * @param {HeatMapJS} map 热力图
     * @param {number} radius 半径
     * @return {*}
     */
    updateRadius(map: HeatMapJS, radius: number) {
        map.updateRadius(radius);
    }

    /**
     * @description: 更新热力图配置项
     * @param {HeatMapJS} map 热力图
     * @param {BaseHeatmapConfiguration} heatmapOptions 热力图配置项
     * @return {*}
     */
    updateOptions(map: HeatMapJS, heatmapOptions: BaseHeatmapConfiguration) {
        map.updateHeatmap(heatmapOptions);
    }

    /**
     * @description: 更新最大最小值
     * @param {HeatMapJS} map 热力图
     * @param {object} range 最大最小值
     * @return {*}
     */
    updateRange(map: HeatMapJS, range: { max?: number, min?: number }) {
        map.updateHeatMapMaxMin(range);
    }

    get defaultOptions() {
        return {
            zoomToLayer: false, // 创建后是否自动飞向实体
            cameraListener: true,   // 是否开启相机监听
            distance: 1000, // 重渲染高度间隔(开启监听才会生效)
            renderType: "entity",   // 创建类型，可选 "primitive" | "imagery" | "entity"
            bounds: {
                north: 90,
                east: 180,
                south: -90,
                west: -180
            },
            heatmapOptions: {
                maxOpacity: 1,
                minOpacity: 0
            }
        }
    }
}