import { ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer, CesiumWidget } from 'cesium';

import { DomManage } from './lib/DomManage';
import { getOptions3D } from './lib/getOptions3D';

import { EventManage } from '../EventManage';
import { ScopeType } from '../EventManage/impl/ScopeType';
import * as ListenType from '../EventManage/impl/ListenType';
import { initViewerStata } from './lib/initViewerStata';
import { WorkSpace } from '../WorkSpace';
import { ConfigTool } from '../Config';
import { loadSource3DData } from './lib/loadSource3DData';
import { StartAnimation } from './lib/StartAnimation';
import { DrawShape } from '../DrawShape';
import { MeasureTool } from '../MeasureTool';
import { InfoBox } from './lib/InfoBox';
import { CesiumDateFormatter, CesiumDateTimeFormatter, CesiumTimeFormatter } from './lib/locale-zh';
import { AsyncTool } from '../Utils';
import { debugManage } from './lib/deBugManage/debugManage';
import { OverviewMap } from './lib/overview/OverviewMap';
import { createOverview } from './lib/overview/createOverview';
import { createNavigation } from './lib/createNavigation';
import { initViewer2DStata } from './lib/initViewer2DStata';
import { getOptions2D } from './lib/getOptions2D';
import { sync2DView } from './lib/sync2DView';
import { loadSource2DData } from './lib/loadSource2DData';
import { initMonitorCoordinates } from './lib/initMonitorCoordinates';

/**
 * 名称：用于创建地球的构造类
 *
 * 描述：核心模块，用于创建地球的构造类
 *
 *
 * @remarks
 * 命名空间：CesiumEarth.Earth
 *
 * @example
 *
 * let earth = new CesiumEarth.Earth('MapContainer');
 * earth.openDeBug();
 * earth.createNavigation();
 *
 */
class Earth {
    // 场景中的主 Viewer 对象
    public viewer3D: Viewer;
    public viewer3DWorkSpace: WorkSpace;
    private viewerOM: CesiumWidget | undefined
    private viewer2D: Viewer | undefined;
    private viewer2DWorkSpace: WorkSpace | undefined;

    private is2D3D: boolean = false;
    private isOpenOverviewMap: boolean = false;
    private loadComplete: boolean = false;
    private overviewMap: OverviewMap | undefined;
    private startAnimation: StartAnimation;

    public drawShape: DrawShape;
    // 默认生成的量测工具
    public measureTool: MeasureTool;

    public infoBox: InfoBox;
    // 初始化坐标与高度的监听
    public initMonitorCoordinates = initMonitorCoordinates;

    /**
   * 创建新的 viewer 对象
   * @param domID     创建球的父容器（div 的 id）
   * @param option    viewer 的原参数，参照 new Cesium.Viewer(id,option)
   */
    constructor(domID: string, option = {}) {
        // 初始化 Dom 节点
        DomManage.initRootDom(domID);
        // 载入用户手动定义的 Viewer3D 属性
        const options = getOptions3D();
        Object.assign(options, option);

        this.viewer3D = new Viewer('viewer3DDom', options);
        this.initViewer3DScreenEvent();
        initViewerStata(this.viewer3D);

        EventManage.viewerEvent.raiseEvent(ListenType.ViewerEventType.init, ScopeType.Viewer3D, {});
        EventManage.viewerEvent.raiseEvent(ListenType.ViewerEventType.init, ScopeType.global, {});
        this.startAnimation = new StartAnimation(this.viewer3D)
        // 载入资源
        this.viewer3DWorkSpace = new WorkSpace(this.viewer3D, ScopeType.Viewer3D);
        loadSource3DData(this.viewer3D, this.viewer3DWorkSpace).then(() => {
            if (ConfigTool.config.startAnimation) {
                this.startAnimation.activate().then(() => {
                    this.loadComplete = true;
                });
            } else {
                this.loadComplete = true;
            }
        });

        this.viewer3D.scene.debugShowFramesPerSecond = true;
        // this.viewer3D.resolutionScale = window.devicePixelRatio;
        // this.drawShape = new DrawShape(this.viewer3D);
        // this.measureTool = new MeasureTool(this.viewer3D);
        // this.infoBox = new InfoBox(this.viewer3D);

        // // 调整鼠标滚轮缩放速度
        // this.viewer3D.scene.screenSpaceCameraController.zoomFactor = 3;

        // if (this.viewer3D.animation) {
        //     this.viewer3D.animation.viewModel.dateFormatter = CesiumDateFormatter;
        //     this.viewer3D.animation.viewModel.timeFormatter = CesiumTimeFormatter;
        // }
        // if (this.viewer3D.timeline) {
        //     (this.viewer3D.timeline as any).makeLabel = CesiumDateTimeFormatter;
        // }
    }

    // 初始化屏幕事件
    private initViewer3DScreenEvent() {
        const viewer = this.viewer3D;
        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

        const values: ListenType.ScreenSpaceEventType[] = Object.values(ListenType.ScreenSpaceEventType).filter((v): v is number => typeof v === 'number')
        values.forEach(value => {
            handler.setInputAction((eventType: ScreenSpaceEventType) => {
                EventManage.screenEvent.raiseEvent(value, ScopeType.global, eventType);
                EventManage.screenEvent.raiseEvent(value, ScopeType.Viewer3D, eventType);
            }, value);
        });
    }

    async thenLoadComplete() {
        while (!this.loadComplete) {
            await AsyncTool.sleep(500);
        }
        return true;
    }


    // 开启调试模式
    openDeBug() {
        this.thenLoadComplete().then(() => {
            debugManage.open();
        });
    }

    // 关闭调试模式
    closeDeBug() {
        debugManage.close();
    }

    getFPS() {
        return debugManage.getFPS();
    }

    // 开启鹰眼地图
    openOverviewMap() {
        DomManage.initOverviewMapDom();
        if (!this.viewerOM) {
            this.viewerOM = createOverview();
        }
        if (!this.overviewMap) {
            this.overviewMap = new OverviewMap(this.viewer3D, this.viewerOM);
        }
        this.isOpenOverviewMap = true;
    }

    // 关闭鹰眼地图
    closeOverviewMap() {
        if (this.overviewMap) {
            this.overviewMap.destroy();
            this.overviewMap = undefined;
        }
        this.isOpenOverviewMap = false;
        DomManage.closeOverviewMapDom();
    }

    // 开启 Cesium 二三维联动
    async openMapLink23d() {
        if (!this.viewer2D) {
            let viewer2D = new Viewer('viewer2DDom', getOptions2D());
            let workSpace = new WorkSpace(viewer2D, ScopeType.Viewer2D);

            initViewerStata(viewer2D);
            // 每次3D相机视图更改时应用我们的同步功能
            this.viewer3D.camera.changed.addEventListener(sync2DView(this.viewer3D, viewer2D));
            // 默认情况下，“camera.changed”事件将在相机更改50%时触发,为了使它更敏感，我们可以降低这种敏感度
            this.viewer3D.camera.percentageChanged = 0.01;
            initViewer2DStata(viewer2D);
            await loadSource2DData(viewer2D, workSpace);
            EventManage.viewerEvent.raiseEvent(ListenType.ViewerEventType.init, ScopeType.Viewer2D, {});

            this.viewer2DWorkSpace = workSpace;
            this.viewer2D = viewer2D;
            viewer2D.resolutionScale = window.devicePixelRatio;
        }
        DomManage.initCesiumMapLink23d();
    }

    /**
     * // 关闭 Cesium 二三维联动*/
    closeMapLink23d() {
        DomManage.closeCesiumMapLink23d();
    }
    // 切换显示隐藏 2D视图
    toggleMapLink23d() {
        this.is2D3D ? this.closeMapLink23d() : this.openMapLink23d();
        this.is2D3D = !this.is2D3D;
    }

    // 创建指北针
    createNavigation() {
        createNavigation(this.viewer3D);
    };

    destroy() {
        if (!this.viewer3D.isDestroyed()) this.viewer3D.destroy()
    }
}

export { Earth };


