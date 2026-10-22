import { Color, JulianDate } from 'cesium'
import type { Property } from 'cesium'
import { PolylineMaterial } from './base/PolylineMaterial'
import { registerMaterial } from './base/MaterialRegistry'

const TYPE = 'PolylinePulse'
const SOURCE = `
czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float pulse = 0.5 + 0.5 * sin(time * 6.28318530718);
    float strength = mix(minimumStrength, 1.0, pulse);

    material.diffuse = color.rgb;
    material.emission = color.rgb * strength * 2.0;
    material.alpha = color.a * strength;

    return material;
}
`

export interface PolylinePulseMaterialOptions {
    color?: Color
    duration?: number
    minimumStrength?: number
    startTime?: JulianDate
}

export class PolylinePulseMaterial extends PolylineMaterial {
    private readonly color: Color
    private readonly minimumStrength: number

    constructor(options: PolylinePulseMaterialOptions = {}) {
        super(options.duration ?? 1200, options.startTime)
        this.color = Color.clone(options.color ?? Color.RED)
        this.minimumStrength = Math.min(Math.max(options.minimumStrength ?? 0.25, 0), 1)
        if (!Number.isFinite(this.minimumStrength)) throw new RangeError('minimumStrength must be finite.')
        registerMaterial(TYPE, {
            color: Color.RED,
            time: 0,
            minimumStrength: 0.25
        }, SOURCE)
    }

    getType(_time: JulianDate): string {
        return TYPE
    }

    getValue(time: JulianDate = JulianDate.now(), result: any = {}): any {
        result.color = Color.clone(this.color, result.color)
        result.time = this.getProgress(time)
        result.minimumStrength = this.minimumStrength
        return result
    }

    equals(other?: Property): boolean {
        return this === other || other instanceof PolylinePulseMaterial
            && Color.equals(this.color, other.color)
            && this.duration === other.duration
            && this.minimumStrength === other.minimumStrength
            && JulianDate.equals(this.startTime, other.startTime)
    }
}
