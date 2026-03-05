import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, data: any) {
    primitiveLabelCol(viewer, position, data);
}


//图标+文字
function primitiveLabelCol(viewer: Viewer, position: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9595, 34.2198, 1000)
    });

    data.point7 = new CesiumEarth.SuperiorEntity.PrimitiveLabelCol(viewer);
    data.point7._add(position, '大雁塔', new URL('../img/mark3.png', import.meta.url).href);
}
