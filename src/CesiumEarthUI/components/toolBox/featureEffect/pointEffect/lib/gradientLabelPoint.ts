import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, dom: any, data: any) {
    gradientLabelPoint(viewer, position, dom, data);
}

//简单渐变标注
function gradientLabelPoint(viewer: Viewer, position: any, dom: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9595, 34.2205, 1000)
    });

    dom.innerHTML = '<div>渐变标注</div>';

    data.point5 = new CesiumEarth.SuperiorEntity.GradientLabelPoint(
        viewer,
        {
            longitude: position[0],
            latitude: position[1]
        },
        dom
    );
    data.point5.init();
}