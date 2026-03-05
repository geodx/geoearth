// 线材质 
import { Color, defined, Event, Material, JulianDate, Property, ConstantProperty } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';


// 线材质 超级线
class PolylineSuperMaterial extends PolylineBaseMaterial {
    private _time: number = Date.now();
    private _definitionChanged: Event = new Event()

    private _color: Property;
    private _repeatCount: number;
    private _url: string;
    private _duration: number;

    constructor(options: any) {
        super();
        this._color = new ConstantProperty(options.color ?? Color.WHITE);
        this._duration = options.duration ?? 2000;
        this._repeatCount = options.repeatCount ?? 4;
        this._url = options.url || new URL('../img/超级线材质01.png', import.meta.url).href;
        this.init();
    }

    //动画time在变，肯定不是常量
    get isConstant() { return false }

    get definitionChanged() { return this._definitionChanged; }

    getType() { return 'PolylineSuper'; };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) result = {}
        result.color = Color.clone(this._color.getValue(time) ?? Color.WHITE, result.color);
        result.image = this._url;
        result.time = ((Date.now() - this._time) % this._duration) / this._duration;
        result.repeatCount = this._repeatCount;

        return result;
    };

    equals(other: PolylineSuperMaterial) {
        return this === other;
    };

    init() {
        const PolylineSuperType = 'PolylineSuper';
        const PolylineSuperSource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
            {\n\
                czm_material material = czm_getDefaultMaterial(materialInput); vec2 st = materialInput.st;\n\
                vec4 colorImage = texture(image, vec2(fract( count * st.s - time),fract(st.t)));\n\
                material.alpha =  colorImage.a * color.a;\n\
                material.diffuse =  color.rgb * 1.5 ;\n\
                return material;\n\
            }';

        (Material as any)._materialCache.addMaterial(PolylineSuperType, {
            fabric: {
                type: PolylineSuperType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    time: 20,
                    count: this._repeatCount || 4
                },
                source: PolylineSuperSource
            },
            translucent: () => {
                return true;
            }
        });
    }
}



export { PolylineSuperMaterial };