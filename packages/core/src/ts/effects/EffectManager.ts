import type { SceneHost } from '../utils/scene/types'
import { PointLightEffect, type PointLightTarget } from './light/PointLightEffect'
import type { PointLightOptions } from './light/createPointLightShader'
import { ParticleEffect, type ParticleEffectOptions } from './particle'
import { WaterEffect, type WaterEffectOptions } from './water'
import { WeatherEffect, type WeatherOptions } from './weather'

export class EffectManager {
    constructor(private readonly host: SceneHost) {}

    addWater(options: WaterEffectOptions): WaterEffect {
        return new WaterEffect(this.host, options)
    }

    addWeather(options: WeatherOptions): WeatherEffect {
        return new WeatherEffect(this.host, options)
    }

    addParticle(options: ParticleEffectOptions): ParticleEffect {
        return new ParticleEffect(this.host, options)
    }

    /** 将一组点光源绑定到目标，效果随地球销毁。 */
    addPointLights(target: PointLightTarget, lights: readonly PointLightOptions[]): PointLightEffect {
        return new PointLightEffect(this.host, target, lights)
    }
}
