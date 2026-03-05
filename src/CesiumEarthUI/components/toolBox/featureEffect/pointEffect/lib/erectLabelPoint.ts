import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, dom: any, data: any) {
    erectLabelPoint(viewer, position, dom, data);
}

//竖立文本标注点
function erectLabelPoint(viewer: Viewer, position: any, dom: any, data: any) {
    // dom.innerHTML = '<div>竖立文本</div>';
    // dom.style.width = '200px';
    // dom.style.height = '100px';
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.959, 34.2197, 1000)
    });
    data.point3 = new CesiumEarth.SuperiorEntity.ErectLabelPoint(
        viewer,
        {
            longitude: position[0],
            latitude: position[1]
        },
        "竖立文本"
    );
    data.point3.init();
}