import "./styles/cesium-navigation.css"
import * as Cesium from 'cesium';
import DistanceLegendViewModel from "./viewModels/DistanceLegendViewModel";
import NavigationViewModel from "./viewModels/NavigationViewModel";
import type NavigationControl from "./controls/NavigationControl";

interface NavigationOptions {
    // 用于在使用重置导航重置地图视图时设置默认视图控制。接受的值是Cesium.Cartographic 和 Cesium.Rectangle.
    defaultResetView?: Cesium.Cartographic
    // 用于启用或禁用罗盘。true是启用罗盘，false是禁用罗盘。默认值为true。如果将选项设置为false，则罗盘将不会添加到地图中。
    enableCompass?: boolean
    // 用于启用或禁用缩放控件。true是启用，false是禁用。默认值为true。如果将选项设置为false，则缩放控件将不会添加到地图中。
    enableZoomControls?: boolean
    // 用于启用或禁用距离图例。true是启用，false是禁用。默认值为true。如果将选项设置为false，距离图例将不会添加到地图中。
    enableDistanceLegend?: boolean
    // 用于启用或禁用指南针外环。true是启用，false是禁用。默认值为true。如果将选项设置为false，则该环将可见但无效。
    enableCompassOuterRing?: boolean
    //修改重置视图的tooltip
    resetTooltip?: string
    //修改放大按钮的tooltip
    zoomInTooltip?: string;
    //修改缩小按钮的tooltip
    zoomOutTooltip?: string

    compassOuterRingSvg?: string
    compassRotationMarkerSvg?: string
    compassGyroSvg?: string
    //自定义按钮
    resetSvg?: string
    zoomInSvg?: string
    zoomOutSvg?: string
}
export interface Terria {
    viewerWidget: Cesium.Viewer | Cesium.CesiumWidget;
    options: NavigationOptions;
    afterWidgetChanged: Cesium.Event;
    beforeWidgetChanged: Cesium.Event;
    trackedEntity?: Cesium.Entity;
    container?: HTMLElement;
    controls?: NavigationControl[];
}
class CesiumNavigation {
    private viewerCesiumWidget: Cesium.Viewer | Cesium.CesiumWidget;
    private options: NavigationOptions;
    private distanceLegendViewModel: DistanceLegendViewModel | undefined;
    /**
     * @alias CesiumNavigation
     * @constructor
     *
     * @param {Viewer|CesiumWidget} viewerWidget The Viewer or CesiumWidget instance
     * @param {NavigationOptions} options
     */
    constructor(viewerWidget: Cesium.Viewer | Cesium.CesiumWidget, options: NavigationOptions) {
        this.viewerCesiumWidget = viewerWidget;
        this.options = {
            enableCompass: true,
            enableZoomControls: true,
            enableDistanceLegend: true,
            enableCompassOuterRing: true,
            ...options
        };
        this.initialize();
    }

    private initialize() {
        if (!Cesium.defined(this.viewerCesiumWidget)) {
            throw new Error('CesiumWidget or Viewer is required.')
        }
        this.viewerCesiumWidget.camera.percentageChanged = 0.05;
        const container = document.createElement('div')
        container.className = 'cesium-widget-cesiumNavigationContainer'
        container.oncontextmenu = (e: Event) => e.preventDefault();// 禁用右键菜单
        this.viewerCesiumWidget.container.appendChild(container)
        const terria: Terria = {
            viewerWidget: this.viewerCesiumWidget,
            options: this.options,
            afterWidgetChanged: new Cesium.Event(),
            beforeWidgetChanged: new Cesium.Event(),
        }
        // 距离图例
        if (this.options.enableDistanceLegend) {
            const distanceLegendDiv = document.createElement('div')
            distanceLegendDiv.setAttribute('id', 'distanceLegendDiv')
            container.appendChild(distanceLegendDiv)
            terria.container = distanceLegendDiv
            this.distanceLegendViewModel = DistanceLegendViewModel.create(terria)
        }
        if (this.options.enableZoomControls || this.options.enableCompass) {
            const navigationDiv = document.createElement('div')
            navigationDiv.setAttribute('id', 'navigationDiv')
            container.appendChild(navigationDiv)
            terria.container = navigationDiv
            // Create the navigation controls.
            const navigationViewModel = NavigationViewModel.create(terria)
        }

    }

    public destroy() {
        if (this.distanceLegendViewModel) {
            this.distanceLegendViewModel.destroy();
        }
    }
}


export default CesiumNavigation