/*
 * @Description: 地形开挖
 */
import {
    Cartesian3, Viewer, ClippingPlane, Entity, Cartographic, clone,
    ClippingPlaneCollection, Color, PolygonHierarchy, ImageMaterialProperty,
    sampleTerrainMostDetailed, Plane
} from "cesium";
import { surfaceExcavate } from "./surfaceExcavate";
import { GISMathUtils } from "../../Utils/GISMathUtils";
export type excavateOptionType = {
    depth: number;  // 开挖深度, 默认200
    bottomImage: string;    // 底部贴图
    sideImage: string;  // 侧面贴图
    clampToGround: boolean; // 是否贴地, 默认false
    lerpDistance: number;   //贴地时插值距离, 默认为50
}

export class surfaceExcavateAnalysis {
    #viewer: Viewer;
    constructor(viewer: Viewer) {
        this.#viewer = viewer;
    }

    /**
     * @description: 创建开挖
     * @param {Cartesian3[]} positions 位置
     * @param {Partial<excavateOptionType>} options 配置项
     * @return {surfaceExcavate}
     */
    async create(positions: Cartesian3[], options: Partial<excavateOptionType> = {}) {
        let o = Object.assign(this.defaultOptions, options);
        positions = clone(positions);
        let bClockwise = GISMathUtils.booleanClockwise(positions);   // 判断点顺序是否为顺时针 
        if (bClockwise) {
            //顺时针 需要转换点的顺序
            positions = positions.reverse();
        }
        let length = positions.length;
        let plans: ClippingPlane[] = [];
        for (let i = 1; i < length; i++) {
            let plane = this.#createPlane(positions[i - 1], positions[i]);
            plans.push(plane);
        }
        let plane = this.#createPlane(positions[length - 1], positions[0]);
        plans.push(plane);

        this.#viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
            planes: plans,
            edgeWidth: 1.0,
            edgeColor: Color.WHITE
        });

        let entity = await this.#createEntity(positions, o);
        this.#viewer.entities.add(entity);

        let surface = new surfaceExcavate(this.#viewer, entity, positions, o.depth, o.clampToGround);
        return surface;
    }

    remove(surface: surfaceExcavate) {
        this.#viewer.scene.globe.clippingPlanes = new ClippingPlaneCollection({
            planes: []
        });
        this.#viewer.entities.remove(surface.entity);
    }

    async #createEntity(positions: Cartesian3[], options: excavateOptionType) {
        if (!positions[0].equals(positions[positions.length - 1])) {
            positions.push(positions[0]);
        }
        if (options.clampToGround) {
            // 贴地情况对地形进行插值
            positions = await this.#computedLerp(positions, options.lerpDistance);
            if (!positions[0].equals(positions[positions.length - 1])) {
                positions.push(positions[0]);
            }
        }

        let hierarchy = new PolygonHierarchy(positions);
        let { bottomImage, sideImage, depth } = options;
        let e = new Entity({
            polygon: {
                hierarchy: hierarchy,
                material: new ImageMaterialProperty({
                    image: bottomImage
                }),
                height: -depth,
                // heightReference: HeightReference.RELATIVE_TO_GROUND,
            },
            wall: {
                positions: hierarchy.positions,
                minimumHeights: hierarchy.positions.map(() => -depth),
                material: new ImageMaterialProperty({
                    image: sideImage
                }),
            }
        })
        return e;
    }

    /**
     * @description: 计算插值，用来贴地
     * @return {Cartesian3[]}
     */
    async #computedLerp(positions: Cartesian3[], lerpDistance: number) {
        let catArr2: Cartographic[][] = [];
        for (let i = 1; i < positions.length; i++) {
            let start: Cartesian3 = positions[i - 1];
            let end: Cartesian3 = positions[i];
            let cat = GISMathUtils.equidistantInterpolation(start, end, lerpDistance);
            cat = await sampleTerrainMostDetailed(this.#viewer.terrainProvider, cat);
            catArr2.push(cat);
        }

        let catArr = catArr2.flat();
        let c3Arr: Cartesian3[] = [];
        catArr.forEach(v => {
            let c = Cartesian3.fromRadians(v.longitude, v.latitude, v.height);
            c3Arr.push(c)
        })
        return c3Arr;
    }

    /**
     * @description: 构造ClippingPlane
     * @param {Cartesian3} startPosition 起点
     * @param {Cartesian3} endPosition 终点
     * @return {ClippingPlane} ClippingPlane
     */
    #createPlane(startPosition: Cartesian3, endPosition: Cartesian3) {
        let midpoint = Cartesian3.add(startPosition, endPosition, new Cartesian3());
        midpoint = Cartesian3.multiplyByScalar(midpoint, 0.5, midpoint);

        let up = Cartesian3.normalize(midpoint, new Cartesian3());
        let right = Cartesian3.subtract(endPosition, startPosition, new Cartesian3());
        Cartesian3.normalize(right, right);
        let normal = Cartesian3.cross(right, up, new Cartesian3());
        Cartesian3.normalize(normal, normal);

        let originCenteredPlane = new Plane(normal, 0.0);
        let distance = Plane.getPointDistance(originCenteredPlane, midpoint);
        return new ClippingPlane(normal, distance);
    }

    get defaultOptions(): excavateOptionType {
        return {
            depth: 200,
            bottomImage: new URL("./img/excavate_bottom_min.jpg", import.meta.url).href,
            sideImage: new URL("./img/excavate_side_min.jpg", import.meta.url).href,
            clampToGround: false,
            lerpDistance: 50,
        }
    }
}