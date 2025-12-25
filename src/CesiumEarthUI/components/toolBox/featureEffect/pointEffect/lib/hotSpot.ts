import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, dom: any, data: any) {
    hotSpot(viewer, position, dom, data);
}

//热点面板文本点
function hotSpot(viewer: Viewer, position: any, dom: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9605, 34.2193, 1000)
    });

    dom.innerHTML = '<div style="color:#FFFFFF; text-align: center">热点面板</div>';
    dom.style.width = '200px';
    dom.style.height = '100px';

    data.point4 = new CesiumEarth.SuperiorEntity.HotSpotBoardPoint(
        viewer,
        {
            longitude: position[0],
            latitude: position[1]
        },
        dom
    );
    data.point4.init();
}