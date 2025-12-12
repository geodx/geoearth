/****************************************************************************
 名称：动态轨迹中的向下投影圆柱体
 描述：一个投影圆柱体，如一条无人机航线上无人机向下投影的圆柱体/圆锥体。

 最后修改日期：2022-03-17
 ****************************************************************************/
import { Color, Entity, SampledPositionProperty, Viewer, CallbackPositionProperty, Cartesian3, Cartographic } from 'cesium';

/**
 * 投影圆柱体的样式参数
 * @property {number} [length] 长度
 * @property {number} [topRadius] 顶部半径
 * @property {number} [bottomRadius] 底部半径
 * @property {Color} [material] 材质颜色
 */
interface FlyCylinderStyle {
    length?: number,
    topRadius?: number,
    bottomRadius?: number,
    material?: Color
}

class FlyCylinder {
    private viewer: Viewer;
    private property: SampledPositionProperty;
    private style: FlyCylinderStyle;
    private cylinder: Entity | null = null;

    /**
     *
     * @param {Viewer} _viewer The base Cesium widget for building applications
     * @param {SampledPositionProperty} _property 取样位置
     * @param {FlyCylinderStyle} [_style] 投影圆柱体的样式参数
     */
    constructor(_viewer: Viewer, _property: SampledPositionProperty, _style?: FlyCylinderStyle) {
        this.viewer = _viewer;
        this.property = _property;
        this.style = _style || {};

        this.addCylinder();
    }

    /**
     * 将该投影圆柱体添加到实体集合中
     */
    addCylinder() {
        let lastPosition: Cartesian3 | undefined;
        this.cylinder = this.viewer.entities.add({
            position: new CallbackPositionProperty((e: any) => {
                const position = this.getPosition();
                if (position) {
                    lastPosition = position;
                    return position;
                } else if (lastPosition) {
                    return lastPosition;
                } else {
                    return new Cartesian3(0, 0, 0);
                }
            }, false),
            cylinder:
            {
                length: this.style.length || 200,
                topRadius: this.style.topRadius || 0,
                bottomRadius: this.style.bottomRadius || 240,
                material: this.style.material || Color.RED.withAlpha(0.3)
            }
        });
    }


    getPosition() {
        const position = this.property.getValue(this.viewer.clock.currentTime);
        if (position) {
            const cartographic = Cartographic.fromCartesian(position);
            return Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height - (this.style.length || 200 / 2));
        } else {
            return null;
        }
    }

    remove() {
        this.cylinder && this.viewer.entities.remove(this.cylinder);
    }
}


export { FlyCylinder };