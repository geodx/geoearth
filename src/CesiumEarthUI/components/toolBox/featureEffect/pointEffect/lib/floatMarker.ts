import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, data: any) {
    floatMarker(viewer, position, data);
}

//浮动点
function floatMarker(viewer: Viewer, position: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9605, 34.219, 1000)
    });
    data.point9 = new CesiumEarth.SuperiorEntity.FloatMarker(
        viewer,
        {
            longitude: position[0],
            latitude: position[1]
        }
    );
    data.point9.init();
}