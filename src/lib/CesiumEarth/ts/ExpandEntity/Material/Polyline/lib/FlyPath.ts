/****************************************************************************
 名称：动态轨迹中的实体模型
 描述：一个动态实体模型，如一条无人机航线上的无人机模型。


 最后修改日期：2022-03-17
 ****************************************************************************/
import {
    Cartesian2,
    Color,
    ColorBlendMode,
    CustomDataSource,
    Entity,
    HorizontalOrigin,
    NearFarScalar,
    SampledPositionProperty,
    VelocityOrientationProperty,
    VerticalOrigin,
    Viewer
} from 'cesium';
import { FlyCylinder } from './FlyCylinder';
import { SafeTool } from '../../../../Utils/Common';
import type { WorldDegreeWithJulianDate, WorldDegreeWithTime } from '../../../../Impl/Declare';
import { JulianDate, Cartesian3, CallbackProperty, ClockRange, PathGraphics } from 'cesium';


/**
 * 动态模型配置参数
 * @property {SampledPositionProperty} position 动态模型位置
 * @property {orientation} VelocityOrientationProperty 模型朝向
 * @property {any} [style] 模型样式
 * @property {{uri?: string,colorBlendMode?: ColorBlendMode,color?: Color,scale?: number,minimumPixelSize?: number,}} [model] 动态模型
 * @property {{text?: string,color?: Color,outline?: boolean,outlineColor?: Color,outlineWidth?: number,horizontalOrigin?:
 * HorizontalOrigin,verticalOrigin?: VerticalOrigin,pixelOffset?: Cartesian2,scaleByDistance?: NearFarScalar}} [label] 动态模型标注
 */
interface FlyPathParams {
    style?: any;
    model?:
    {
        uri?: string,
        colorBlendMode?: ColorBlendMode,
        color?: Color,
        scale?: number,
        minimumPixelSize?: number,
    };
    label?:
    {
        text?: string,
        color?: Color,
        outline?: boolean,
        outlineColor?: Color,
        outlineWidth?: number,
        horizontalOrigin?: HorizontalOrigin,
        verticalOrigin?: VerticalOrigin,
        pixelOffset?: Cartesian2,
        scaleByDistance?: NearFarScalar
    };
}

/**
 * 动态轨迹中的实体模型
 * @example
 * //创建一个动态实体模型类
 *     let property = new SampledPositionProperty();
 *     let flyPath = new CesiumEarth.Material.Polyline.FlyPath(viewer, {
 *         orientation: new VelocityOrientationProperty(property),
 *         model: {
 *             uri: "./wrj.glb",
 *             colorBlendMode: ColorBlendMode.HIGHLIGHT,
 *             color: Color.WHITE,
 *             scale: 0.1,
 *             minimumPixelSize: 50,
 *         },
 *         label: {
 *             text: '侦查无人机',
 *             color: Color.AZURE,
 *             outline: true,
 *             outlineColor: Color.BLACK,
 *             outlineWidth: 2,
 *             horizontalOrigin: HorizontalOrigin.CENTER,
 *             verticalOrigin: VerticalOrigin.BOTTOM,
 *             pixelOffset: new Cartesian2(10, -25),
 *             scaleByDistance: new NearFarScalar(500, 1, 1500, 0.4),
 *         },
 *     });
 *
 * //将该动态模型添加到实体集合中
 * addPath();
 *
 * //移除动态模型
 * remove();
 */
class FlyPath {
    private uid = SafeTool.uuid();
    private viewer: Viewer;
    private params: FlyPathParams;
    private pathEntity: Entity | null;
    private pathPointsDataSource: CustomDataSource;
    private flyCylinder: FlyCylinder | null = null;
    private flyPathBuffer: Entity | null = null;
    private pathPositionsWithJulianDate: WorldDegreeWithJulianDate[] = [];


    /**
     * 创建动态模型
     * @param {Viewer} _viewer The base Cesium widget for building applications.
     * @param pathPositions
     * @param {FlyPathParams} _params 动态模型配置参数
     */
    constructor(_viewer: Viewer, pathPositions: WorldDegreeWithTime[] = [], _params: FlyPathParams) {
        this.viewer = _viewer;
        this.pathEntity = null;
        this.pathPointsDataSource = new CustomDataSource('pathPoints-' + this.uid);
        this.viewer.dataSources.add(this.pathPointsDataSource);
        this.pathPositionsWithJulianDate = pathPositions.map((item) => {
            return {
                longitude: item.longitude,
                latitude: item.latitude,
                height: item.height,
                julianDate: JulianDate.fromIso8601(item.isoTime)
            };
        });


        this.params = {
            style: _params.style || {},
            model: {
                uri: _params.model?.uri || 'https://vge-webgl.oss-cn-beijing.aliyuncs.com/Model/wrj.glb',
                colorBlendMode: _params.model?.colorBlendMode || ColorBlendMode.HIGHLIGHT,
                color: _params.model?.color || Color.WHITE,
                scale: _params.model?.scale || 0.1,
                minimumPixelSize: _params.model?.minimumPixelSize || 50
            },
            label: {
                text: _params.label?.text || '侦查无人机',
                color: _params.label?.color || Color.AZURE,
                outline: _params.label?.outline || true,
                outlineColor: _params.label?.outlineColor || Color.BLACK,
                outlineWidth: _params.label?.outlineWidth || 2,
                horizontalOrigin: _params.label?.horizontalOrigin || HorizontalOrigin.CENTER,
                verticalOrigin: _params.label?.verticalOrigin || VerticalOrigin.BOTTOM,
                pixelOffset: _params.label?.pixelOffset || new Cartesian2(10, -25),
                scaleByDistance: _params.label?.scaleByDistance || new NearFarScalar(500, 1, 1500, 0.4)
            }
        };


        this.addPath();
    }

    addPathPoints() {
        this.pathPointsDataSource.entities.removeAll();
        this.pathPositionsWithJulianDate.forEach((item) => {
            const position = Cartesian3.fromDegrees(item.longitude, item.latitude, item.height);
            this.pathPointsDataSource.entities.add({
                position: position,
                point: { pixelSize: 4, color: Color.WHITE.withAlpha(0.8) }
            });
        });
    }

    addPathBuffer() {
        this.flyPathBuffer = this.viewer.entities.add({
            name: '飞行路线缓冲区',
            corridor: {
                positions: new CallbackProperty((time: any, result: any) => {
                    const allPoint: WorldDegreeWithJulianDate[] = this.pathPositionsWithJulianDate;
                    let passPoint: number[] = [];
                    allPoint.find(item => {
                        const juliaDate = item.julianDate;
                        if (juliaDate <= time) {
                            passPoint.push(item.longitude);
                            passPoint.push(item.latitude);
                            return false;
                        } else {
                            return true;
                        }
                    });
                    return Cartesian3.fromDegreesArray(passPoint);
                }, false),
                width: 700.0,
                material: Color.GREEN.withAlpha(0.5)
            }
        });
    }

    /**
     * 将该动态模型添加到实体集合中
     */
    addPath() {

        let start = JulianDate.fromIso8601('');
        let stop = JulianDate.fromIso8601('');

        // 坐标差值回调函数
        const positionProperty = new SampledPositionProperty();
        this.pathPositionsWithJulianDate.forEach((item, index) => {
            const position = Cartesian3.fromDegrees(item.longitude, item.latitude, item.height);
            const juliaDate = item.julianDate;
            positionProperty.addSample(juliaDate, position);

            start = index === 0 ? juliaDate : start;
            stop = index === this.pathPositionsWithJulianDate.length - 1 ? juliaDate : stop;
        });


        this.viewer.clock.startTime = start.clone();
        this.viewer.clock.stopTime = stop.clone();
        this.viewer.clock.currentTime = start.clone();
        this.viewer.clock.shouldAnimate = true;
        this.viewer.clock.clockRange = ClockRange.LOOP_STOP;
        this.viewer.clock.multiplier = 100;
        if (this.viewer.timeline) {
            this.viewer.timeline.zoomTo(start, stop);
        }

        this.pathEntity = this.viewer.entities.add({
            position: positionProperty,
            orientation: new VelocityOrientationProperty(positionProperty),
            model: this.params.model,
            label: this.params.label,
            path: new PathGraphics({
                show: true,
                width: 3,
                leadTime: 0,
                trailTime: 3600,
                material: Color.fromRandom(),
                ...this.params.style
            })
        });

        this.flyCylinder = new FlyCylinder(this.viewer, positionProperty);
    }

    /**
     * 移除动态模型
     */
    remove() {
        this.pathPointsDataSource.entities.removeAll();
        this.viewer.dataSources.remove(this.pathPointsDataSource);
        this.pathEntity && this.viewer.entities.remove(this.pathEntity);
        this.flyCylinder && this.flyCylinder.remove();
        this.flyPathBuffer && this.viewer.entities.remove(this.flyPathBuffer);
    }
}


export { FlyPath };