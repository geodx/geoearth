import { Color, Event, Material, MaterialAppearance, type JulianDate, type MaterialProperty, type Property } from 'cesium'
import { registerMaterial } from '../lines/ts/base/MaterialRegistry'

const TYPE = 'GeoEarthAreaGradient'
const SOURCE = `
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    float amount = clamp(length(materialInput.st - vec2(0.5)) * 1.41421356237, 0.0, 1.0);
    material.diffuse = color.rgb;
    material.alpha = color.a * mix(centerAlpha, edgeAlpha, amount);
    return material;
}`

export interface GradientMaterialOptions {
    color?: Color
    centerAlpha?: number
    edgeAlpha?: number
}

function values(options: GradientMaterialOptions) {
    const centerAlpha = options.centerAlpha ?? 0, edgeAlpha = options.edgeAlpha ?? 1
    if (![centerAlpha, edgeAlpha].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new RangeError('Gradient alpha must be in [0, 1].')
    return { color: Color.clone(options.color ?? Color.CYAN), centerAlpha, edgeAlpha }
}

export class GradientMaterial implements MaterialProperty {
    readonly isConstant = true
    readonly definitionChanged = new Event()
    private readonly uniforms: ReturnType<typeof values>

    constructor(options: GradientMaterialOptions = {}) {
        this.uniforms = values(options)
        registerMaterial(TYPE, { color: Color.CYAN, centerAlpha: 0, edgeAlpha: 1 }, SOURCE)
    }

    getType(_time?: JulianDate): string {
        return TYPE
    }

    getValue(_time?: JulianDate, result: any = {}): any {
        result.color = Color.clone(this.uniforms.color, result.color)
        result.centerAlpha = this.uniforms.centerAlpha
        result.edgeAlpha = this.uniforms.edgeAlpha
        return result
    }

    equals(other?: Property): boolean {
        return this === other || other instanceof GradientMaterial
            && Color.equals(this.uniforms.color, other.uniforms.color)
            && this.uniforms.centerAlpha === other.uniforms.centerAlpha
            && this.uniforms.edgeAlpha === other.uniforms.edgeAlpha
    }
}

export function createGradientAppearance(options: GradientMaterialOptions = {}): MaterialAppearance {
    return new MaterialAppearance({
        material: new Material({ fabric: { uniforms: values(options), source: SOURCE }, translucent: true }),
        faceForward: true,
        closed: false
    })
}
