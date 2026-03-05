import CesiumEarth from "@/lib/CesiumEarth"
import { Viewer, Cartesian3 } from "cesium"

export default function (viewer: Viewer, position: any, dom: any, data: any) {
  simpleLabel(viewer, position, dom, data)
}

//简单标注点
function simpleLabel(viewer: Viewer, position: any, dom: any, data: any) {
  dom.innerHTML = '<div>简单标注</div>'
  dom.style.width = '200px'
  dom.style.height = '100px'

  data.point2 = new CesiumEarth.SuperiorEntity.SampleLablePoint(
    viewer,
    { longitude: position[0], latitude: position[1], },
    dom,
  )
  data.point2.init()
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(108.96, 34.22, 1000),
  })
}
