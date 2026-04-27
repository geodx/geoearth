import { VideoPlugin } from "@/lib/CesiumEarth/ts/cesium.earth";
import { Cartesian3, Viewer } from "cesium";

export default class VideoShed {
    viewer: Viewer;
    videoShed?: VideoPlugin.VideoShed;
    constructor(viewer: Viewer) {
        this.viewer = viewer;
    }
    init() {
        this.initVideoFuse();
    }

    initVideoFuse() {
        const videoEl = document.getElementById('testVideo') as HTMLVideoElement //播放成功的video标签
        // videoEl.src = "http://playertest.longtailvideo.com/adaptive/bipbop/gear4/prog_index.m3u8"
        videoEl.src = "/CesiumEarth/lukou.mp4";
        this.videoShed = new VideoPlugin.VideoShed(this.viewer, videoEl, {
            cameraPosition: Cartesian3.fromDegrees(121.53806, 29.87179, 48.5), //摄像机位置
            //旋转参数
            rotation: {
                heading: -17,
                pitch: -69,
                roll: 0
            },
            near: 0.1,
            far: 240, //距离
            fov: 12, //张角
            aspectRatio: 1,
            alpha: 1, //透明
            debugFrustum: true //是否显示投影线
        });
        this.videoShed.init()
    }

    getStyle() {
        return this.videoShed?.styleOptions
    }

    upData(option: any) {
        this.videoShed?.updateStyle(option);
    }

    openViedo(value: boolean) {
        // if (value === true) {
        //     this.videoShed?.activeVideo();
        // } else {
        //     this.videoShed?.deActiveVideo();
        // }
    }

    destroy() {
        this.videoShed && this.videoShed.destroy();
    }

    openLine(option: boolean) {
        // this.videoShed?.setFrustumVisible(option);
    }
}
