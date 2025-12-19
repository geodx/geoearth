// SkyBoxOnGround.ts
// 参考你给的JS写法：只在构造里保存viewer
// customSkyBox -> setFarSkyBox
// SkyBoxOnGround -> setGroundSkyBox
// destroy：注销监听+销毁groundSkyBox(可选销毁farSkyBox)+恢复大气/skyBox
import * as Cesium from "cesium"
import { GroundSkyBox } from "./GroundSkyBox"

export type SkyBoxSources = {
    positiveX: any
    negativeX: any
    positiveY: any
    negativeY: any
    positiveZ: any
    negativeZ: any
}

export interface SetFarSkyBoxOptions {
    /** 远景天空盒sources */
    sources: SkyBoxSources
}

export interface SetGroundSkyBoxOptions {
    /** 近景天空盒sources */
    sources: SkyBoxSources
    /** 触发近景阈值(米)，默认225705 */
    height?: number | string
    /** 低空时隐藏大气层，默认true */
    hideAtmosphereWhenNear?: boolean
    /**
     * 高空时是否显示大气层
     * - 默认true：回到远景时显示大气层
     * - 如果你远景本来就关了大气，可设为false
     */
    showAtmosphereWhenFar?: boolean
}

/**
 * 用法：
 * const sky=new SkyBoxOnGround(viewer)
 * sky.setFarSkyBox({sources:farSources})
 * sky.setGroundSkyBox({sources:groundSources,height:225705})
 * // 组件卸载
 * sky.destroy()
 */
export class SkyBoxOnGround {
    private viewer: Cesium.Viewer

    private farSkyBox?: Cesium.SkyBox
    private farSources?: SkyBoxSources

    // groundSkyBox这里用any，是为了兼容你用的“民间GroundSkyBox”实现(不一定有官方类型)
    private groundSkyBox?: any
    private groundSources?: SkyBoxSources

    private height = 225705
    private hideAtmosphereWhenNear = true
    private showAtmosphereWhenFar = true

    private defaultSkyBoxAtInit: any
    private defaultAtmosphereShowAtInit: boolean

    private removePostRender?: () => void
    private _isDestroyed = false

    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer
        // 记录初始化时的默认状态，destroy时尽量恢复
        this.defaultSkyBoxAtInit = viewer.scene.skyBox
        this.defaultAtmosphereShowAtInit = viewer.scene.skyAtmosphere?.show ?? true
    }

    /**
     * setFarSkyBox：对应你原来的customSkyBox
     * 只负责创建/替换远景天空盒，不自动启用近景逻辑
     */
    setFarSkyBox(options: SetFarSkyBoxOptions) {
        this._assertAlive()
        this.farSources = options.sources
        this.farSkyBox = new Cesium.SkyBox({ sources: options.sources })

        // 如果当前没有启用近景切换(或当前在高空)，可以立刻替换远景
        if (!this.removePostRender) {
            this.viewer.scene.skyBox = this.farSkyBox
        } else {
            // 已经启用切换，则让下一帧逻辑自行决定
        }
    }

    /**
     * setGroundSkyBox：对应你原来的SkyBoxOnGround
     * - 内部创建groundSkyBox
     * - 注册postRender监听做视高判断
     * - 可重复调用：会先清理旧监听和旧groundSkyBox
     */
    setGroundSkyBox(options: SetGroundSkyBoxOptions) {
        this._assertAlive()

        // 参数处理
        const height =
            typeof options.height === "string" ? Number(options.height) : options.height ?? 225705
        this.height = Number.isFinite(height) ? height : 225705
        this.hideAtmosphereWhenNear = options.hideAtmosphereWhenNear ?? true
        this.showAtmosphereWhenFar = options.showAtmosphereWhenFar ?? true

        // 若已启用过，先清理旧的监听和旧ground对象
        this._stopSwitching()
        this._destroyGroundSkyBox()

        this.groundSources = options.sources


        this.groundSkyBox = new GroundSkyBox({ sources: options.sources })

        const defaultSkyBox = this.farSkyBox ?? this.viewer.scene.skyBox

        // 注册postRender监听
        const scene = this.viewer.scene
        const listener = () => {
            const camH = Cesium.Cartographic.fromCartesian(this.viewer.camera.positionWC).height
            if (camH < this.height) {
                scene.skyBox = this.groundSkyBox
                if (this.hideAtmosphereWhenNear && scene.skyAtmosphere) scene.skyAtmosphere.show = false
            } else {
                scene.skyBox = defaultSkyBox
                if (scene.skyAtmosphere) {
                    scene.skyAtmosphere.show = this.showAtmosphereWhenFar
                }
            }
        }

        scene.postRender.addEventListener(listener)
        this.removePostRender = () => scene.postRender.removeEventListener(listener)

        // 立刻执行一次，让设置后立即生效
        listener()
    }

    /**
     * destroy：注销监听+释放资源+尽量恢复初始化时状态
     */
    destroy(options: { restoreDefaults?: boolean; destroyFarSkyBox?: boolean } = {}) {
        if (this._isDestroyed) return
        this._isDestroyed = true

        const restoreDefaults = options.restoreDefaults ?? true
        const destroyFar = options.destroyFarSkyBox ?? false

        this._stopSwitching()
        this._destroyGroundSkyBox()

        if (destroyFar) {
            this._destroyFarSkyBox()
        }

        if (restoreDefaults) {
            // 恢复初始化状态(尽量不打扰外部后来又改过的逻辑：这里按你需求“干净释放”来做恢复)
            this.viewer.scene.skyBox = this.defaultSkyBoxAtInit
            if (this.viewer.scene.skyAtmosphere) {
                this.viewer.scene.skyAtmosphere.show = this.defaultAtmosphereShowAtInit
            }
        }
    }

    // ===================== internal =====================

    private _stopSwitching() {
        if (this.removePostRender) {
            this.removePostRender()
            this.removePostRender = undefined
        }
    }

    private _destroyGroundSkyBox() {
        if (this.groundSkyBox?.destroy) {
            try {
                this.groundSkyBox.destroy()
            } catch {
                // 忽略销毁异常，避免影响卸载流程
            }
        }
        this.groundSkyBox = undefined
        this.groundSources = undefined
    }

    private _destroyFarSkyBox() {
        // Cesium.SkyBox通常不需要手动destroy，但如果你想彻底释放引用可清掉
        this.farSkyBox = undefined
        this.farSources = undefined
    }

    private _assertAlive() {
        if (this._isDestroyed) {
            throw new Error("SkyBoxOnGround已destroy，不能继续调用。")
        }
    }
}
