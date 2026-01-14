import {
    HeightReference, LabelStyle, VerticalOrigin, HorizontalOrigin, Cartesian2,
    ArcType, PolygonHierarchy, ColorMaterialProperty, Cartographic,
    EllipsoidGeodesic, PolylineOutlineMaterialProperty,
    CallbackProperty, Cartesian3, Entity, Color, Viewer, Math
} from 'cesium';

import type { Feature } from 'geojson';
import { getMostDetailedHeight, type WorldDegree } from '../../cesium.earth';
import { CartographicTool } from '../../Utils';
import { PolylineLightingMaterial } from '../Material/Polyline';
import * as turf from "@turf/turf";
import { CallbackPositionProperty } from 'cesium';

/**
 * 名称：Entity 快捷创建库
 * 封装着一些常用的 Entity 创建方法
 *
 * @packageDocumentation
 */
const EntityFactory = {

    /**
     * 创建一个普通点
     * @param position
     */
    createPoint(position: Cartesian3): Entity { // 生成点
        return new Entity({
            position: position,
            point: {
                color: Color.CORNSILK,
                pixelSize: 8,
                heightReference: HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
    },


    /**
     * 创建一个：白边红心，明显的点（不贴地）
     * @param position
     */
    createRedPoint(position: Cartesian3) {
        return new Entity({
            position: position,
            point: {
                pixelSize: 5,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
    },


    /**
     * 绘制空间距离线上的标注
     * @param startPoint:Cartesian3
     * @param endPoint:Cartesian3
     */
    spaceDistanceLabel(startPoint: Cartesian3, endPoint: Cartesian3): Entity {

        let startPointCat = CartographicTool.formCartesian3(startPoint);
        let endPointCat = CartographicTool.formCartesian3(endPoint);

        let startPointGeoJson = turf.point([startPointCat.longitude, startPointCat.latitude]);
        let endPointGeoJson = turf.point([endPointCat.longitude, endPointCat.latitude]);
        let centerGeoJson = turf.midpoint(startPointGeoJson, endPointGeoJson);
        let distanceNum = turf.rhumbDistance(startPointGeoJson, endPointGeoJson, { units: 'meters' });

        let distance = distanceNum > 1000 ? (distanceNum / 1000).toFixed(3) + 'km' : distanceNum.toFixed(3) + 'm';

        let height = (startPointCat.height + endPointCat.height) / 2;

        return new Entity({
            position: Cartesian3.fromDegrees(centerGeoJson.geometry.coordinates[0]!, centerGeoJson.geometry.coordinates[1]!, height),
            label: {
                text: distance,
                font: '14pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                backgroundColor: Color.RED,
                heightReference: HeightReference.NONE,
                verticalOrigin: VerticalOrigin.TOP,
                horizontalOrigin: HorizontalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                pixelOffset: new Cartesian2(0, -30)
            }
        });
    },

    /**
     * 绘制多边形上的标注，面积、周长的数值
     * @param geoJson
     * @param type
     */
    async polygonCenterLabel(viewer: Viewer, geoJson: Feature, type = '周长'): Promise<Entity> {
        let center = turf.center(geoJson);
        let label = '';
        switch (type) {
            case '周长': {
                let length = turf.length(geoJson, { units: 'kilometers' });
                if (length < 5000) {
                    label = '周长：' + (length * 1000).toFixed(3) + ' m';
                } else {
                    label = '周长：' + length.toFixed(3) + ' km';
                }
            }
                break;
            case '面积': {
                let area = turf.area(geoJson);
                if (area < 20_0000) {
                    label = '面积：' + area.toFixed(3) + ' m2';
                } else {
                    label = '面积：' + (area * 0.000001).toFixed(3) + ' km2';
                }
            }
                break;
        }

        let [cartesianHasHeight] = await getMostDetailedHeight(viewer, [{
            longitude: center.geometry.coordinates[0]!,
            latitude: center.geometry.coordinates[1]!,
            height: 0
        }]);

        return new Entity({
            position: Cartesian3.fromDegrees(cartesianHasHeight!.longitude, cartesianHasHeight!.latitude, cartesianHasHeight!.height),
            label: {
                text: label,
                font: '14pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                backgroundColor: Color.RED,
                heightReference: HeightReference.NONE,
                verticalOrigin: VerticalOrigin.TOP,
                horizontalOrigin: HorizontalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                pixelOffset: new Cartesian2(0, -30)
            }
        });
    },


    /**
     * 绘制空间距离线
     * @param position
     * @param text
     * @param pro
     */
    buildLabelByDegrees(position: WorldDegree, text: string, pro = {}): Entity {
        let param = {
            position: Cartesian3.fromDegrees(position.longitude, position.latitude),
            label: {
                text: text,
                font: '12pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                horizontalOrigin: HorizontalOrigin.LEFT,
                verticalOrigin: VerticalOrigin.BOTTOM,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: HeightReference.CLAMP_TO_GROUND
            }
        };
        for (const key in pro) {
            if (key === 'id') {
                // @ts-ignore
                param[key] = pro[key];
            } else {
                // @ts-ignore
                param.label[key] = pro[key];
            }
        }

        return new Entity(param);
    },


    /**
     * 创建发光线
     * @param positions
     */
    createLightingLine(positions: Cartesian3[]) {
        return new Entity({
            polyline: {
                positions: positions,
                width: 8,
                clampToGround: true,
                arcType: ArcType.RHUMB,
                material: new PolylineLightingMaterial(Color.GREEN)
            }
        });
    },

    /**
     * 创建发光面
     * @param positions
     */
    createLightingPolygon(positions: Cartesian3[]) {
        return new Entity({
            polyline: {
                positions: new CallbackProperty(() => positions, false),
                width: 12,
                clampToGround: true,
                material: new PolylineLightingMaterial(Color.GREEN)
            },
            polygon: {
                hierarchy: new CallbackProperty(() => new PolygonHierarchy(positions), false),
                material: new ColorMaterialProperty(
                    Color.LIGHTSKYBLUE.withAlpha(0.3)),
                heightReference: HeightReference.NONE
            }
        });
    },

    /**
     * 创建带标注的点
     * @param p
     * @param text
     * @constructor
     */
    PointLabelEntity(p: Cartesian3, text: string | CallbackProperty) {
        return new Entity({
            position: p,
            point: {
                pixelSize: 5,
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                heightReference: HeightReference.NONE
            },
            label: {
                text: text,
                font: '14pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                backgroundColor: Color.RED,
                heightReference: HeightReference.NONE,
                verticalOrigin: VerticalOrigin.TOP,
                horizontalOrigin: HorizontalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                pixelOffset: new Cartesian2(0, -30)
            }
        });
    },

    /**
     * 创建标注
     * @param position
     * @param text
     */
    buildLabel(position: Cartesian3, text: string | CallbackProperty) {
        return new Entity({
            position: position,
            label: {
                text: text,
                font: '14pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                backgroundColor: Color.RED,
                heightReference: HeightReference.NONE,
                verticalOrigin: VerticalOrigin.TOP,
                horizontalOrigin: HorizontalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                pixelOffset: new Cartesian2(0, -30)
            }
        });
    },

    /**
     * 带高圆面
     * @param positions
     */
    createHeightEllipse(positions: Cartesian3[]) {
        // 计算半径
        let radius = function () {
            let point1cartographic = Cartographic.fromCartesian(positions[0]!);
            let point2cartographic = Cartographic.fromCartesian(positions[1]!);
            let geodesic = new EllipsoidGeodesic();
            geodesic.setEndPoints(point1cartographic, point2cartographic);
            return geodesic.surfaceDistance;
        };

        // 临时终点（垂直）
        let topPoint = function () {
            let temp_position = [];
            temp_position.push(positions[0]);
            let point1cartographic = Cartographic.fromCartesian(positions[0]!);
            let point2cartographic = Cartographic.fromCartesian(positions[1]!);
            // 组合终点（起点的经纬度加上终点的高度）
            let point_temp = Cartesian3.fromDegrees(
                Math.toDegrees(point1cartographic.longitude),
                Math.toDegrees(point1cartographic.latitude),
                point2cartographic.height);
            temp_position.push(point_temp);
            return temp_position;
        };


        let options = {
            position: new CallbackPositionProperty(() => positions[0], false),
            polyline: {
                positions: new CallbackProperty(topPoint, false),
                material: Color.AQUA,
                depthFailMaterial: new PolylineOutlineMaterialProperty({
                    color: Color.RED
                }),
                width: 2
            },
            ellipse: {
                semiMinorAxis: new CallbackProperty(radius, false),
                semiMajorAxis: new CallbackProperty(radius, false),
                material: Color.GREEN.withAlpha(0.7),
                depthFailMaterial: new PolylineOutlineMaterialProperty({
                    color: Color.RED
                }),
                outline: true,
                height: new CallbackProperty(() => Cartographic.fromCartesian(positions[1]!).height.toFixed(2), false)
            }
        };

        return new Entity(options);
    }
};

export { EntityFactory };
