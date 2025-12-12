// 动态线材质 传输
import { Color, defined, Property, Material, JulianDate } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

class PolylineEnergyTransMaterial extends PolylineBaseMaterial {
    private _time: number = (new Date()).getTime();
    private repeatCount: number;
    private url: string;
    private duration: number;
    private color: Color;
    private _color: undefined;

    constructor(options: { color: Color; duration: number; url: string; repeatCount: number; }) {
        super();
        this.color = options.color;
        this.duration = options.duration;
        this.url = options.url || '../img/传输线材质.png';
        this.repeatCount = options.repeatCount;
        this.init();
    }


    get isConstant() {
        return false;
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineEnergyTransOpacity';
    };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this.color ?? Color.WHITE, result.color)
        result.image = this.url;
        result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
        result.repeatCount = this.repeatCount || 4;
        return result;
    };

    equals(other: PolylineEnergyTransMaterial) {
        if (this === other) return true
        if (!(other instanceof PolylineEnergyTransMaterial)) return false

        return (
            this.duration === other.duration &&
            this.repeatCount === other.repeatCount &&
            Color.equals(this._color, other._color)
        )
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
                    count: this.repeatCount || 4
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