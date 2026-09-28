import * as Cesium from 'cesium'

export interface GeoEarthViewerOptions {
    container: string | HTMLElement
    accessToken?: string
    terrain?: boolean
}

export class GeoEarthViewer {
    public readonly viewer: Cesium.Viewer

    constructor(options: GeoEarthViewerOptions) {
        if (options.accessToken) {
            Cesium.Ion.defaultAccessToken = options.accessToken
        }

        const creditContainer = document.createElement('div')
        creditContainer.style.display = 'none'
        document.body.appendChild(creditContainer)


        this.viewer = new Cesium.Viewer(options.container, {
            creditContainer,
            terrain: options.terrain ? Cesium.Terrain.fromWorldTerrain() : undefined,
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
        })
    }

    destroy() {
        if (!this.viewer.isDestroyed()) {
            this.viewer.destroy()
        }
    }
}