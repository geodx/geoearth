import {
    Cartesian3, Entity, Color, HeightReference, CallbackProperty,
    Cartesian2, HorizontalOrigin, LabelStyle, VerticalOrigin, Math,
    CallbackPositionProperty,
    Cartographic,
    EllipsoidGeodesic,
    PolylineOutlineMaterialProperty,
    ArcType
} from "cesium"; 
import { PolylineGlowMaterial } from "../materials/lines";
/**
 * 名称：Entity 快捷创建库
 * 封装着一些常用的 Entity 创建方法
 *
 */
const EntityFactory = {
    /**
     * 创建一个普通点
     * @param position
     */
    createPoint(position: Cartesian3): Entity {
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
                material: new PolylineGlowMaterial()
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
    },
};

export { EntityFactory };