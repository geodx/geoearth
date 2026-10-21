import type { Cartographic, Entity, Rectangle, Viewer } from 'cesium'
import type { CameraManager } from '../../camera/CameraManager'
import type { CameraView } from '../../camera/types'
import type NavigationControl from './controls/NavigationControl'

export type NavigationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** 导航插件配置，统一控制罗盘、缩放、视角复位和比例尺。 */
export interface NavigationOptions {
    /** 罗盘和缩放控件的显示位置，默认为右上角。 */
    position?: NavigationPosition
    /** 默认恢复 GeoEarth 初始视角，支持 Cesium 位置、矩形范围或以角度为单位的 CameraView。 */
    defaultResetView?: Cartographic | Rectangle | CameraView
    /** 复位目标为 Cartographic 或 Rectangle 时使用的 Cesium 姿态，单位为弧度。 */
    orientation?: { heading: number; pitch: number; roll: number }
    /** 是否显示罗盘，默认为 true。 */
    enableCompass?: boolean
    /** 是否显示缩放和复位控件，默认为 true。 */
    enableZoomControls?: boolean
    /** 是否显示比例尺，默认为 true。 */
    enableDistanceLegend?: boolean
    /** 是否允许通过罗盘外环旋转视角，默认为 true。 */
    enableCompassOuterRing?: boolean
    /** 视角复位的飞行时长，单位为秒，默认为 3。 */
    duration?: number
    resetTooltip?: string
    zoomInTooltip?: string
    zoomOutTooltip?: string
    /** 应用提供的自定义 SVG 标记。 */
    compassOuterRingSvg?: string
    compassRotationMarkerSvg?: string
    compassGyroSvg?: string
    resetSvg?: string
    zoomInSvg?: string
    zoomOutSvg?: string
    onError?: (error: unknown) => void
}

/** 导航插件内部共享的上下文。 */
export interface NavigationContext {
    viewerWidget: Viewer
    options: NavigationOptions
    cameraManager: CameraManager
    navigationLocked?: boolean
    controls?: NavigationControl[]
    trackedEntity?: Entity
    container: HTMLElement
    beforeNavigate: () => void
    reportError: (error: unknown) => void
}
