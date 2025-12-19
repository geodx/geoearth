// SkyBoxOnGround.ts
// 由Cesium源码SkyBox拷贝并做少量修改(乘旋转矩阵)，用于近景天空盒
import * as Cesium from "cesium"

export type SkyBoxSources = {
    positiveX: any
    negativeX: any
    positiveY: any
    negativeY: any
    positiveZ: any
    negativeZ: any
}

export interface SkyBoxOnGroundOptions {
    sources: SkyBoxSources
    show?: boolean
}

// 兼容：新版Cesium里Matrix4.getRotation被移除
const Matrix4Any = Cesium.Matrix4 as any
if (!Cesium.defined(Matrix4Any.getRotation)) {
    Matrix4Any.getRotation = Matrix4Any.getMatrix3
}

// 低层类在Cesium1.135的.d.ts里可能未暴露，用any兜底
const CubeMapCtor = (Cesium as any).CubeMap as any
const loadCubeMapFn = (Cesium as any).loadCubeMap as any

const DrawCommandCtor = (Cesium as any).DrawCommand as any
const VertexArrayAny = (Cesium as any).VertexArray as any
const ShaderProgramAny = (Cesium as any).ShaderProgram as any
const ShaderSourceAny = (Cesium as any).ShaderSource as any
const RenderStateAny = (Cesium as any).RenderState as any
const BufferUsage = (Cesium as any).BufferUsage as any
const skyboxMatrix3 = new Cesium.Matrix3()

// ===== Shader(缓存，不要每帧创建字符串) =====

// WebGL1(GLSL100)
const SkyBoxFS_100 = `
uniform samplerCube u_cubeMap;
varying vec3 v_texCoord;
void main()
{
  vec4 color = textureCube(u_cubeMap, normalize(v_texCoord));
  gl_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);
}
`

const SkyBoxVS_100 = `
attribute vec3 position;
varying vec3 v_texCoord;
uniform mat3 u_rotateMatrix;
void main()
{
  vec3 p = czm_viewRotation * u_rotateMatrix * (czm_temeToPseudoFixed * (czm_entireFrustum.y * position));
  gl_Position = czm_projection * vec4(p, 1.0);
  v_texCoord = position.xyz;
}
`

// WebGL2(GLSL300)
const SkyBoxFS_300 = `#version 300 es
precision highp float;

uniform samplerCube u_cubeMap;
in vec3 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_cubeMap, normalize(v_texCoord));
  fragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);
}
`

const SkyBoxVS_300 = `#version 300 es
precision highp float;

in vec3 position;
out vec3 v_texCoord;

uniform mat3 u_rotateMatrix;

void main() {
  vec3 p = czm_viewRotation * u_rotateMatrix * (czm_temeToPseudoFixed * (czm_entireFrustum.y * position));
  gl_Position = czm_projection * vec4(p, 1.0);
  v_texCoord = position;
}
`

export class GroundSkyBox {
    sources: SkyBoxSources
    show: boolean

    private _sources?: SkyBoxSources
    private _command: any
    private _cubeMap: any
    private _attributeLocations: any
    private _useHdr?: boolean

    constructor(options: SkyBoxOnGroundOptions) {
        if (!options || !options.sources) {
            throw new Cesium.DeveloperError("options.sources is required.")
        }

        this.sources = options.sources
        this._sources = undefined
        this.show = options.show ?? true

        this._command = new DrawCommandCtor({
            modelMatrix: Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY),
            owner: this
        })

        this._cubeMap = undefined
        this._attributeLocations = undefined
        this._useHdr = undefined
    }

    update(frameState: any, useHdr: boolean) {
        if (!this.show) return undefined

        if (
            frameState.mode !== Cesium.SceneMode.SCENE3D &&
            frameState.mode !== Cesium.SceneMode.MORPHING
        ) {
            return undefined
        }

        if (!frameState.passes?.render) return undefined

        const context = frameState.context

        // sources变化则重建/重载cubemap
        if (this._sources !== this.sources) {
            this._sources = this.sources
            const sources: any = this.sources

            if (
                !Cesium.defined(sources.positiveX) ||
                !Cesium.defined(sources.negativeX) ||
                !Cesium.defined(sources.positiveY) ||
                !Cesium.defined(sources.negativeY) ||
                !Cesium.defined(sources.positiveZ) ||
                !Cesium.defined(sources.negativeZ)
            ) {
                throw new Cesium.DeveloperError(
                    "sources must have positiveX, negativeX, positiveY, negativeY, positiveZ, negativeZ."
                )
            }

            if (
                typeof sources.positiveX !== typeof sources.negativeX ||
                typeof sources.positiveX !== typeof sources.positiveY ||
                typeof sources.positiveX !== typeof sources.negativeY ||
                typeof sources.positiveX !== typeof sources.positiveZ ||
                typeof sources.positiveX !== typeof sources.negativeZ
            ) {
                throw new Cesium.DeveloperError("sources properties must all be the same type.")
            }

            if (typeof sources.positiveX === "string") {
                // URL方式：异步加载
                loadCubeMapFn(context, this._sources).then((cubeMap: any) => {
                    this._cubeMap = this._cubeMap && this._cubeMap.destroy()
                    this._cubeMap = cubeMap
                })
            } else {
                // ImageData/Canvas等：直接创建
                this._cubeMap = this._cubeMap && this._cubeMap.destroy()
                this._cubeMap = new CubeMapCtor({
                    context,
                    source: sources
                })
            }
        }

        const command = this._command

        // 你原来用camera._positionWC(私有)。改用camera.positionWC(公开)更稳
        command.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
            frameState.camera.positionWC
        )

        if (!Cesium.defined(command.vertexArray)) {
            command.uniformMap = {
                u_cubeMap: () => this._cubeMap,
                u_rotateMatrix: () => Matrix4Any.getRotation(command.modelMatrix, skyboxMatrix3)
            }

            const geometry = Cesium.BoxGeometry.createGeometry(
                Cesium.BoxGeometry.fromDimensions({
                    dimensions: new Cesium.Cartesian3(2.0, 2.0, 2.0),
                    vertexFormat: Cesium.VertexFormat.POSITION_ONLY
                })
            )

            if (!geometry) return
            this._attributeLocations = Cesium.GeometryPipeline.createAttributeLocations(geometry)

            command.vertexArray = VertexArrayAny.fromGeometry({
                context,
                geometry,
                attributeLocations: this._attributeLocations,
                // 你原来写BufferUsage._DRAW不稳，改成STATIC_DRAW并fallback
                bufferUsage: BufferUsage.STATIC_DRAW ?? BufferUsage._DRAW
            })

            command.renderState = RenderStateAny.fromCache({
                blending: (Cesium as any).BlendingState.ALPHA_BLEND
            })
        }

        if (!Cesium.defined(command.shaderProgram) || this._useHdr !== useHdr) {
            const isWebGL2 = !!context.webgl2

            const vs = isWebGL2 ? SkyBoxVS_300 : SkyBoxVS_100
            const fsSource = isWebGL2 ? SkyBoxFS_300 : SkyBoxFS_100

            const fs = new ShaderSourceAny({
                defines: [useHdr ? "HDR" : ""],
                sources: [fsSource]
            })

            command.shaderProgram = ShaderProgramAny.fromCache({
                context,
                vertexShaderSource: vs,
                fragmentShaderSource: fs,
                attributeLocations: this._attributeLocations
            })

            this._useHdr = useHdr
        }

        if (!Cesium.defined(this._cubeMap)) return undefined

        return command
    }

    isDestroyed() {
        return false
    }

    destroy() {
        const command = this._command
        command.vertexArray = command.vertexArray && command.vertexArray.destroy()
        command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy()
        this._cubeMap = this._cubeMap && this._cubeMap.destroy()
        return Cesium.destroyObject(this)
    }
}
