import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, dom: any, data: any) {
    hlsVideo(viewer, position, dom, data);
}

//hls视频窗口点
function hlsVideo(viewer: Viewer, position: any, dom: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9588, 34.2189, 1000)
    });
    let monitor = {
        id: '51616161',
        name: 'Hls监控1',
        url: 'http://220.161.87.62:8800/hls/0/index.m3u8',
        position: {
            longitude: position[0],
            latitude: position[1]
        }
    };
    data.hls = new CesiumEarth.SuperiorEntity.HlsVideoWindow(viewer, monitor);
    data.hls.init();

}