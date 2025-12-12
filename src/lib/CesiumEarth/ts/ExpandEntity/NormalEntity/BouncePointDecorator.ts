/****************************************************************************
 名称：弹跳点装饰器

 描述：未完成
 最后修改日期：2022-04-11
 ****************************************************************************/


import { Entity } from 'cesium';

//TODO 未完成
class BouncePointDecorator {
    private entity: Entity;

    constructor(entity: Entity, style: object) {
        this.entity = entity;
        // url = url || (await import('../../../img/earth/worldimage2.png')).default
        style = {
            image: import('../../../img/marker/mark3.png'), //图标
            // bounceHeight: SceneHelper.getCameraHeight() * 3, //高度
            // increment: SceneHelper.getCameraHeight() / 1000, //增量
            bounceHeight: 100, //高度
            increment: 0.05 //增量
        };

        // let c = Cesium.Cartographic.fromCartesian(p);
        // let lng = Cesium.Math.toDegrees(c.longitude);
        // let lat = Cesium.Math.toDegrees(c.latitude);
        // let height = c.height;
        //
        // let h = height + style.bounceHeight;
        // let t = 0;
        // let cH = 0;
        // return new Cesium.Entity({
        //         // @ts-ignore
        //         position: new Cesium.CallbackProperty(() => {
        //             cH += style.increment;
        //             t = t + cH;
        //             if (t > style.bounceHeight) {
        //                 t = style.bounceHeight;
        //                 cH *= -1;
        //                 cH *= 0.55;
        //             }
        //             return Cesium.Cartesian3.fromDegrees(lng, lat, h - t);
        //         }),
        //         billboard: {
        //             image: style.image
        //         }
        //     }
        // );

    }

    bounce() {

    }

}

export { BouncePointDecorator };