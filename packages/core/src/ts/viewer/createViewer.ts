import { Credit, CreditDisplay, Ion, Viewer } from 'cesium'
import { getDefaultViewerOptions } from './defaultViewerOptions'
import { initViewerState } from './initViewerState'
import { prepareContainer, resolveContainer } from './resolveContainer'
import { Config } from '../config/types'

export function createViewer(container: string | HTMLElement, viewerOptions: Viewer.ConstructorOptions | undefined, config: Config) {
    if (config.ionAccessToken) Ion.defaultAccessToken = config.ionAccessToken
    // 初始化 Dom 节点
    prepareContainer(resolveContainer(container))


    
    // 载入用户手动定义的 Viewer3D 属性
    const viewerConstructorOptions = {
        ...getDefaultViewerOptions(),
        ...viewerOptions,
    }
    CreditDisplay.cesiumCredit = new Credit('')
    const viewer = new Viewer(container, viewerConstructorOptions)
    initViewerState(viewer, config)

    return viewer
}

