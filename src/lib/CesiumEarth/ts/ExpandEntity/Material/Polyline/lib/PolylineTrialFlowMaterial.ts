// 尾迹线流动
import { Color, Property, Material, defined } from 'cesium';
import { PolylineBaseMaterial } from './PolylineBaseMaterial';

//尾迹线 流动
class PolylineTrialFlowMaterial extends PolylineBaseMaterial {
    private _time: number;
    private duration: number;
    private color: Color;
    private _color: undefined;
    private _colorSubscription: undefined;

    constructor(options: any) {
        super();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = options.color;
        this.duration = options.duration;
        this._time = performance.now();
        this.init();
    }

    get isConstant() {
        return false;
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    getType() {
        return 'PolylineTrialFlow';
    };

    getValue(time: number, result: any) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Color.clone(this.color ?? Color.WHITE, result.color)
        result.time = ((performance.now() - this._time) % this.duration) / this.duration;
        return result;
    };

    equals(other: PolylineTrialFlowMaterial) {
        return this === other ||
            (other instanceof PolylineTrialFlowMaterial &&
                this.duration == other.duration &&
                Color.equals(this._color, other._color));

    };

    init() {
        const PolylineTrialFlowType = 'PolylineTrialFlow';
        const PolylineTrialFlowSource = 'czm_material czm_getMaterial(czm_materialInput materialInput)\n' +
            '{\n' +
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec2 st = materialInput.st;\n' +
            '    float t = time;\n' +
            '    t *= 1.03;\n' +
            '    float alpha = smoothstep(t- 0.1, t, st.s) * step(-t, -st.s);\n' +
            '    alpha += 0.1;\n' +
            '    material.diffuse= color.rgb;\n' +
            '    material.alpha = alpha;\n' +
            '    return material;\n' +
            '}\n';

        (Material as any)._materialCache.addMaterial(PolylineTrialFlowType, {
            fabric: {
                type: PolylineTrialFlowType,
                uniforms: {
                    color: new Color(1.0, 0.0, 0.0, 0.5),
                    transparent: true,
                    time: 20
                },
                source: PolylineTrialFlowSource
            },
            translucent: function () {
                return true;
            }
        });

    }
}


export { PolylineTrialFlowMaterial };