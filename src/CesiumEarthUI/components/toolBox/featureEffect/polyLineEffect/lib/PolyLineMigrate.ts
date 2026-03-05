import CesiumEarth from "@/lib/CesiumEarth"
import { Cartesian3, Color, Cartographic, Ellipsoid, CatmullRomSpline, Entity, Viewer } from "cesium"

const center = [108.46928783982952, 32.70464826786063]
let lines: Entity[] = []

function addPolylines(viewer: Viewer, center: any, radius: any, steps: any) {
  const circlePoints = generateCirclePoints(center, radius, steps) //圆周边坐标
  const startP = Cartesian3.fromDegrees(center[0], center[1], center[2] || 0)
  let endP
  let positions
  const material = new CesiumEarth.Material.Polyline.PolylineLinkPulseMaterial({
    color: new Color(1, 0.79, 0.15, 1),
    duration: 2000,
    //url: "../img/迁徙线材质.png",
  })
  let line
  circlePoints.forEach((item) => {
    endP = Cartesian3.fromDegrees(item[0]!, item[1]!, 0)
    positions = generateCurve(startP, endP)
    line = viewer.entities.add({
      polyline: {
        positions: positions,
        width: 2,
        material: material, // Color.RED
      },
    })
    lines.push(line)
  })
}

//生成流动曲线 传入起点和终点
function generateCurve(startPoint: Cartesian3, endPoint: Cartesian3) {
  const addPointCartesian = new Cartesian3()
  Cartesian3.add(startPoint, endPoint, addPointCartesian)
  const midPointCartesian = new Cartesian3()
  Cartesian3.divideByScalar(addPointCartesian, 2, midPointCartesian)
  const midPointCartographic = Cartographic.fromCartesian(midPointCartesian)
  midPointCartographic.height = Cartesian3.distance(startPoint, endPoint) / 5
  const midPoint = new Cartesian3()
  Ellipsoid.WGS84.cartographicToCartesian(midPointCartographic, midPoint)

  const spline = new CatmullRomSpline({
    times: [0.0, 0.5, 1.0],
    points: [startPoint, midPoint, endPoint],
  })

  const curvePoints = []
  for (let i = 0, len = 200; i < len; i++) {
    curvePoints.push(spline.evaluate(i / len))
  }
  return curvePoints
}

//生成圆上的终点坐标
function generateCirclePoints(center: any[], radius: any, steps: number) {
  const points = []
  const num = 360 / steps
  for (let i = 0; i <= 360; i += num) {
    points.push(getCirclePoint(center[0]!, center[1]!, i, radius))
  }
  return points
}

function getCirclePoint(lon: number, lat: number, angle: number, radius: number) {
  const dx = radius * Math.sin((angle * Math.PI) / 180.0)
  const dy = radius * Math.cos((angle * Math.PI) / 180.0)
  const ec = 6356725 + ((6378137 - 6356725) * (90.0 - lat)) / 90.0
  const ed = ec * Math.cos((lat * Math.PI) / 180)
  const newLon = ((dx / ed + (lon * Math.PI) / 180.0) * 180.0) / Math.PI
  const newLat = ((dy / ec + (lat * Math.PI) / 180.0) * 180.0) / Math.PI
  return [newLon, newLat]
}

//移除迁徙线
function removeMigrateLines(viewer: Viewer) {
  for (let i = 0; i < lines.length; i++) {
    viewer.entities.remove(lines[i]!)
  }
}

function addMigrateLines(viewer: Viewer) {
  if (lines.length != 0) {
    removeMigrateLines(viewer)
  }
  addPolylines(viewer, center, 20000, 30)
}
export { addMigrateLines, removeMigrateLines }
