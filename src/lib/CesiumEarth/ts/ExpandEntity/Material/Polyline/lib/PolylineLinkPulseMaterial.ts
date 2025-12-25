// 动态线材质 脉冲线 
import { Color, defined, Property, Material, Event } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';


// 动态线材质 脉冲

class PolylineLinkPulseMaterial extends PolylineBaseMaterial {
    private _time: number = (new Date()).getTime();
    private url: string;
    private duration: number;
    private color: Color;
    private _color: undefined;

    constructor(options: any) {
        super();
        this._definitionChanged = new Event();
        this._color = undefined;
        this.color = options.color;
        this.duration = options.duration;
        this.url = options.url || '../img/脉冲线材质.png';
        this._time = (new Date()).getTime();
        this.init();
    }

    get isConstant() {
        return true;
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineLinkPulse';
    };

    getValue(time: number, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this.color ?? Color.WHITE, result.color)
        result.image = this.url;
        result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
        return result;
    }

    equals(other: PolylineLinkPulseMaterial) {
        if (this === other) return true
        if (!(other instanceof PolylineLinkPulseMaterial)) return false
        return Color.equals(this._color, other._color)
    }

    init() {
        const PolylineLinkPulseType = 'PolylineLinkPulse';
        const PolylineLinkPulseSource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
         { czm_material material = czm_getDefaultMaterial(materialInput); vec2 st = materialInput.st;\n\
            vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));\n\
             material.alpha = colorImage.a * color.a;\n\
             material.diffuse = (colorImage.rgb + color.rgb)* 2.5 ;\n\
             return material;}';

        (Material as any)._materialCache.addMaterial(PolylineLinkPulseType, {
            fabric: {
                type: PolylineLinkPulseType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    time: 20
                },
                source: PolylineLinkPulseSource
            },
            translucent: function () {
                return true;
            }
        });
    }
}


export { PolylineLinkPulseMaterial };