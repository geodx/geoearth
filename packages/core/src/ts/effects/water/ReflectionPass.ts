import * as Cesium from 'cesium'
import { BoundingRectangle, Camera, Cartesian3, Cartesian4, Color, Matrix4, PerspectiveFrustum, SceneMode, type Material, type Primitive, type Scene } from 'cesium'

// Cesium 未公开离屏场景接口，内部渲染依赖仅收敛在此文件；基于 1.146 验证。
const C = Cesium as any

/** 镜像反射或同向水下采集。只执行绘制，避免递归运行计算、拾取和阴影任务。 */
export class ReflectionPass {
    readonly matrix = Matrix4.clone(Matrix4.IDENTITY)
    readonly inverseMatrix = Matrix4.clone(Matrix4.IDENTITY)
    clipMargin = .05
    enabled = true
    skyReflection = true
    ready = false
    private readonly camera: Camera
    private framebuffer: any
    private texture: any
    private depthTexture: any
    private readonly passState: any
    private readonly tilesetPassState = new C.Cesium3DTilePassState({ pass: C.Cesium3DTilePass.RENDER })
    private readonly planeEC = new Cartesian4()
    private readonly origin: Cartesian3
    private readonly normal: Cartesian3
    private globeCommands: any[] = []
    private readonly removePostRender: () => void

    constructor(private readonly scene: Scene, private readonly frame: Matrix4, private readonly size: number, private readonly underwater = false) {
        this.camera = new Camera(scene)
        this.origin = Matrix4.getTranslation(frame, new Cartesian3())
        this.normal = Cartesian3.normalize(Matrix4.getColumn(frame, 2, new Cartesian4()) as unknown as Cartesian3, new Cartesian3())
        this.passState = new C.PassState((scene as any).context)
        // 地球四叉树的选瓦状态不能在同一帧由两个相机轮流改写。
        // 倒影复用上一主帧已就绪的地形颜色命令，LOD 与网络请求仍由主场景负责。
        this.removePostRender = scene.postRender.addEventListener(() => {
            this.globeCommands = (scene as any)._frameState.commandList
                .filter(command => command.pass === C.Pass.GLOBE && command.shaderProgram)
                .map(command => C.DrawCommand.shallowClone(command))
        })
    }

    /** 材质只借用纹理，颜色及深度附件由本对象统一释放。 */
    bindMaterial(material: Material): void {
        const uniforms = (material as any)._uniforms
        for (const name of this.underwater ? ['underwaterColorMap', 'underwaterDepthMap'] : ['reflectionMap']) {
            const key = Object.keys(uniforms).find(key => key.startsWith(`${name}_`))
            if (!key) throw new Error(`Water sampler ${name} was not created.`)
            uniforms[key] = () => (name === 'underwaterDepthMap' ? this.depthTexture : this.texture) ?? (this.scene as any).context.defaultTexture
        }
    }

    render(waters: readonly Primitive[]): void {
        this.ready = false
        const source = this.scene.camera
        if (!this.enabled || this.scene.mode !== SceneMode.SCENE3D || !(source.frustum instanceof PerspectiveFrustum)) return
        const height = Cartesian3.dot(Cartesian3.subtract(source.positionWC, this.origin, new Cartesian3()), this.normal)
        if (height <= 0.05) return
        const scene = this.scene as any
        const context = scene.context
        if (this.underwater && !context.depthTexture) return
        const state = scene._frameState
        // preRender 位于主场景 updateFrameState 之前。滚轮缩放的深度拾取会
        // 清空主帧 passes，不能据此跳过当前反射，也不能沿用拾取用的 Tiles 通道。
        const reflect = (v: Cartesian3) => Cartesian3.subtract(v, Cartesian3.multiplyByScalar(this.normal, 2 * Cartesian3.dot(v, this.normal), new Cartesian3()), new Cartesian3())
        const camera = this.camera
        camera.position = this.underwater ? Cartesian3.clone(source.positionWC, camera.position) : Cartesian3.subtract(source.positionWC, Cartesian3.multiplyByScalar(this.normal, 2 * height, new Cartesian3()), camera.position)
        camera.direction = this.underwater ? Cartesian3.clone(source.directionWC) : reflect(source.directionWC)
        camera.up = this.underwater ? Cartesian3.clone(source.upWC) : reflect(source.upWC)
        camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right)
        camera.frustum = source.frustum.clone()
        // A larger capture near plane preserves useful bottom-depth precision at globe-scale far distances.
        if (this.underwater) camera.frustum.near = Math.max(camera.frustum.near, Math.min(height * .25, 50))
        ;(camera as any).update(SceneMode.SCENE3D)
        Matrix4.multiply(camera.frustum.projectionMatrix, camera.viewMatrix, this.matrix)
        Matrix4.multiply(this.matrix, this.frame, this.matrix)
        Matrix4.inverse(this.matrix, this.inverseMatrix)
        const n = Matrix4.multiplyByPointAsVector(camera.viewMatrix, this.normal, new Cartesian3())
        if (this.underwater) Cartesian3.negate(n, n)
        const p = Matrix4.multiplyByPoint(camera.viewMatrix, this.origin, new Cartesian3())
        Cartesian4.fromElements(n.x, n.y, n.z, -Cartesian3.dot(n, p) + (this.underwater ? this.clipMargin : -.05), this.planeEC)

        if (!this.framebuffer) {
            this.texture = new C.Texture({ context, width: this.size, height: this.size })
            if (this.underwater) {
                this.depthTexture = new C.Texture({ context, width: this.size, height: this.size,
                    pixelFormat: C.PixelFormat.DEPTH_STENCIL, pixelDatatype: C.PixelDatatype.UNSIGNED_INT_24_8,
                    sampler: new C.Sampler({ minificationFilter: C.TextureMinificationFilter.NEAREST, magnificationFilter: C.TextureMagnificationFilter.NEAREST }) })
                this.framebuffer = new C.Framebuffer({ context, colorTextures: [this.texture], depthStencilTexture: this.depthTexture })
            } else {
                const depth = new C.Renderbuffer({ context, width: this.size, height: this.size, format: C.RenderbufferFormat.DEPTH24_STENCIL8 })
                this.framebuffer = new C.Framebuffer({ context, colorTextures: [this.texture], depthStencilRenderbuffer: depth })
            }
        }
        const pass = this.passState
        pass.framebuffer = this.framebuffer
        pass.viewport = new BoundingRectangle(0, 0, this.size, this.size)
        const uniforms = context.uniformState
        const viewport = BoundingRectangle.clone(uniforms.viewport)
        // 独立命令列表保留主场景状态；重新收集可见物体，避免仅倒映主视锥内物体。
        const mirrorState = Object.assign(Object.create(Object.getPrototypeOf(state)), state, {
            // afterRender 沿用主帧队列，保证首次在此完成的异步图元也能进入 ready。
            camera, commandList: [], shadowMaps: [], occluder: undefined,
            tilesetPassState: this.tilesetPassState,
            pickingMetadata: false, pickedMetadataInfo: undefined,
            cullingVolume: camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC),
            passes: { render: true, offscreen: true, pick: false, pickVoxel: false, snap: false, depth: false, postProcess: false },
        })
        const visibility = waters.map(water => water.show)
        try {
            waters.forEach(water => { water.show = false })
            uniforms.update(mirrorState)
            uniforms.viewport = pass.viewport
            new C.ClearCommand({ color: scene.backgroundColor ?? Color.BLACK, depth: 1, stencil: 0, framebuffer: this.framebuffer }).execute(context, pass)
            if (this.skyReflection && !this.underwater) {
                // 使用场景自身的天空对象；大气、星空及太阳方位随 Cesium 时间同步。
                uniforms.updatePass(C.Pass.ENVIRONMENT)
                const skyBox = scene.skyBox?.update(mirrorState, false)
                if (skyBox) skyBox.execute(context, pass)
                const atmosphere = scene.skyAtmosphere?.update(mirrorState, scene.globe)
                if (atmosphere) atmosphere.execute(context, pass)
            }
            scene.primitives.update(mirrorState)
            if (scene.globe?.show) mirrorState.commandList.push(...this.globeCommands)
            const commands = mirrorState.commandList.filter(command => command.shaderProgram && !command.framebuffer &&
                [C.Pass.GLOBE, C.Pass.CESIUM_3D_TILE, C.Pass.OPAQUE, C.Pass.TRANSLUCENT].includes(command.pass))
            // 透明物体放在不透明物体之后，按距镜像相机从远到近排序。
            commands.sort((a, b) => {
                if (a.pass !== C.Pass.TRANSLUCENT && b.pass === C.Pass.TRANSLUCENT) return -1
                if (a.pass === C.Pass.TRANSLUCENT && b.pass !== C.Pass.TRANSLUCENT) return 1
                if (a.pass !== C.Pass.TRANSLUCENT) return 0
                const distance = command => command.boundingVolume ? Cartesian3.distanceSquared(command.boundingVolume.center, camera.positionWC) : 0
                return distance(b) - distance(a)
            })
            for (const original of commands) {
                const command = C.DrawCommand.shallowClone(original)
                command.shaderProgram = this.clippedProgram(context, original.shaderProgram)
                command.uniformMap = { ...original.uniformMap, geoearth_waterPlane: () => this.planeEC }
                // 主视口不能覆盖反射纹理尺寸。
                const renderState = C.RenderState.getState(original.renderState)
                renderState.viewport = undefined
                renderState.scissorTest.enabled = false
                command.renderState = C.RenderState.fromCache(renderState)
                uniforms.updatePass(command.pass)
                command.execute(context, pass)
            }
            this.ready = true
        } finally {
            waters.forEach((water, index) => { water.show = visibility[index] })
            uniforms.update(state)
            uniforms.viewport = viewport
            // 大气命令的朝向由相机决定，恢复主场景的模型矩阵。
            if (this.skyReflection && !this.underwater) scene.skyAtmosphere?.update(state, scene.globe)
        }
    }

    private clippedProgram(context: any, program: any): any {
        const key = 'geoearth-water-clip'
        const cache = context.shaderCache
        let result = cache.getDerivedShaderProgram(program, key)
        if (result) return result
        const vertex = program.vertexShaderSource.clone()
        const fragment = program.fragmentShaderSource.clone()
        vertex.sources = vertex.sources.map(source => C.ShaderSource.replaceMain(source, 'geoearth_originalMain'))
        vertex.sources.push(`
out float geoearth_waterDistance;
uniform vec4 geoearth_waterPlane;
void main() {
    geoearth_originalMain();
    // log-depth 只改写 z；用 xy/w 恢复眼空间射线和线性深度。
    vec4 ray = czm_inverseProjection * vec4(gl_Position.xy, 0.0, gl_Position.w);
    vec3 eye = ray.xyz * (-gl_Position.w / ray.z);
    geoearth_waterDistance = dot(vec4(eye, 1.0), geoearth_waterPlane);
}`)
        fragment.sources = fragment.sources.map(source => C.ShaderSource.replaceMain(source, 'geoearth_originalMain'))
        fragment.sources.push(`
in float geoearth_waterDistance;
void main() {
    if (geoearth_waterDistance < 0.0) discard;
    geoearth_originalMain();
}`)
        result = cache.createDerivedShaderProgram(program, key, {
            vertexShaderSource: vertex, fragmentShaderSource: fragment, attributeLocations: program._attributeLocations,
        })
        return result
    }

    destroy(): void {
        this.removePostRender()
        this.globeCommands = []
        if (this.framebuffer && !this.framebuffer.isDestroyed()) this.framebuffer.destroy()
        this.framebuffer = this.texture = this.depthTexture = undefined
        this.ready = false
    }
}


