// 动态线材质 脉冲线 
import { Color, JulianDate, Material, Event, ConstantProperty, Property, defined } from "cesium";
import { PolylineBaseMaterial } from './PolylineBaseMaterial';


// 动态线材质 脉冲
class PolylineLinkPulseMaterial extends PolylineBaseMaterial {
    private _time: number = Date.now();
    private _definitionChanged: Event = new Event()
    private _color: Property;
    private _url: string;
    private _duration: number;

    constructor(options: any) {
        super();
        this._color = new ConstantProperty(options.color ?? Color.WHITE);
        this._duration = options.duration ?? 2000;
        this._url = options.url || new URL('../img/脉冲线材质.png', import.meta.url).href;
        this._definitionChanged = new Event()
        this.init();
    }

    get isConstant() { return false }

    get definitionChanged() { return this._definitionChanged; }

    getType() { return 'PolylineLinkPulse'; };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) result = {}
        result.color = Color.clone(this._color.getValue(time) ?? Color.WHITE, result.color);
        result.image = this._url;
        result.time = ((Date.now() - this._time) % this._duration) / this._duration;
        return result;
    }

    equals(other: PolylineLinkPulseMaterial) {
        return this === other;
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