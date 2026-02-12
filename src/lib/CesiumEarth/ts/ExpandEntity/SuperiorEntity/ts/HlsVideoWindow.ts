// HlsVideoWindow.ts
import * as Cesium from "cesium";

declare const Lo: any;          // 你们封装的事件系统：Lo.screenEvent
declare const rc: { uuid: () => string }; // 你们的uuid
declare function La(lon: number, lat: number): Promise<number>; // 采样地形高
declare function oC(): string | HTMLCanvasElement; // billboard图标
declare global {
    interface Window {
        videojs: any;
    }
}

export interface LonLatHeight {
    longitude: number;
    latitude: number;
    height?: number; // 允许缺省，缺省则采样地形高
}

export interface HlsVideoInfo {
    id?: string;
    name?: string;
    url: string; // HLS m3u8
    position: LonLatHeight;
    title: string
}

export class HlsVideoWindow {
    public readonly viewer: Cesium.Viewer;
    public videoInfo: HlsVideoInfo;

    /** 以Cartographic存一份位置 */
    private position: Cesium.Cartographic;

    /** 点击用的实体(一个billboard) */
    private entity?: Cesium.Entity;

    /** 是否已关闭/销毁窗体(DOM) */
    private isDestroyWindow = false;

    /** 你们封装的屏幕事件 */
    private readonly screenEvent: any;

    /** DOM容器 */
    private containerDom?: HTMLDivElement;
    private popup3dDom?: HTMLDivElement;

    /** videojs实例 */
    private player?: any;

    /** 避免重复绑定点击事件 */
    private clickBound = false;

    constructor(viewer: Cesium.Viewer, videoInfo: HlsVideoInfo) {
        this.viewer = viewer;
        this.videoInfo = videoInfo;

        this.position = Cesium.Cartographic.fromDegrees(
            videoInfo.position.longitude,
            videoInfo.position.latitude,
            videoInfo.position.height ?? 0,
        );

        if (!this.videoInfo.id) {
            this.videoInfo.id = "HlsVideoWindow" + rc.uuid();
        }

        this.screenEvent = Lo.screenEvent;
    }

    /**
     * 初始化/准备实体+绑定点击
     * 原代码：load()里既创建entity又绑定点击
     */
    async load(): Promise<void> {
        // 确保有entity
        if (!this.entity) {
            const dummyPos = new Cesium.Cartesian3(); // 原逻辑：先给个0向量占位
            this.entity = this.viewer.entities.add({
                id: this.videoInfo.id!,
                name: this.videoInfo.name,
                position: dummyPos,
                billboard: {
                    image: oC(),
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                },
            });
        }

        // 如果没高度：采样地形高并回填
        if (!this.position.height) {
            const h = await La(this.videoInfo.position.longitude, this.videoInfo.position.latitude);

            this.position = Cesium.Cartographic.fromDegrees(
                this.videoInfo.position.longitude,
                this.videoInfo.position.latitude,
                h,
            );

            const cart = Cesium.Cartesian3.fromDegrees(
                this.videoInfo.position.longitude,
                this.videoInfo.position.latitude,
                h,
            );

            // entity.position在Cesium里通常是Property，这里按你原代码直接赋值
            (this.entity as any).position = cart;
        }

        // 绑定点击(你原代码：screenEvent.addEventListener(2,1,...))
        // 我这里保留，但避免重复绑定
        if (!this.clickBound) {
            this.screenEvent.addEventListener(2, 1, this.clickEntity.bind(this));
            this.clickBound = true;
        }
    }

    /**
     * 点击事件回调：pick到的entity.id.id匹配videoInfo.id则打开窗体
     * 原代码：this.viewer.scene.pick(d.position)?.id?.id
     */
    private clickEntity(evt: any) {
        if (!evt?.position) return;

        const pickedId = (this.viewer.scene.pick(evt.position) as any)?.id?.id;
        if (pickedId && pickedId === this.videoInfo.id) {
            void this.init();
        }
    }

    /**
     * 打开窗口：先关旧的，再创建DOM，(原逻辑里会再次await load)，再绑定postRender
     */
    async init(): Promise<void> {
        this.closeWindow();
        this.createDom();

        // 原代码这里又load一次(会导致重复绑定点击)，我保留但上面加了clickBound防抖
        await this.load();

        this.addEvent();
        this.isDestroyWindow = false;
    }

    /** 创建DOM结构并挂到cesium容器 */
    private createDom() {
        const container = document.createElement("div");
        container.classList.add("video-popup3d-container");
        this.containerDom = container;

        // header
        const header = document.createElement("div");
        header.classList.add("video-popup3d-header");
        container.appendChild(header);

        const title = document.createElement("span");
        title.innerHTML = this.videoInfo.name;
        title.classList.add("video-popup3d-header-title");
        header.appendChild(title);

        const close = document.createElement("span");
        close.innerHTML = "×";
        close.classList.add("video-popup3d-close");
        header.appendChild(close);

        // body
        const body = document.createElement("div");
        body.classList.add("video-popup3d-body");
        container.appendChild(body);
        this.popup3dDom = body;

        // append
        this.viewer.cesiumWidget.container.append(container);

        close.onclick = () => this.closeWindow();

        this.createVideo();
    }

    /** 创建video元素并用videojs加载HLS */
    private createVideo() {
        if (!this.popup3dDom) return;

        const video = document.createElement("video");
        video.classList.add("video-js", "vjs-default-skin");
        video.setAttribute("controls", String(true));
        video.setAttribute("autoplay", "autoplay");
        video.setAttribute("preload", "auto");
        video.setAttribute("muted", String(true));

        this.popup3dDom.appendChild(video);

        const id = "vid" + Date.now();
        video.setAttribute("id", id);

        const player = window.videojs(id);
        player.ready(() => {
            const sources = [{ src: this.videoInfo.url, type: "application/x-mpegURL" }];
            player.src(sources);
            player.load();
        });

        this.player = player;
    }

    /** 绑定postRender：每帧更新窗体屏幕位置 */
    private addEvent() {
        this.viewer.scene.postRender.addEventListener(this.postRenderEvent, this);
    }

    /** postRender回调：窗口跟随经纬高投影到屏幕 */
    private postRenderEvent() {
        if (!this.containerDom) return;

        const canvasHeight = this.viewer.scene.canvas.height;
        const win = new Cesium.Cartesian2();

        const cart = Cesium.Cartesian3.fromDegrees(
            this.videoInfo.position.longitude,
            this.videoInfo.position.latitude,
            this.position.height,
        );

        Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, cart, win);

        this.containerDom.style.bottom =
            canvasHeight / window.devicePixelRatio - win.y + 80 + "px";
        this.containerDom.style.left = win.x + 20 + "px";
    }

    /** 关闭窗口：dispose播放器、解绑postRender、移除DOM */
    closeWindow() {
        if (this.isDestroyWindow) return;

        if (this.player) {
            this.player.dispose();
            this.player = undefined;
        }

        this.viewer.scene.postRender.removeEventListener(this.postRenderEvent, this);

        if (this.containerDom) {
            this.containerDom.remove();
            this.containerDom = undefined;
            this.popup3dDom = undefined;
        }

        this.isDestroyWindow = true;
    }

    /** 销毁：关闭窗口+移除实体 */
    destroy() {
        this.closeWindow();
        if (this.entity) this.viewer.entities.remove(this.entity);
        this.entity = undefined;
    }
}
