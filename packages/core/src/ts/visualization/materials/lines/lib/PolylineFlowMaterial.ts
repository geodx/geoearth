import { Color, JulianDate } from 'cesium'
import type { Property } from 'cesium'
import { PolylineMaterial } from '../internal/PolylineMaterial'
import { registerMaterial } from '../internal/MaterialRegistry'

const TYPE = 'PolylineFlow'

const SOURCE = `
czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float position = fract(st.s * repeat - time * direction);
    float head = smoothstep(0.0, 0.12, position);
    float tail = 1.0 - smoothstep(0.12, 1.0, position);
    float intensity = head * tail;

    material.diffuse = color.rgb;
    material.emission = color.rgb * (0.4 + intensity * 2.5);
    material.alpha = color.a * (0.2 + intensity * 0.8);

    return material;
}
`

export interface PolylineFlowMaterialOptions {
    color?: Color
    duration?: number
    repeat?: number
    reverse?: boolean
}

export class PolylineFlowMaterial extends PolylineMaterial {
    private readonly color: Color
    private readonly repeat: number
    private readonly reverse: boolean

    constructor(options: PolylineFlowMaterialOptions = {}) {
        super(options.duration ?? 2000)

        this.color = Color.clone(options.color ?? Color.CYAN)
        this.repeat = Math.max(options.repeat ?? 4, 1)
        this.reverse = options.reverse ?? false

        registerMaterial(TYPE, {
            color: Color.CYAN,
            time: 0,
            repeat: 4,
            direction: 1
        }, SOURCE)
    }

    getType(_time: JulianDate): string {
        return TYPE
    }

    getValue(time: JulianDate = JulianDate.now(), result: any = {}): any {
        result.color = Color.clone(this.color, result.color)
        result.time = this.getProgress(time)
        result.repeat = this.repeat
        result.direction = this.reverse ? -1 : 1

        return result
    }

    equals(other?: Property): boolean {
        return this === other || other instanceof PolylineFlowMaterial
            && Color.equals(this.color, other.color)
            && this.duration === other.duration
            && this.repeat === other.repeat
            && this.reverse === other.reverse
    }
}