import { Color, DistanceDisplayCondition, Cartesian2 } from "cesium"

// 根据多边形、多折线的端点创建虚拟点
function buildVirtualPoint(dynamicPositions: any, properties: any) {
  return {
    id: properties.id,
    position: dynamicPositions,
    point: {
      pixelSize: 12,
      color: Color.RED,
      outlineColor: Color.BROWN,
      outlineWidth: 2,
      distanceDisplayCondition: new DistanceDisplayCondition(0, 15000000),
    },
    label: {
      text: properties.id + '',
      font: '14pt monospace',
      pixelOffset: new Cartesian2(0, -18),
      distanceDisplayCondition: new DistanceDisplayCondition(0, 15000000),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  }
}

export default buildVirtualPoint
