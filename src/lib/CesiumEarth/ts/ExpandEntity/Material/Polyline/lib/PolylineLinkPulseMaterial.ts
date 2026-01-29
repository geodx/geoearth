// 动态线材质 脉冲线 
import { Color, JulianDate, Material, Event, } from "cesium";
import { PolylineBaseMaterial } from './PolylineBaseMaterial';


// 动态线材质 脉冲

class PolylineLinkPulseMaterial extends PolylineBaseMaterial {
    private _time: number = (new Date()).getTime();
    private url: string;
    private duration: number;
    private _color: Color;
    private _definitionChanged: Event

    constructor(options: any) {
        super();
        this._definitionChanged = new Event();
        this._color = options.color;
        this.duration = options.duration;
        this.url = options.url || new URL('../img/脉冲线材质.png', import.meta.url).href;
        this._time = (new Date()).getTime();
        this.init();
    }

    get isConstant() {
        return this.getConstant(this._color);
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineLinkPulse';
    };

    getValue(time: JulianDate, result: any) {
        if (!result) result = {}
        result.color = Color.clone(this._color ?? Color.WHITE, result.color)
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