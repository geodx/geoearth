import { Entity, Cartesian3, Color, PolylineDashMaterialProperty } from "cesium";
import type { WorldDegree } from "../../Impl/Declare";
import { CoordinateOffsetTool } from "../../Utils/CoordinateTool/CoordinateOffsetTool";
import { Material } from "../../ExpandEntity";
function gcjEncrypt(pos: WorldDegree): WorldDegree {
    const encrypt = CoordinateOffsetTool.gcj_encrypt(pos.latitude, pos.longitude);
    return { longitude: encrypt.lon, latitude: encrypt.lat };
}
function gcjDecrypt(pos: WorldDegree): WorldDegree {
    const decrypt = CoordinateOffsetTool.gcj_decrypt(pos.latitude, pos.longitude);
    return { longitude: decrypt.lon, latitude: decrypt.lat };
}
export const AMapService = {
    key: "432b84bd33de91d47d19a6cef894c723",
    /**
      * 高德路径规划(驾驶)：
      * - origin/destination默认给一组坐标
      * - waypoints(途经点)支持数组
      * - avoidpolygons(规避区)支持多面，面与面之间用|分隔
      * - 返回route并把steps.polyline解析为经纬对象数组，同时做GCJ→WGS纠偏
      */
    async navigation(origin?: WorldDegree, destination?: WorldDegree, waypoints: WorldDegree[] = [], avoidPolygons: WorldDegree[][] = [],): Promise<any> {
        const mode = "driving";
        const encryptPos = gcjEncrypt(origin ?? { longitude: 108.46385538126562, latitude: 30.7851146657642, height: 0 },);
        const originStr = `${encryptPos.longitude},${encryptPos.latitude}`;

        const dest = gcjEncrypt(destination ?? { longitude: 108.47119096640783, latitude: 30.78348048735882, height: 0 },);
        const destStr = `${dest.longitude},${dest.latitude}`;

        // 途经点
        const wp = (waypoints ?? [{ longitude: 108.46359783343034, latitude: 30.783531080888885 }]);
        let waypointsStr = "";
        wp.forEach((p) => {
            const t = gcjEncrypt(p);
            waypointsStr += `${t.longitude},${t.latitude};`;
        });

        // 规避区：每个polygon点用;拼接，polygon之间加|
        let avoidStr = "";
        avoidPolygons.forEach((poly) => {
            poly.forEach((p) => {
                const t = gcjEncrypt(p);
                avoidStr += `${t.longitude},${t.latitude};`;
            });
            avoidStr += "|";
        });

        const url =
            `https://restapi.amap.com/v3/direction/${mode}` +
            `?key=${this.key}` +
            `&output=json&extensions=all&strategy=11` +
            `&origin=${originStr}` +
            `&destination=${destStr}` +
            `&waypoints=${waypointsStr};&avoidpolygons=${avoidStr}`;
        const json = await fetch(url).then((r) => r.json());
        const route = json.route as any;

        // 高德返回的坐标都是GCJ-02的，需要解析并纠偏成WGS-84
        // origin/destination字符串格式一般是 "lon,lat"
        route.origin = gcjDecrypt({
            longitude: Number(String(route.origin).split(",")[0]),
            latitude: Number(String(route.origin).split(",")[1]),
            height: 0,
        });

        route.destination = gcjDecrypt({
            longitude: Number(String(route.destination).split(",")[0]),
            latitude: Number(String(route.destination).split(",")[1]),
            height: 0,
        });

        // steps.polyline: "lon,lat;lon,lat;..." => [{lon,lat},...] 并做GCJ→WGS纠偏
        (route.paths ?? []).forEach((path: any) => {
            (path.steps ?? []).forEach((step: any) => {
                const parts: string[] = String(step.polyline ?? "").split(";");
                const pts = parts
                    .filter(Boolean)
                    .map((s) => {
                        const [lonStr, latStr] = s.split(",");
                        const gcjLon = Number(lonStr);
                        const gcjLat = Number(latStr);

                        const wgs = CoordinateOffsetTool.gcj_decrypt(gcjLat, gcjLon);
                        return { longitude: wgs.lon, latitude: wgs.lat };
                    });

                step.polyline = pts;
            });
        });

        return route;
    },
    /**生成路线实体(动态流光材质)，clampToGround=true*/
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
    /**生成规避区实体(红色半透明面+白色虚线边)，clampToGround=true*/
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