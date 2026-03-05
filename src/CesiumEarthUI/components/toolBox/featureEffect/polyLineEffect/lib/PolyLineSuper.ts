import CesiumEarth from "@/lib/CesiumEarth"
import { Color, Cartesian3, Viewer, Entity } from "cesium"

let Lines2: Entity[] = []

function addSuperLines(viewer: Viewer) {
  if (Lines2.length != 0) {
    removeSuperLines(viewer)
  }
  addPolylines2(viewer)
}

function addPolylines2(viewer: Viewer) {
  const startPoint = [107.49513624186937, 32.49553275545226]

  let endPoint = [107.30935689944125, 32.54472678880789]
  let positions = parabola(startPoint, endPoint, 10000)
  Lines2.push(addPolyline2(viewer, positions.reverse(), Color.LIME, 1))

  endPoint = [107.46416226494048, 32.67147714786316]
  positions = parabola(startPoint, endPoint, 10000)
  Lines2.push(addPolyline2(viewer, positions.reverse(), Color.AQUA, 2))

  endPoint = [107.64211725637196, 32.514206122678985]
  positions = parabola(startPoint, endPoint, 10000)
  Lines2.push(addPolyline2(viewer, positions.reverse(), Color.RED, 1))

  endPoint = [107.4979523604535, 32.294999534056544]
  positions = parabola(startPoint, endPoint, 10000)
  Lines2.push(addPolyline2(viewer, positions.reverse(), Color.YELLOW, 2))
}

function addPolyline2(viewer: Viewer, positions: Cartesian3[], color: Color, count: number | undefined) {
  const line2 = viewer.entities.add({
    polyline: {
      positions: positions,
      width: 15,
      material: new CesiumEarth.Material.Polyline.PolylineSuperMaterial({
        color: color,
        duration: 2000,
        repeatCount: count || 1,
        url: new URL('./超级线材质02.png', import.meta.url).href,
      }),
    },
  })
  return line2
}

function removeSuperLines(viewer: Viewer) {
  for (let i = 0; i < Lines2.length; i++) {
    viewer.entities.remove(Lines2[i]!)
  }
}
//=================贝塞尔曲线开始===============

// 贝塞尔曲线二维转三维  返回一个三维点数组
// 参数： x1,y1,x2,y2,h 两点经纬度坐标和飞线高度
function parabola(startPoint: number[], endPoint: number[], height: number, count?: number) {
  const points = getBSRPoints(startPoint[0]!, startPoint[1]!, endPoint[0]!, endPoint[1]!, height, count)
  const degreesArrayHeights: number[] = []
  for (const i in points) {
    const point = points[i]
    if (point) {
      degreesArrayHeights.push(point[0]!)
      degreesArrayHeights.push(point[1]!)
      degreesArrayHeights.push(point[2]!)
    }
  }
  return Cartesian3.fromDegreesArrayHeights(degreesArrayHeights)
}

function getBSRPoints(x1: number, y1: number, x2: number, y2: number, h: number, count: number | undefined) {
  const point1 = [y1, 0]
  const point2 = [(y2 + y1) / 2, h]
  const point3 = [y2, 0]
  const arr = getBSR(point1, point2, point3, count)
  const arr3d = []
  for (const i in arr) {
    const x = ((x2 - x1) * (arr[i]![0]! - y1)) / (y2 - y1) + x1
    arr3d.push([x, arr[i]![0], arr[i]![1]! + 1500]) //调整超级线的高度 +10000
  }
  return arr3d
}

// 生成贝塞尔曲线
function getBSR(point1: number[], point2: number[], point3: number[], count: number | undefined) {
  const ps = [
    { x: point1[0]!, y: point1[1]! },
    { x: point2[0]!, y: point2[1]! },
    { x: point3[0]!, y: point3[1]! },
  ]
  const guijipoints = CreateBezierPoints(ps, count || 100)
  return guijipoints
}

// 贝赛尔曲线算法
// 参数：
// anchorpoints: [{ x: 116.30, y: 39.60 }, { x: 37.50, y: 40.25 }, { x: 39.51, y: 36.25 }]
function CreateBezierPoints(anchorpoints: { x: number, y: number }[], pointsAmount: number) {
  var points = []
  for (var i = 0; i < pointsAmount; i++) {
    var point = MultiPointBezier(anchorpoints, i / pointsAmount)
    points.push([point.x, point.y])
  }
  return points
}

function MultiPointBezier(points: { x: number, y: number }[], t: number) {
  var len = points.length
  var x = 0,
    y = 0
  var erxiangshi = function (start: number, end: number) {
    var cs = 1,
      bcs = 1
    while (end > 0) {
      cs *= start
      bcs *= end
      start--
      end--
    }
    return cs / bcs
  }
  for (var i = 0; i < len; i++) {
    const point = points[i]
    if (point) {
      x += point.x * Math.pow(1 - t, len - 1 - i) * Math.pow(t, i) * erxiangshi(len - 1, i)
      y += point.y * Math.pow(1 - t, len - 1 - i) * Math.pow(t, i) * erxiangshi(len - 1, i)
    }
  }
  return { x: x, y: y }
}

export { addSuperLines, removeSuperLines }
