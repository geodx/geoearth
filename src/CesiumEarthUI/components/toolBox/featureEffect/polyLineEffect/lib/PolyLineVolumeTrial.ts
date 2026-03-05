import CesiumEarth from "@/lib/CesiumEarth"
import { Cartesian3, CornerType, Color, Cartesian2, Entity, Viewer, Math as CesiumMath } from "cesium"

let polylineVolume: Entity

function addVolumeTrialLines(viewer: Viewer) {
  if (polylineVolume != null) {
    removeVolumeTrial(viewer)
  }
  addPolyline(viewer)
}

//加载线数据
function addPolyline(viewer: Viewer) {
  const positions = [
    108.23763469744148, 32.52440280702285, 1500, 108.2411189854394, 32.38674431239255, 1500,
    108.33331294312102, 32.410297698976315, 1500,
  ]

  polylineVolume = viewer.entities.add({
    polylineVolume: {
      positions: Cartesian3.fromDegreesArrayHeights(positions),
      shape: computeCircle(600.0),
      cornerType: CornerType.MITERED,
      material: new CesiumEarth.Material.Polyline.PolylineVolumeTrialMaterial({
        color: Color.BLUE,
        duration: 5000,
        count: 15,
        //url: "/static/images/polylinematerial/spriteline2.png"
      }),
    },
  })
  viewer.flyTo(polylineVolume)
}

function computeCircle(radius: number) {
  let positions = []
  for (let i = 0; i < 360; i += 1) {
    const radians = CesiumMath.toRadians(i)
    positions.push(new Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)))
  }
  return positions
}

function removeVolumeTrial(viewer: Viewer) {
  viewer.entities.remove(polylineVolume)
}
export { addVolumeTrialLines, removeVolumeTrial }
