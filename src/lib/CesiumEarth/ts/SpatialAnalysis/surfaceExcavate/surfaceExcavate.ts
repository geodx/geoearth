/*
 * @Description: 地形开挖对象
 */
import {
    Cartesian3, Entity, Viewer, Geometry, Cartographic, PolygonGeometry,
    PerInstanceColorAppearance, Math as CesiumMath
} from "cesium";
import * as turf from "@turf/turf";
export class surfaceExcavate {
    #viewer: Viewer;
    entity: Entity;
    positions: Cartesian3[];
    depth: number;
    clampToGround: boolean;
    constructor(viewer: Viewer, entity: Entity, positions: Cartesian3[], depth: number, clampToGround: boolean) {
        this.#viewer = viewer;
        this.entity = entity;
        this.positions = positions;
        this.depth = depth;
        this.clampToGround = clampToGround;
    }

    /**
     * @description: 计算方量
     * @return {*}
     */
    computeCutVolume() {
        const catArr: number[][][] = [[]];
        this.positions.forEach(c => {
            const cat = Cartographic.fromCartesian(c);
            catArr[0].push([CesiumMath.toDegrees(cat.longitude), CesiumMath.toDegrees(cat.latitude)]);
        })
        const area = turf.area(turf.polygon(catArr));
        // 地下体积
        const subsurfaceVolume = area * this.depth;
        if (!this.clampToGround) {
            // 无地形情况
            return subsurfaceVolume;
        }

        const tileAvailability = this.#viewer.terrainProvider.availability;
        let maxLevel = 0;
        let minHeight = 15000;
        // 计算差值点
        for (let i = 0; i < this.positions.length; i++) {
            const cartographic = Cartographic.fromCartesian(this.positions[i]);
            const height: number = this.#viewer.scene.globe.getHeight(cartographic)!;

            if (minHeight > height) {
                minHeight = height;
            }

            const level = tileAvailability?.computeMaximumLevelAtPosition(cartographic) ?? 0;

            if (maxLevel < level)
                maxLevel = level;
        }

        let granularity = Math.PI / Math.pow(2, 11);
        granularity = granularity / (64);
        const polygonGeometry = PolygonGeometry.fromPositions(
            {
                positions: this.positions,
                vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                granularity: granularity
            }
        );

        const geom: Geometry = PolygonGeometry.createGeometry(polygonGeometry)!;
        let totalCutVolume = 0;

        let i0, i1, i2;
        let height1, height2, height3;
        let bottomP1, bottomP2, bottomP3;
        const scratchCartesian = new Cartesian3();
        let cartographic;
        let bottomArea;
        let subTrianglePositions;

        const length = geom.indices?.length ?? 0;
        const indices = geom.indices ?? [];
        for (let i = 0; i < length; i += 3) {
            i0 = indices[i];
            i1 = indices[i + 1];
            i2 = indices[i + 2];

            subTrianglePositions = geom.attributes?.position?.values ?? [];

            scratchCartesian.x = subTrianglePositions[i0 * 3];
            scratchCartesian.y = subTrianglePositions[i0 * 3 + 1];
            scratchCartesian.z = subTrianglePositions[i0 * 3 + 2];

            cartographic = Cartographic.fromCartesian(scratchCartesian);

            height1 = this.#viewer.scene.globe.getHeight(cartographic)!;

            bottomP1 = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
            scratchCartesian.x = subTrianglePositions[i1 * 3];
            scratchCartesian.y = subTrianglePositions[i1 * 3 + 1];
            scratchCartesian.z = subTrianglePositions[i1 * 3 + 2];

            cartographic = Cartographic.fromCartesian(scratchCartesian);

            height2 = this.#viewer.scene.globe.getHeight(cartographic)!;

            bottomP2 = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
            scratchCartesian.x = subTrianglePositions[i2 * 3];
            scratchCartesian.y = subTrianglePositions[i2 * 3 + 1];
            scratchCartesian.z = subTrianglePositions[i2 * 3 + 2];

            cartographic = Cartographic.fromCartesian(scratchCartesian);

            height3 = this.#viewer.scene.globe.getHeight(cartographic)!;

            bottomP3 = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
            bottomArea = this.#computeAreaOfTriangle(bottomP1, bottomP2, bottomP3);
            totalCutVolume = totalCutVolume + bottomArea * (height1 - minHeight + height2 - minHeight + height3 - minHeight) / 3;
        }

        return totalCutVolume + subsurfaceVolume;
    }

    /**
     * @description: 计算三角形的面积
     * @return {*}
     */
    #computeAreaOfTriangle(pos1: Cartesian3, pos2: Cartesian3, pos3: Cartesian3) {
        const a = Cartesian3.distance(pos1, pos2);
        const b = Cartesian3.distance(pos2, pos3);
        const c = Cartesian3.distance(pos3, pos1);

        const S = (a + b + c) / 2;

        return Math.sqrt(S * (S - a) * (S - b) * (S - c));
    }


}