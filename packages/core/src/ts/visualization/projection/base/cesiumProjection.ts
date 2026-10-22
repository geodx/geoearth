import * as Cesium from 'cesium'
import type { Camera, Scene } from 'cesium'

/** 集中封装 Cesium 私有接口，避免其字段渗透到公共 API。 */
export function createProjectionShadow(scene: Scene, camera: Camera, size: number): any {
    const Runtime = Cesium as any
    const context = (scene as any).context
    if (!Runtime.Texture || !Runtime.ShadowMap || !context) throw new Error('This Cesium runtime does not expose the video projection resources.')
    return new Runtime.ShadowMap({
        context,
        lightCamera: camera,
        enabled: true,
        isPointLight: false,
        cascadesEnabled: false,
        fromLightSource: false,
        size
    })
}

export function createVideoTexture(scene: Scene, video: HTMLVideoElement): any {
    return new (Cesium as any).Texture({
        context: (scene as any).context,
        source: video,
        pixelFormat: Cesium.PixelFormat.RGBA,
        pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE
    })
}

export function projectionUniforms(shadow: any, texture: () => any, alpha: () => number) {
    const bias = shadow._primitiveBias
    if (!bias || !shadow._textureSize) throw new Error('Unsupported Cesium ShadowMap layout for video projection.')
    return {
        mixNum: alpha,
        stcshadow: () => shadow._shadowMapTexture,
        videoTexture: texture,
        _shadowMap_matrix: () => shadow._shadowMapMatrix,
        shadowMap_lightPositionEC: () => shadow._lightPositionEC,
        shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: () => new Cesium.Cartesian4(1 / shadow._textureSize.x, 1 / shadow._textureSize.y, bias.depthBias, bias.normalShadingSmooth),
        shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: () => new Cesium.Cartesian4(bias.normalOffsetScale, shadow._distance, shadow.maximumDistance, shadow._darkness),
    }
}
