import { Color, JulianDate, type Property } from 'cesium'
import { PolylineMaterial } from './base/PolylineMaterial'
import { registerMaterial } from './base/MaterialRegistry'

export type PolylineTextureEffect = 'energy' | 'link-pulse' | 'migrate' | 'sprite' | 'super' | 'volume'

/** 线材质的可选纹理，可通过 image 参数设置。 */
export const PolylineTextureImages = {
    sprite1: new URL('../assets/sprite-1.png', import.meta.url).href,
    sprite2: new URL('../assets/sprite-2.png', import.meta.url).href,
    super2: new URL('../assets/super-2.png', import.meta.url).href,
    pipe: new URL('../assets/pipe.png', import.meta.url).href,
}

export interface PolylineTextureMaterialOptions {
    effect?: PolylineTextureEffect
    image?: string
    color?: Color
    /** 动画周期，单位：毫秒；根据 Cesium 传入的 JulianDate 计算进度。 */
    duration?: number
    repeat?: number
    reverse?: boolean
    startTime?: JulianDate
}
const images: Record<PolylineTextureEffect, string> = {
    energy: new URL('../assets/energy.png', import.meta.url).href,
    'link-pulse': new URL('../assets/pulse.png', import.meta.url).href,
    migrate: new URL('../assets/migrate.png', import.meta.url).href,
    sprite: new URL('../assets/sprite.png', import.meta.url).href,
    super: new URL('../assets/super.png', import.meta.url).href,
    volume: new URL('../assets/arrow.png', import.meta.url).href,
}
const source = `
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec4 pixel = texture(image, vec2(fract(materialInput.st.s * repeat - time * direction), materialInput.st.t));
    material.alpha = pixel.a * color.a;
    material.diffuse = mix(color.rgb, pixel.rgb * color.rgb, useImageColor);
    material.emission = material.diffuse * brightness;
    return material;
}`

export class PolylineTextureMaterial extends PolylineMaterial {
    private readonly color: Color
    private readonly image: string
    private readonly repeat: number
    private readonly effect: PolylineTextureEffect
    private readonly direction: number

    constructor(options: PolylineTextureMaterialOptions = {}) {
        super(options.duration ?? 2000, options.startTime)
        this.effect = options.effect ?? 'energy'
        if (!(this.effect in images)) throw new RangeError('Unknown texture effect.')
        this.image = options.image ?? images[this.effect]
        this.repeat = options.repeat ?? (['migrate', 'sprite', 'link-pulse'].includes(this.effect) ? 1 : 4)
        if (!Number.isFinite(this.repeat) || this.repeat <= 0) throw new RangeError('Repeat must be positive.')
        this.color = Color.clone(options.color ?? Color.CYAN)
        this.direction = options.reverse ? -1 : 1
        registerMaterial('GeoEarthPolylineTexture', {
            image: images.energy,
            color: Color.CYAN,
            repeat: 4,
            time: 0,
            direction: 1,
            useImageColor: 0,
            brightness: 1.5
        }, source)
    }

    getType(_time?: JulianDate): string {
        return 'GeoEarthPolylineTexture'
    }

    getValue(time: JulianDate = JulianDate.now(), result: any = {}): any {
        result.image = this.image
        result.color = Color.clone(this.color, result.color)
        result.repeat = this.repeat
        result.time = this.getProgress(time)
        result.direction = this.direction
        result.useImageColor = this.effect === 'sprite' ? 1 : 0
        result.brightness = this.effect === 'energy' || this.effect === 'link-pulse' ? 2.5 : 1.5
        return result
    }

    equals(other?: Property): boolean {
        return this === other || other instanceof PolylineTextureMaterial
            && this.effect === other.effect
            && this.image === other.image
            && this.repeat === other.repeat
            && this.direction === other.direction
            && this.duration === other.duration
            && Color.equals(this.color, other.color)
            && JulianDate.equals(this.startTime, other.startTime)
    }
}
