import {
    Cartesian3, Entity, Color, HeightReference, CallbackProperty,
    Cartesian2, HorizontalOrigin, LabelStyle, VerticalOrigin, Math,
    CallbackPositionProperty,
    Cartographic,
    EllipsoidGeodesic,
    PolylineOutlineMaterialProperty,
    ArcType
} from "cesium"
import { PolylineGlowMaterial } from "../materials/lines/index"
import { WorldDegree } from "../../viewer/types"
import type { EntityAreaOptions, EntityLineOptions } from './types'

/**
 * 名称：Entity 快捷创建库
 * 封装着一些常用的 Entity 创建方法
 *
 */
const EntityFactory = {
    /** 创建实体并返回；由调用方决定加入哪个实体集合。 */
    create(options: Entity.ConstructorOptions): Entity {
        return new Entity(options)
    },
    createBillboard(position: Cartesian3, options: import('cesium').BillboardGraphics.ConstructorOptions): Entity {
        return new Entity({ position, billboard: options })
    },
    createLine(positions: Cartesian3[], options: import('cesium').PolylineGraphics.ConstructorOptions = {}): Entity {
        if (positions.length < 2) throw new RangeError('A line needs at least two points.')
        return new Entity({ polyline: { width: 3, material: Color.CYAN, ...options, positions } })
    },
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
        })
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
        })
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
        })
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
        })
    },
    /**
     * 创建发光线
     * @param positions
     */
    createLightingLine(positions: Cartesian3[], options: EntityLineOptions = {}): Entity {
        return new Entity({
            polyline: {
                positions: positions,
                width: 8,
                clampToGround: options.clampToGround ?? true,
                arcType: options.arcType ?? ArcType.RHUMB,
                material: new PolylineGlowMaterial()
            }
        })
    },
    /** 创建带填充和闭合边线的多边形；也可直接传入矩形的四角。 */
    createPolygon(positions: Cartesian3[], options: EntityAreaOptions = {}): Entity {
        if (positions.length < 3) throw new RangeError('多边形至少需要三个顶点。')
        const clampToGround = options.clampToGround ?? true
        return new Entity({
            polygon: {
                hierarchy: positions,
                material: options.fillColor ?? Color.CYAN.withAlpha(0.3),
                perPositionHeight: !clampToGround
            },
            polyline: {
                positions: [...positions, positions[0]],
                width: options.width ?? 3,
                material: options.outlineColor ?? Color.CYAN,
                clampToGround,
                arcType: clampToGround ? ArcType.GEODESIC : ArcType.NONE
            }
        })
    },
    /** 按圆心和米制半径创建圆面，不附加高度连线。 */
    createCircle(center: Cartesian3, radius: number, options: EntityAreaOptions = {}): Entity {
        if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('圆半径必须大于零且为有限数值。')
        const clampToGround = options.clampToGround ?? true
        return new Entity({
            position: center,
            ellipse: {
                semiMajorAxis: radius,
                semiMinorAxis: radius,
                height: clampToGround ? 0 : Cartographic.fromCartesian(center).height,
                heightReference: clampToGround ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE,
                material: options.fillColor ?? Color.CYAN.withAlpha(0.3),
                outline: true,
                outlineColor: options.outlineColor ?? Color.CYAN,
                outlineWidth: options.width ?? 3
            }
        })
    },
    /**
     * 带高圆面
     * @param positions
     */
    createHeightEllipse(positions: Cartesian3[]) {
        if (positions.length < 2) throw new RangeError('An elevated circle requires a center and radius point.')
        // 计算半径
        let radius = function() {
            let point1cartographic = Cartographic.fromCartesian(positions[0]!)
            let point2cartographic = Cartographic.fromCartesian(positions[1]!)
            let geodesic = new EllipsoidGeodesic()
            geodesic.setEndPoints(point1cartographic, point2cartographic)
            return geodesic.surfaceDistance
        }
        // 临时终点（垂直）
        let topPoint = function() {
            let temp_position = []
            temp_position.push(positions[0])
            let point1cartographic = Cartographic.fromCartesian(positions[0]!)
            let point2cartographic = Cartographic.fromCartesian(positions[1]!)
            // 组合终点（起点的经纬度加上终点的高度）
            let point_temp = Cartesian3.fromDegrees(
                Math.toDegrees(point1cartographic.longitude),
                Math.toDegrees(point1cartographic.latitude),
                point2cartographic.height)
            temp_position.push(point_temp)
            return temp_position
        }
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
                height: new CallbackProperty(() => Cartographic.fromCartesian(positions[1]!).height, false)
            }
        }
        return new Entity(options)
    },
    /**
    * 绘制空间距离线
    * @param position
    * @param text
    * @param pro
    */
    buildLabelByDegrees(position: WorldDegree, text: string, pro = {}): Entity {
        let param = {
            position: Cartesian3.fromDegrees(position.longitude, position.latitude, position.height ?? 0),
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
        }
        for (const key in pro) {
            if (key === 'id') {
                param[key] = pro[key]
            } else {
                param.label[key] = pro[key]
            }
        }
        return new Entity(param)
    },
}
export { EntityFactory }
