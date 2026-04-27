// HlsVideoWindow.ts
import * as Cesium from "cesium";
import DomPointBase from "./base/DomPointBase";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import { nextTick } from "vue";
import type { WorldDegree } from "../../../Impl/Declare";
export interface HlsVideoInfo {
    id?: string;
    title?: string;
    url: string; // HLS m3u8
    position: WorldDegree;
    name?: string
}

export class HlsVideoWindow extends DomPointBase {

    public videoInfo: HlsVideoInfo;

    /** videojs实例 */
    private player?: Player;

    #boardVisible: boolean;
    #boardDom: HTMLElement | undefined;
    #bodyDom: HTMLElement | undefined;
    #pointDom: HTMLElement | undefined;
    #closeDom: HTMLElement | undefined;
    constructor(viewer: Cesium.Viewer, videoInfo: HlsVideoInfo, showEntityPoint: boolean = false) {
        super(viewer, videoInfo.position, showEntityPoint);
        this.videoInfo = videoInfo;
        this.#boardVisible = true;  // 控制面板显隐 
    }

    /**
     * @description: 初始化点位
     * @return {*}
     */
    public async init() {
        if (!this.isDestroy && !this.start) {
            this.start = true;
            this.position = await this.computePosition(
                this.viewer,
                this.worldDegrees
            );
            this.$container.style.display = "none";
            this.#addDom();
            this.#addPostRender();
            this.$container.style.display = "block";
        }
    }

    /**
     * @description: 添加DOM
     * @return {*}
     */
    #addDom() {
        const container = document.createElement("div");
        container.classList.add("video-label-point-container");
        // point
        const point = document.createElement("div");
        point.classList.add("video-label-point");
        container.appendChild(point);
        point.style.backgroundImage = `url(${new URL('../img/camera/bluecamera.png', import.meta.url).href})`;
        point.onclick = () => {
            this.#setBoardVisible(!this.#boardVisible);
        }
        // board
        const board = document.createElement("div");
        board.classList.add("video-label-board");
        container.appendChild(board);
        // board-container
        const boardContainer = document.createElement("div");
        boardContainer.classList.add("video-label-board-container");
        board.appendChild(boardContainer);
        // header
        const header = document.createElement("div");
        header.classList.add("video-label-header");
        boardContainer.appendChild(header);

        const title = document.createElement("span");
        title.innerHTML = this.videoInfo.name ?? "";
        title.classList.add("video-label-header-title");
        header.appendChild(title);

        const close = document.createElement("span");
        close.innerHTML = "×";
        close.classList.add("video-label-board-closeBtn");
        close.onclick = () => {
            this.#setBoardVisible(false);
        }
        header.appendChild(close);

        // body
        const body = document.createElement("div");
        body.classList.add("video-label-board-text");
        boardContainer.appendChild(body);
        // board-line
        const bodyLine = document.createElement("div");
        bodyLine.classList.add("video-label-board-line");
        bodyLine.style.backgroundImage = `url(${new URL('../img/sampleLabelPoint/pedestal.png', import.meta.url).href})`;
        board.appendChild(bodyLine);

        this.#pointDom = point;
        this.#boardDom = board
        this.#bodyDom = body
        this.#closeDom = close

        this.createVideo()

        this.$container.appendChild(container)
        this.viewer.cesiumWidget.container.appendChild(this.$container);

    }

    /** 创建video元素并用videojs加载HLS */
    private async createVideo() {
        const videoElement = document.createElement("video");
        videoElement.classList.add("video-js", "vjs-default-skin");
        videoElement.style.position = "relative";
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.controls = true;
        videoElement.autoplay = true;
        videoElement.preload = "auto";
        videoElement.muted = true;
        this.#bodyDom?.appendChild(videoElement);
        await nextTick();
        const player = videojs(videoElement, {}, () => {
            const sources = [{
                src: this.videoInfo.url,
                type: 'application/x-mpegURL'
            }];
            player.src(sources);
            player.play();
        });
        this.player = player;
    }
    /**
    * @description: 控制面板显隐，该面板仅为包含DOM的整个面板，会保留一个点用以控制重新打开
    * @param {boolean} show 是否显示
    * @return {*}
    */
    #setBoardVisible(show: boolean) {
        if (this.#boardDom) {
            this.#boardDom.style.display = show ? "block" : "none";
            this.#boardVisible = show;
        }
        show ? this.player?.play() : this.player?.pause();
    }

    /**
   * @description: 注册场景事件
   * @return {*}
   */
    #addPostRender() {
        this.postRender({ directionX: "left", directionY: "bottom" });
        this.viewer.scene.postRender.addEventListener(this.postRenderFunc, this);
    }

    /**
     * @description: 销毁点位
     * @return {*}
     */
    public destroy() {
        if (this.start && !this.isDestroy) {
            this.isDestroy = true;
            //移除事件监听
            this.viewer.scene.postRender.removeEventListener(this.postRenderFunc, this);
            //移除DOM点击事件  
            this.#pointDom!.onclick = null;
            this.#closeDom!.onclick = null;
            this.$container.remove();
            this.viewer.entities.remove(this.pointEntity);
            this.player?.dispose();
        }
    }
}
