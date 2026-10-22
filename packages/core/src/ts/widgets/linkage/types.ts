import { Viewer } from "cesium"
import { Config } from "../../config/types"
import { GeoEarth } from "../../GeoEarth"

export interface LinkedViewOptions {
    /** 副视图模式，默认二维。 */
    sceneMode?: '2D' | '3D'

    /** horizontal：左右分屏；vertical：上下分屏。 */
    layout?: 'horizontal' | 'vertical'

    /** 主视图占比，必须大于 0、小于 1，默认 0.5。 */
    ratio?: number

    /** 是否允许操作副视图来驱动主视图，默认 true。 */
    bidirectional?: boolean

    /** 是否启用相机同步，默认 true。 */
    enabled?: boolean

    /** 副地球配置，可以指定独立底图。 */
    config?: Config

    onError?: (error: unknown) => void
}

/** 联动控件实际需要的主地球能力。 */
export type LinkedViewHost = Pick<GeoEarth, 'viewer' | 'config' | 'onReady'>

/** 通过工厂创建副地球，避免控件直接导入 GeoEarth 的运行时实现。 */
export type LinkedEarthFactory = (container: HTMLElement, options: Viewer.ConstructorOptions, config: Config) => GeoEarth