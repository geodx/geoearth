import { Entity, Cartesian3, Color, PolylineDashMaterialProperty } from "cesium";
import { Material, type WorldDegree, CoordinateOffsetTool } from "../../cesium.earth";
function gcjEncrypt(pos: WorldDegree): WorldDegree {
    const encrypt = CoordinateOffsetTool.gcj_encrypt(pos.latitude, pos.longitude);
    return { longitude: encrypt.lon, latitude: encrypt.lat };
}
function gcjDecrypt(pos: WorldDegree): WorldDegree {
    const decrypt = CoordinateOffsetTool.gcj_decrypt(pos.latitude, pos.longitude);
    return { longitude: decrypt.lon, latitude: decrypt.lat };
}
export const GraphHopperService = {
    baseUrl: "http://122.227.134.126:98/route",
    /**
 * GraphHopper routing:
 * - point=lat,lon 多个点依次拼接(起点→途经点→终点)
 * - block_area= 规避区：多个polygon用;分隔，每个polygon内部点用逗号分隔，格式 "lat,lon,lat,lon,..."
 * - points_encoded=false 返回json里的points.coordinates明文
 * - ch.disable=true 关闭CH(可选)
 */
    async navigation(start?: WorldDegree, end?: WorldDegree, passPoints: WorldDegree[] = [], avoidPolygons: WorldDegree[][] = [],): Promise<any> {
        const s = start ?? { longitude: 108.46385538126562, latitude: 30.7851146657642 };
        let query = `point=${s.latitude},${s.longitude}`;

        passPoints.forEach((p) => {
            query += `&point=${p.latitude},${p.longitude}`;
        });

        const e = end ?? { longitude: 108.47119096640783, latitude: 30.78348048735882 };
        query += `&point=${e.latitude},${e.longitude}`;

        // block_area: 多个polygon用;分隔，每个polygon点串用逗号连接
        let blockArea = "";
        avoidPolygons.forEach((poly) => {
            if (blockArea !== "") blockArea += ";";

            let polyStr = "";
            poly.forEach((pt) => {
                if (polyStr !== "") polyStr += ",";
                polyStr += `${pt.latitude},${pt.longitude}`;
            });

            blockArea += polyStr;
        });

        const url =
            `${this.baseUrl}?${query}` +
            `&locale=zh-CN&profile=car&points_encoded=false&ch.disable=true` +
            `&block_area=${encodeURIComponent(blockArea)}`;

        try {
            const json = await fetch(url).then((r) => r.json());
            return json.paths as any[];
        } catch (e) {
            console.error("GraphHopper服务出现了错误，可能是URL有问题，或输入了不存在的点，或两点距离太远。", e);
            return undefined;
        }
    },
    /**生成路线实体 */
    entityNaviLine(points: WorldDegree[] = [], schemeIndex = ""): Entity {
        const degrees: number[] = [];
        points.forEach((p) => degrees.push(p.longitude, p.latitude));

        return new Entity({
            id: `路径规划-方案-${schemeIndex}`,
            name: `路径规划-方案-${schemeIndex}`,
            polyline: {
                positions: Cartesian3.fromDegreesArray(degrees),
                width: 15,
                material: new Material.Polyline.PolylineLinkPulseMaterial({
                    color: Color.fromRandom().withAlpha(0.7),
                    duration: 5000
                }),
                clampToGround: true,
            },
        });
    },
    /**生成规避区实体  */
    entityAvoidRange(polygon: WorldDegree[] = []): Entity {
        const degrees: number[] = [];
        polygon.forEach((p) => degrees.push(p.longitude, p.latitude));

        return new Entity({
            name: "避让区",
            polygon: {
                hierarchy: Cartesian3.fromDegreesArray(degrees) as any,
                material: Color.CRIMSON.withAlpha(0.4),
            },
            polyline: {
                positions: Cartesian3.fromDegreesArray(degrees),
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: Color.WHITE,
                }),
                clampToGround: true,
            },
        });
    }
}