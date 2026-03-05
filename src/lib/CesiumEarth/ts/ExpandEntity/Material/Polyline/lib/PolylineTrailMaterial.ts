//尾迹线材质类
import { Color, defined, Event, Material, JulianDate, ConstantProperty, Property } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

//尾迹线材质类
class PolylineTrailMaterial extends PolylineBaseMaterial {
    private _percent: number;
    private _gradient: string;
    private _speed: number;
    private _color: Property;
    private _definitionChanged: Event = new Event()

    constructor(options: any) {
        super();
        this._speed = options.speed || 6 * Math.random(); //速度
        this._color = new ConstantProperty(options.color ?? Color.RED); //颜色
        this._percent = options.percent || 0.1; //百分比
        this._gradient = options.gradient || 0.01; //渐变  

        this.init();
    }

    get isConstant() { return false; }

    get definitionChanged() { return this._definitionChanged; }

    getType() { return 'PolylineTrail'; };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this._color.getValue(time) ?? Color.WHITE, result.color);
        result.speed = this._speed;
        result.gradient = this._gradient;
        result.percent = this._percent;
        return result;
    };

    equals(other: PolylineTrailMaterial) {
        return this === other;
    };

    init() {
        const PolylineTrailType = 'PolylineTrail';
        const PolylineTrailSource = `uniform vec4 color;
        uniform float speed;
        uniform float percent;
        uniform float gradient;
        
        czm_material czm_getMaterial(czm_materialInput materialInput){
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            float t =fract(czm_frameNumber * speed / 1000.0);
            t *= (1.0 + percent);
            float alpha = smoothstep(t- percent, t, st.s) * step(-t, -st.s);
            alpha += gradient;
            material.diffuse = color.rgb;
            material.alpha = alpha;
            return material;
        }`;

        (Material as any)._materialCache.addMaterial(PolylineTrailType, {
            fabric: {
                type: PolylineTrailType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    transparent: true,
                    speed: 0,
                    gradient: 0.01,
                    percent: 0.1
                },
                source: PolylineTrailSource
            },
            translucent: function () {
                return true;
            }
        });
    }
}



export { PolylineTrailMaterial };