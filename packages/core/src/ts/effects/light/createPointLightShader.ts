import { Cartesian3, Color, CustomShader, LightingModel, UniformType } from 'cesium'
import { toCartesian, type WorldPosition } from '../../utils/coordinate/positions'

export interface PointLightOptions {
    position: WorldPosition
    color?: Color
    radius?: number
    intensity?: number
}

/** 用于 Model/Cesium3DTileset.customShader；调用方负责解除绑定并销毁返回的着色器。 */
export function createPointLightShader(lights: readonly PointLightOptions[]): CustomShader {
    const uniforms: Record<string, { type: UniformType; value: Cartesian3 | Color | number }> = {}
    const contributions = lights.map((light, index) => {
        const radius = light.radius ?? 1000, intensity = light.intensity ?? 1
        if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(intensity) || intensity < 0) throw new RangeError('光照半径必须为正数，强度不能为负数。')
        uniforms[`u_position${index}`] = { type: UniformType.VEC3, value: toCartesian(light.position) }
        uniforms[`u_color${index}`] = { type: UniformType.VEC4, value: light.color ?? Color.WHITE }
        uniforms[`u_radius${index}`] = { type: UniformType.FLOAT, value: radius }
        uniforms[`u_intensity${index}`] = { type: UniformType.FLOAT, value: intensity }
        return `{
            vec3 lightEC = (czm_view * vec4(u_position${index}, 1.0)).xyz;
            vec3 delta = lightEC - positionEC;
            float distanceToLight = length(delta);
            float attenuation = pow(max(0.0, 1.0 - distanceToLight / u_radius${index}), 2.0);
            float diffuse = max(dot(normalEC, delta / max(distanceToLight, 0.001)), 0.0);
            illumination += u_color${index}.rgb * attenuation * diffuse * u_intensity${index} * u_color${index}.a;
        }`
    })
    return new CustomShader({
        lightingModel: LightingModel.PBR, uniforms,
        fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            vec3 positionEC = (czm_modelView * vec4(fsInput.attributes.positionMC, 1.0)).xyz;
            vec3 normalEC = normalize(fsInput.attributes.normalEC);
            vec3 illumination = vec3(0.0);
            ${contributions.join('\n')}
            material.emissive += material.diffuse * illumination;
        }`,
    })
}
