import { Cesium3DTileset, ConstantProperty, Entity, Model, ModelGraphics, type CustomShader } from 'cesium'
import { OwnedResource } from '../../utils/scene/OwnedResource'
import type { SceneHost } from '../../utils/scene/types'
import { buildPointLightShader, getPointLightUniforms, type PointLightOptions } from './createPointLightShader'

/** Entity 需包含 ModelGraphics，例如通过 earth.sources 加载的 GLB 模型。 */
export type PointLightTarget = Model | Cesium3DTileset | Entity
type ShaderTarget = Model | Cesium3DTileset | ModelGraphics

const boundTargets = new WeakSet<ShaderTarget>()

function getShaderTarget(target: PointLightTarget): ShaderTarget {
    if (target instanceof Entity && target.model) return target.model
    if (target instanceof Model || target instanceof Cesium3DTileset) return target
    throw new TypeError('点光源需要 Model、Cesium3DTileset 或包含模型的 Entity。')
}

function isTargetDestroyed(target: ShaderTarget): boolean {
    return !(target instanceof ModelGraphics) && target.isDestroyed()
}

/** 一组绑定到同一模型或瓦片集的点光源。 */
export class PointLightEffect extends OwnedResource {
    private readonly target: ShaderTarget
    private shader: CustomShader
    private attachment: CustomShader | ConstantProperty | undefined
    private lightCount: number

    constructor(host: SceneHost, target: PointLightTarget, lights: readonly PointLightOptions[]) {
        const shaderTarget = getShaderTarget(target)
        if (isTargetDestroyed(shaderTarget)) throw new Error('点光源目标已销毁。')
        if (boundTargets.has(shaderTarget) || shaderTarget.customShader) {
            throw new Error('目标已有点光源效果或自定义着色器。')
        }
        const uniforms = getPointLightUniforms(lights)
        super(host)
        this.target = shaderTarget
        this.lightCount = lights.length
        boundTargets.add(shaderTarget)
        this.own(() => {
            try {
                this.detach()
            } finally {
                boundTargets.delete(shaderTarget)
                this.shader?.destroy()
            }
        })
        try {
            this.shader = buildPointLightShader(this.lightCount, uniforms)
            this.attach()
            this.requestRender()
        } catch (error) {
            this.destroy()
            throw error
        }
    }

    /** 暂停照明时解除着色器绑定，以恢复模型原有材质的照明模式。 */
    get show(): boolean {
        return this.attachment !== undefined
    }

    set show(value: boolean) {
        this.assertTarget()
        if (value === this.show) return
        if (value) {
            if (this.target.customShader) throw new Error('目标已有自定义着色器。')
            this.attach()
        } else {
            this.detach()
        }
        this.requestRender()
    }

    /** 替换整组灯光参数。灯数相同时复用现有着色器。 */
    update(lights: readonly PointLightOptions[]): void {
        this.assertTarget()
        const uniforms = getPointLightUniforms(lights)
        if (lights.length === this.lightCount) {
            for (const [name, uniform] of Object.entries(uniforms)) {
                this.shader.setUniform(name, uniform.value)
            }
        } else {
            const previous = this.shader
            this.shader = buildPointLightShader(lights.length, uniforms)
            this.lightCount = lights.length
            try {
                if (this.show) this.attach()
            } finally {
                previous.destroy()
            }
        }
        this.requestRender()
    }

    private assertTarget(): void {
        this.assertAlive()
        if (isTargetDestroyed(this.target)) throw new Error('点光源目标已销毁。')
        if (this.attachment && this.target.customShader !== this.attachment) {
            throw new Error('点光源着色器已被替换。')
        }
    }

    private attach(): void {
        if (this.target instanceof ModelGraphics) {
            const property = new ConstantProperty(this.shader)
            this.attachment = property
            this.target.customShader = property
        } else {
            this.attachment = this.shader
            this.target.customShader = this.shader
        }
    }

    private detach(): void {
        const attachment = this.attachment
        this.attachment = undefined
        if (attachment && !isTargetDestroyed(this.target) && this.target.customShader === attachment) {
            this.target.customShader = undefined
        }
    }
}
