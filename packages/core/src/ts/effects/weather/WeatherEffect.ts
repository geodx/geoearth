import { Color, PostProcessStage } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'

export interface WeatherOptions {
    type: 'rain' | 'snow' | 'fog'
    intensity?: number
    speed?: number
    color?: Color
    /** 雾开始出现的视距，单位：米。 */
    near?: number
    /** 雾达到设定强度的视距，单位：米。 */
    far?: number
}

const shader = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float effectType;
uniform float time;
uniform float intensity;
uniform float fogNear;
uniform float fogFar;
uniform vec4 weatherColor;
in vec2 v_textureCoordinates;
float noise(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main() {
    vec2 uv = v_textureCoordinates;
    vec4 sceneColor = texture(colorTexture, uv);
    float amount = 0.0;
    if (effectType > 1.5) {
        // 从原始深度恢复视空间距离，雾浓度随观察距离递增。
        float depth = texture(depthTexture, uv).r;
        vec4 eye = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
        amount = smoothstep(fogNear, fogFar, max(0.0, -eye.z / eye.w));
    } else if (effectType < 0.5) {
        vec2 rain = vec2(uv.x + uv.y * 0.18, uv.y + time * 0.8) * vec2(180.0, 30.0);
        float seed = noise(floor(rain));
        amount = step(0.94, seed) * (1.0 - smoothstep(0.0, 0.12, abs(fract(rain.x)-0.5))) * smoothstep(0.0,0.7,fract(rain.y));
    } else {
        for (int i=0; i<3; i++) {
            float scale = 12.0 + float(i)*10.0;
            vec2 p = uv * scale + vec2(sin(time*0.3+float(i)), time*(0.4+float(i)*0.15));
            vec2 cell = floor(p);
            vec2 center = vec2(noise(cell), noise(cell+vec2(7.0,11.0)));
            amount += 1.0-smoothstep(0.015,0.065,length(fract(p)-center));
        }
        amount = clamp(amount,0.0,1.0);
    }
    out_FragColor = vec4(mix(sceneColor.rgb, weatherColor.rgb, amount*intensity*weatherColor.a),sceneColor.a);
}`

/** 雨、雪、雾共用一个后处理实例，各地球间不共享全局天气状态。 */
export class WeatherEffect extends OwnedResource {
    readonly stage: PostProcessStage
    private readonly started = performance.now()

    constructor(host: SceneHost, options: WeatherOptions) {
        const intensity = options.intensity ?? .6, speed = options.speed ?? 1
        const near = options.near ?? 100, far = options.far ?? 10000
        if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1 || !Number.isFinite(speed) || speed < 0 || near < 0 || far <= near) {
            throw new RangeError('天气强度须在 [0,1]，速度不能为负，远距离必须大于近距离。')
        }
        super(host)
        this.stage = new PostProcessStage({
            fragmentShader: shader,
            uniforms: { effectType: ['rain', 'snow', 'fog'].indexOf(options.type), intensity,
                time: () => (performance.now() - this.started) / 1000 * speed,
                fogNear: near, fogFar: far, weatherColor: options.color ?? Color.WHITE },
        })
        this.viewer.scene.postProcessStages.add(this.stage)
        // 静态雾也需等待后处理资源就绪；就绪后仅在场景本身变化时重绘。
        this.own(this.viewer.scene.preUpdate.addEventListener(() => {
            if (this.show && (options.type !== 'fog' || !this.stage.ready)) this.requestRender()
        }))
        this.requestRender()
    }

    get show(): boolean { return this.stage.enabled }
    set show(value: boolean) { this.assertAlive(); this.stage.enabled = value; this.requestRender() }

    override destroy(): void {
        if (this.destroyed) return
        super.destroy()
        if (!this.viewer.isDestroyed()) this.viewer.scene.postProcessStages.remove(this.stage)
    }
}
