// 精灵线
import { defined, Color, Event, Material, JulianDate, ConstantProperty, Property } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

class PolylineSpriteMaterial extends PolylineBaseMaterial {
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

    getType(): string { return 'PolylineSprite'; }

    getValue(time: JulianDate, result: any): any {
        if (!defined(result)) result = {}
        result.color = Color.clone(this._color.getValue(time) ?? Color.WHITE, result.color);
        result.image = this._url;
        result.time = ((Date.now() - this._time) % this._duration) / this._duration;
        result.repeatCount = this._repeatCount;
        return result;
    }
    equals(other: PolylineSpriteMaterial): boolean { return this === other; }





    init(): void {
        const PolylineSpriteType = 'PolylineSprite';
        const PolylineSpriteSource =
            'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
              {\n\
                    czm_material material = czm_getDefaultMaterial(materialInput);\n\
                    vec2 st = materialInput.st;\n\
                    vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));\n\
                    material.alpha = colorImage.a;\n\
                    material.diffuse = colorImage.rgb * 1.5 ;\n\
                    return material;\n\
            }';
        (Material as any)._materialCache.addMaterial(PolylineSpriteType, {

            fabric: {
                type: PolylineSpriteType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    image: '',
                    transparent: true,
                    time: 20
                },
                source: PolylineSpriteSource
            },

            translucent: () => {
                return true;
            }
        });
    }
}



export { PolylineSpriteMaterial };