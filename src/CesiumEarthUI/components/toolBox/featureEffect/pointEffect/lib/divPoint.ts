import CesiumEarth from "@/lib/CesiumEarth"
import { Viewer, Cartesian3 } from "cesium"

export default function (viewer: Viewer, position: any, dom: any, data: any) {
  divText(viewer, position, dom, data)
}

//div文本
function divText(viewer: Viewer, position: any, dom: any, data: any) {
  dom.innerHTML = '<div style="color:#FFFFFF; text-align: center">DIV文本</div>'
  dom.style.width = '200px'
  dom.style.height = '100px'

  data.point1 = new CesiumEarth.SuperiorEntity.DivPoint(
    viewer,
    {
      longitude: position[0],
      latitude: position[1],
    },
    dom,
  )
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(108.9585, 34.2191, 2000),
  })
  data.point1.init()
}
