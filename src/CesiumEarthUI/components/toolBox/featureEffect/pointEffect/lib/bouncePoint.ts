import CesiumEarth from "@/lib/CesiumEarth"
import { useEarthStore } from "@/stores/EarthStore"
import { Viewer, Cartesian3 } from "cesium"

const earthStore = useEarthStore()
export default function (data: any, viewer: Viewer) {
  addBounceMarkers(data, viewer)
}
//弹跳点
//初始化BounceMarker
function addBounceMarkers(data: any, viewer: Viewer) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(108.95942020820043, 34.21924059801738, 1000),
  })
  data.bMarkers = []
  let position = Cartesian3.fromDegrees(108.95850065559718, 34.21944714452281, -1)
  let bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position)
  data.bMarkers.push(bMarker)

  position = Cartesian3.fromDegrees(108.95909494633781, 34.219537169430744, -2)
  bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position)
  data.bMarkers.push(bMarker)

  position = Cartesian3.fromDegrees(108.95966728565314, 34.219028011091496, -3)
  bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position)
  data.bMarkers.push(bMarker)

  position = Cartesian3.fromDegrees(108.95941801151338, 34.21876373222085, -4)
  bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position)
  data.bMarkers.push(bMarker)

  position = Cartesian3.fromDegrees(108.95976447924141, 34.219705361971975, -2)
  bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position)
  data.bMarkers.push(bMarker)

  position = Cartesian3.fromDegrees(108.9604459582188, 34.219064731198834, -4)
  bMarker = new CesiumEarth.NormalEntity.bouncePoint(viewer, position, {
    //image: "static/images/marker/mark3.png",
    bounceHeight: 100, //高度
    increment: 0.05, //增量
  })
  data.bMarkers.push(bMarker)
}
