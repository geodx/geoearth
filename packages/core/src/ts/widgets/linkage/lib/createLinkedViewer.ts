import { SceneMode } from 'cesium'
import type { LinkedEarthFactory, LinkedViewHost, LinkedViewOptions } from '../types'
import type { Config } from '../../../config/types'

export function createLinkedViewer(container: HTMLElement, main: LinkedViewHost, options: LinkedViewOptions, factory: LinkedEarthFactory) {
    const mainConfig = main.config.getConfig()
    const baseImagery = main.config.getBaseImagery()

    const config: Config = {
        ionAccessToken: mainConfig.ionAccessToken,
        homeView: { ...mainConfig.homeView },

        resources: {
            imagery: baseImagery ? [baseImagery] : [],
            terrains: [],
            models: [],
            tilesets: [],
            geojson: [],
            poi: [],
        },

        ...options.config,

        startup: {
            ...mainConfig.startup,
            ...options.config?.startup,
            animation: false,
        },
    }

    return factory(
        container,
        {
            sceneMode: options.sceneMode === '3D'
                ? SceneMode.SCENE3D
                : SceneMode.SCENE2D,
            scene3DOnly: false,
            requestRenderMode: true,
            maximumRenderTimeChange: Number.POSITIVE_INFINITY,
        },
        config,
    )
}