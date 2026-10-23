import { Cartesian2, Cartesian3, CircleEmitter, ConeEmitter, Color, HeadingPitchRoll, Math as CesiumMath, ParticleSystem, Transforms } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'

export interface ParticleEffectOptions extends Omit<NonNullable<ConstructorParameters<typeof ParticleSystem>[0]>, 'modelMatrix'> {
    position: WorldPosition
    type?: 'fire' | 'smoke' | 'fountain'
    heading?: number
    pitch?: number
    gravity?: number
}

const images = {
    fire: new URL('./assets/fire.png', import.meta.url).href,
    smoke: new URL('./assets/smoke.png', import.meta.url).href,
    fountain: new URL('./assets/fountain.png', import.meta.url).href,
}

/** 创建和管理火焰、烟雾、喷泉粒子效果，动画由 Cesium 场景时钟驱动。 */
export class ParticleEffect extends OwnedResource {
    readonly system: ParticleSystem
    private readonly orientation: HeadingPitchRoll

    constructor(host: SceneHost, options: ParticleEffectOptions) {
        const position = toCartesian(options.position)
        super(host)
        const { type = 'fire', heading = 0, pitch = 0, gravity = type === 'fountain' ? -9.8 : 0, position: _position, ...settings } = options
        this.orientation = new HeadingPitchRoll(CesiumMath.toRadians(heading), CesiumMath.toRadians(pitch), 0)
        const preset = type === 'fire'
            ? { startColor: Color.WHITE, endColor: new Color(.5, 0, 0, 0), startScale: 3, endScale: 1.5, minimumSpeed: 7, maximumSpeed: 9, emissionRate: 200, emitter: new ConeEmitter(CesiumMath.toRadians(45)) }
            : type === 'smoke'
                ? { startColor: new Color(.2, .2, .2, .6), endColor: new Color(.2, .2, .2, 0), startScale: 1, endScale: 7, minimumSpeed: 9, maximumSpeed: 9.5, emissionRate: 40, emitter: new CircleEmitter(.2) }
                : { startColor: new Color(.8, .9, 1, .6), endColor: new Color(.8, .9, 1, 0), startScale: .5, endScale: 1, minimumSpeed: 15, maximumSpeed: 20, emissionRate: 100, emitter: new ConeEmitter(CesiumMath.toRadians(15)) }
        this.system = this.viewer.scene.primitives.add(new ParticleSystem({
            ...preset, image: images[type], imageSize: new Cartesian2(2, 2), minimumParticleLife: 1.5,
            maximumParticleLife: 5, loop: true, sizeInMeters: true, ...settings,
            modelMatrix: Transforms.headingPitchRollToFixedFrame(position, this.orientation),
            updateCallback: (particle, dt) => {
                if (gravity && Cartesian3.magnitudeSquared(particle.position) > 0) {
                    const acceleration = Cartesian3.normalize(particle.position, new Cartesian3())
                    Cartesian3.multiplyByScalar(acceleration, gravity * dt, acceleration)
                    Cartesian3.add(particle.velocity, acceleration, particle.velocity)
                }
                settings.updateCallback?.(particle, dt)
            },
        }))
        this.own(this.viewer.scene.preUpdate.addEventListener(() => { if (this.show) this.requestRender() }))
        this.requestRender()
    }

    get show(): boolean { return this.system.show }
    set show(value: boolean) { this.assertAlive(); this.system.show = value; this.requestRender() }

    setPosition(position: WorldPosition): void {
        this.assertAlive()
        this.system.modelMatrix = Transforms.headingPitchRollToFixedFrame(toCartesian(position), this.orientation)
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        if (!this.viewer.isDestroyed()) this.viewer.scene.primitives.remove(this.system)
    }
}
