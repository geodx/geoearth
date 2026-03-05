// 动态线材质 传输
import { Color, defined, Property, Material, JulianDate, Event, ConstantProperty } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

class PolylineEnergyTransMaterial extends PolylineBaseMaterial {
    private _time: number = Date.now();
    private _definitionChanged: Event = new Event()
    private _color: Property;
    private _repeatCount: number;
    private _url: string;
    private _duration: number;


    constructor(options: { color: Color; duration: number; url?: string; repeatCount: number; }) {
        super();
        this._color = new ConstantProperty(options.color ?? Color.WHITE);
        this._duration = options.duration ?? 2000;
        this._repeatCount = options.repeatCount ?? 4;
        this._url = options.url || new URL('../img/传输线材质.png', import.meta.url).href;

        this.init();
    }


    get isConstant() { return false }

    get definitionChanged() { return this._definitionChanged; }


    getType() { return 'PolylineEnergyTransOpacity'; };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) result = {}
        result.color = Color.clone(this._color.getValue(time) ?? Color.WHITE, result.color);
        result.image = this._url;
        result.time = ((Date.now() - this._time) % this._duration) / this._duration;
        result.repeatCount = this._repeatCount;
        return result;
    };

    equals(other: PolylineEnergyTransMaterial) {
        return this === other;
    };

    init() {
        const PolylineEnergyTransOpacityType = 'PolylineEnergyTransOpacity';
        const PolylineEnergyTransOpacitySource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
         { czm_material material = czm_getDefaultMaterial(materialInput); vec2 st = materialInput.st;\n\
            vec4 colorImage = texture(image, vec2(fract( count * st.s - time),fract(st.t)));\n\
             material.alpha =  colorImage.a * color.a;\n\
             material.diffuse =  color.rgb * 3.0 ;\n\
             return material;}';

        (Material as any)._materialCache.addMaterial(PolylineEnergyTransOpacityType, {
            fabric: {
                type: PolylineEnergyTransOpacityType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    time: 20,
                    count: this._repeatCount || 4
                },
                source: PolylineEnergyTransOpacitySource
            },
            translucent: () => {
                return true;
            }
        });

    }

}


export { PolylineEnergyTransMaterial };