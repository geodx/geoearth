import { Color, JulianDate, type Property } from 'cesium'
import { PolylineMaterial } from './base/PolylineMaterial'
import { registerMaterial } from './base/MaterialRegistry'

export interface PolylineTrailMaterialOptions {
    color?: Color
    duration?: number
    /** 移动尾迹占整条线的比例，范围为 (0, 1]。 */
    length?: number
    backgroundAlpha?: number
    reverse?: boolean
    startTime?: JulianDate
}

export class PolylineTrailMaterial extends PolylineMaterial {
    private readonly color: Color
    private readonly length: number
    private readonly background: number
    private readonly direction: number

    constructor(options: PolylineTrailMaterialOptions = {}) {
        super(options.duration ?? 2000, options.startTime)
        this.color = Color.clone(options.color ?? Color.CYAN)
        this.length = options.length ?? .2
        this.background = options.backgroundAlpha ?? .05
        if (!Number.isFinite(this.length) || this.length <= 0 || this.length > 1 || !Number.isFinite(this.background) || this.background < 0 || this.background > 1) throw new RangeError('Invalid trail length or backgroundAlpha.')
        this.direction = options.reverse ? -1 : 1
        registerMaterial('GeoEarthPolylineTrail', { color: Color.CYAN, time: 0, length: .2, background: .05, direction: 1 }, `
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    float behind = fract(time - materialInput.st.s * direction);
    float strength = (1.0 - smoothstep(0.0, length, behind)) * step(behind, length);
    material.diffuse = color.rgb;
    material.emission = color.rgb * strength;
    material.alpha = color.a * max(background, strength);
    return material;
}`)
    }

    getType(_time?: JulianDate): string {
        return 'GeoEarthPolylineTrail'
    }

    getValue(time: JulianDate = JulianDate.now(), result: any = {}): any {
        result.color = Color.clone(this.color, result.color)
        result.time = this.getProgress(time)
        result.length = this.length
        result.background = this.background
        result.direction = this.direction
        return result
    }

    equals(other?: Property): boolean {
        return this === other || other instanceof PolylineTrailMaterial && this.length === other.length && this.background === other.background && this.direction === other.direction && this.duration === other.duration && Color.equals(this.color, other.color) && JulianDate.equals(this.startTime, other.startTime)
    }
}
