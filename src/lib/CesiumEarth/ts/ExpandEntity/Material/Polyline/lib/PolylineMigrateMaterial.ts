import { Color, defined, Event, Material, JulianDate } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

//迁徙线
class PolylineMigrateMaterial extends PolylineBaseMaterial {
    private _time: number;
    private url: string;
    private duration: number;
    private color: Color;
    private _definitionChanged: Event
    constructor(options: any) {
        super();
        this.color = options.color;
        this.duration = options.duration;
        this.url = options.url || new URL('../img/迁徙线材质.png', import.meta.url).href;
        this._time = performance.now();
        this._definitionChanged = new Event()
        this.init();
    }

    get isConstant() {
        return this.getConstant(this.color);
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineMigrate';
    };

    getValue(time: JulianDate, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this.color ?? Color.WHITE, result.color)
        result.image = this.url;
        result.time = ((performance.now() - this._time) % this.duration) / this.duration;
        return result;
    }

    equals(other: PolylineMigrateMaterial) {
        if (this === other) return true
        if (!(other instanceof PolylineMigrateMaterial)) return false

        return (
            this.duration === other.duration &&
            Color.equals(this.color, other.color)
        )
    }

    init() {
        const PolylineMigrateType = 'PolylineMigrate';
        const PolylineMigrateSource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
              {\n\
                    czm_material material = czm_getDefaultMaterial(materialInput);\n\
                    vec2 st = materialInput.st;\n\
                    vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));\n\
                    material.alpha = colorImage.a * color.a;\n\
                    material.diffuse = color.rgb*1.5;\n\
                    return material;\n\
            }';
        (Material as any)._materialCache.addMaterial(PolylineMigrateType, {

            fabric: {
                type: PolylineMigrateType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    transparent: true,
                    time: 20
                },
                source: PolylineMigrateSource
            },

            translucent: function () {
                return true;
            }

        });
    }
}




export { PolylineMigrateMaterial };
