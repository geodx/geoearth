import * as Cesium from 'cesium';
import type { Terria } from '..';

/** 预定义距离刻度 */
const distances: number[] = [
  1, 2, 3, 5,
  10, 20, 30, 50,
  100, 200, 300, 500,
  1000, 2000, 3000, 5000,
  10000, 20000, 30000, 50000,
  100000, 200000, 300000, 500000,
  1000000, 2000000, 3000000, 5000000,
  10000000, 20000000, 30000000, 50000000,
]

/** 全局的测地线对象，避免每次重复创建 */
const geodesic = new Cesium.EllipsoidGeodesic()

class DistanceLegendViewModel {
  // ==================== 公有属性 ====================
  public distanceLabel?: string
  public barWidth?: number

  // ==================== 私有字段 ==================== 
  private readonly enableDistanceLegend: boolean
  private readonly eventHelper: Cesium.EventHelper
  private root: HTMLElement;
  private labelEl: HTMLElement;
  private barEl: HTMLElement;

  private _removeSubscription?: () => void
  private _lastLegendUpdate = 0

  constructor(terria: Terria) {
    if (!Cesium.defined(terria) || !Cesium.defined(terria.viewerWidget)) {
      throw new Cesium.DeveloperError('viewer is required.')
    }
    this.enableDistanceLegend = Cesium.defined(terria.options.enableDistanceLegend) ? terria.options.enableDistanceLegend : true
    this.root = document.createElement('div');
    this.labelEl = document.createElement('div');
    this.barEl = document.createElement('div');
    this.eventHelper = new Cesium.EventHelper()
    this.eventHelper.add(terria.afterWidgetChanged, () => {
      if (this._removeSubscription) {
        this._removeSubscription()
        this._removeSubscription = undefined
      }
    }, this)

    const addUpdateSubscription = () => {
      var scene = terria.viewerWidget.scene
      this._removeSubscription = scene.camera.changed.addEventListener(() =>
        this.updateDistanceLegendCesium(scene)
      )
    }
    addUpdateSubscription()

    // 当 widget 再次切换时重新订阅
    this.eventHelper.add(terria.afterWidgetChanged, addUpdateSubscription, this)

  }

  /** 销毁资源 */
  public destroy(): void {
    this.eventHelper.removeAll()
    if (this._removeSubscription) {
      this._removeSubscription()
    }
  }

  /** 把模板渲染到指定容器 */
  public show(container: HTMLElement) {
    this.root.className = 'distance-legend';
    this.labelEl.className = 'distance-legend-label';
    this.barEl.className = 'distance-legend-scale-bar';
    this.root.appendChild(this.labelEl);
    this.root.appendChild(this.barEl);
    // 插入到容器
    container.appendChild(this.root);
    // 隐藏初始状态
    // this.setVisible(false);
  }
  public static create(terria: Terria): DistanceLegendViewModel {
    const result = new DistanceLegendViewModel(terria)
    result.show(terria.container!)
    return result
  }
  private setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }
  /**
 * 每帧更新距离比例尺的核心逻辑
 */
  private updateDistanceLegendCesium(scene: Cesium.Scene) {
    if (!this.enableDistanceLegend) {
      this.barWidth = undefined
      this.distanceLabel = undefined
      return
    }
    var now = Cesium.getTimestamp()
    if (now < this._lastLegendUpdate + 250) {
      return
    }
    this._lastLegendUpdate = now

    // Find the distance between two pixels at the bottom center of the screen.
    const width = scene.canvas.clientWidth
    const height = scene.canvas.clientHeight

    const left = scene.camera.getPickRay(new Cesium.Cartesian2((width / 2) | 0, height - 1))
    const right = scene.camera.getPickRay(new Cesium.Cartesian2(1 + (width / 2) | 0, height - 1))
    const globe = scene.globe
    if (!left || !right) return
    const leftPosition = globe.pick(left, scene)
    const rightPosition = globe.pick(right, scene)
    if (!Cesium.defined(leftPosition) || !Cesium.defined(rightPosition)) {
      this.barWidth = undefined
      this.distanceLabel = undefined
      return
    }
    const leftCartographic = globe.ellipsoid.cartesianToCartographic(leftPosition)
    const rightCartographic = globe.ellipsoid.cartesianToCartographic(rightPosition)
    geodesic.setEndPoints(leftCartographic, rightCartographic)
    const pixelDistance = geodesic.surfaceDistance
    // Find the first distance that makes the scale bar less than 100 pixels.
    const maxBarWidth = 100
    let distance
    for (var i = distances.length - 1; !distance && i >= 0; --i) {
      if (distances[i]! / pixelDistance < maxBarWidth) {
        distance = distances[i]
      }
    }
    if (Cesium.defined(distance)) {
      let label
      if (distance >= 1000) {
        label = (distance / 1000).toString() + ' km'
      } else {
        label = distance.toString() + ' m'
      }

      this.barWidth = (distance / pixelDistance) | 0
      this.distanceLabel = label

      this.labelEl.textContent = label;
      this.barEl.style.width = `${this.barWidth}px`;
      this.barEl.style.left = `${5 + (125 - this.barWidth) / 2}px`;
    } else {
      this.barWidth = undefined
      this.distanceLabel = undefined
    }
  }


}



export default DistanceLegendViewModel
