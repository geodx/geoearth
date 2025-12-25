import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, data: any) {
    dynamicDivLabel(viewer, position, data);
}

//动态文本标记
function dynamicDivLabel(viewer: Viewer, position: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9598, 34.2185, 1000)
    });
    data.point10 = new CesiumEarth.SuperiorEntity.DynamicDivLabel(viewer, {
        longitude: position[0],
        latitude: position[1]
    }, '动态文本');
    data.point10.init();
}
