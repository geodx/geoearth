import CesiumEarth from "@/lib/CesiumEarth";
import { Viewer, Cartesian3 } from "cesium";

export default function (viewer: Viewer, position: any, dom: any, data: any) {
    liquidFill(viewer, position, dom, data);
}

//水球图
function liquidFill(viewer: Viewer, position: any, dom: any, data: any) {
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(108.9605, 34.2195, 1000)
    });
    dom.innerHTML = '<div>水球图</div>';
    dom.style.width = '200px';
    dom.style.height = '100px';

    data.point8 = new CesiumEarth.SuperiorEntity.Liquidfill(viewer,
        {
            longitude: position[0]!,
            latitude: position[1]
        },
        0.51
    );
    data.point8.init();
}