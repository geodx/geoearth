import { ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium';

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
import { CesiumDateFormatter, CesiumTimeFormatter } from './lib/locale-zh';
import { AsyncTool } from '../Utils';
import { debugManage } from './lib/deBugManage/debugManage';
import { OverviewMap } from './lib/overview/OverviewMap';
import { createOverview } from './lib/overview/createOverview';
import { createNavigation } from './lib/createNavigation';

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
    public viewer3D: Viewer;
    public viewer3DWorkSpace: WorkSpace;
    private viewerOM: any

    private loadComplete: boolean = false;
    private overviewMap: OverviewMap | undefined;
    private startAnimation: StartAnimation;
    public drawShape: DrawShape;
    // 默认生成的量测工具
    public measureTool: MeasureTool;
    private isOpenOverviewMap: boolean = false;

    private infoBox: InfoBox;


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
        this.viewer3D.resolutionScale = window.devicePixelRatio;
        this.drawShape = new DrawShape(this.viewer3D);
        this.measureTool = new MeasureTool(this.viewer3D);
        this.infoBox = new InfoBox(this.viewer3D);

        // 调整鼠标滚轮缩放速度，默认为 5，太快了
        this.viewer3D.scene.screenSpaceCameraController.zoomFactor = 3;

        if (this.viewer3D.animation) {
            this.viewer3D.animation.viewModel.dateFormatter = CesiumDateFormatter;
            this.viewer3D.animation.viewModel.timeFormatter = CesiumTimeFormatter;
        }
        // if (this.viewer3D.timeline) {
        // this.viewer3D.timeline.makeLabel = CesiumDateTimeFormatter;
        // }
    }

    // 初始化屏幕事件
    private initViewer3DScreenEvent() {
        const viewer = this.viewer3D;
        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

        const values: ListenType.ScreenSpaceEventType[] = Object.values(ListenType.ScreenSpaceEventType).filter((v): v is number => typeof v === 'number')
        values.forEach(value => {
            handler.setInputAction((movement: ScreenSpaceEventType) => {
                EventManage.screenEvent.raiseEvent(value, ScopeType.global, movement);
                EventManage.screenEvent.raiseEvent(value, ScopeType.Viewer3D, movement);
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
        debugManage.getFPS();
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

    // 创建指北针
    createNavigation() {
        createNavigation(this.viewer3D);
    };
}

export { Earth };


