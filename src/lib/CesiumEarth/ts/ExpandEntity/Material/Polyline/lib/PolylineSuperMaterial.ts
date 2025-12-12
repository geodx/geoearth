// 线材质 
import { Color, defined, Property, Material } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';


// 线材质 超级线

class PolylineSuperMaterial extends PolylineBaseMaterial {
    private _time: number = (new Date()).getTime();
    private count: number;
    private url: string;
    private duration: number;
    private color: Color;
    private _color: undefined;

    constructor(options: any) {
        super();
        this._color = undefined;
        this.color = options.color;
        this.duration = options.duration;
        this.count = options.count;
        this.url = options.url || '../img/超级线材质01.png';
        this._time = (new Date()).getTime();
        this.init();
    }

    get isConstant() {
        return false;
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineSuper';
    };

    getValue(time: number, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this.color ?? Color.WHITE, result.color)
        result.image = this.url;
        result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
        result.count = this.count || 4;
        return result;
    };

    equals(other: PolylineSuperMaterial) {
        if (this === other) return true
        if (!(other instanceof PolylineSuperMaterial)) return false

        return (
            this.duration === other.duration &&
            this.count === other.count &&
            this.url == other.url &&
            Color.equals(this._color, other._color)
        )
    };

    init() {
        const PolylineSuperType = 'PolylineSuper';
        const PolylineSuperSource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
         { czm_material material = czm_getDefaultMaterial(materialInput); vec2 st = materialInput.st;\n\
            vec4 colorImage = texture(image, vec2(fract( count * st.s - time),fract(st.t)));\n\
             material.alpha =  colorImage.a * color.a;\n\
             material.diffuse =  color.rgb * 1.5 ;\n\
             return material;}';

        (Material as any)._materialCache.addMaterial(PolylineSuperType, {
            fabric: {
                type: PolylineSuperType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    time: 20,
                    count: 4
                },
                source: PolylineSuperSource
            },
            translucent: function () {
                return true;
            }
        });
    }
}



export { PolylineSuperMaterial };