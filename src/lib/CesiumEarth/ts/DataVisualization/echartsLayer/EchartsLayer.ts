import { Viewer, Math, Cartesian3, SceneMode } from "cesium";
import * as echarts from "echarts"

/**
 * @class echarts可视化
 **/
export class EchartsLayer {
  private _viewer: Viewer;
  private visible: boolean;
  private chartOption: any;
  private box: HTMLElement | undefined;
  private chart: echarts.ECharts | undefined;

  /**
   * @constructor
   * @param { Viewer } viewer 当前视图
   * @param { any } option echarts实例的配置项
   */
  constructor(viewer: Viewer, option: any) {
    this._viewer = viewer;
    this.visible = true;
    //注册坐标系
    echarts.registerCoordinateSystem('cesium', this.getE3CoordinateSystem(viewer));
    this.createLayer();
    this.setChartOption(option);
  }

  //配置echarts图层
  private setChartOption(option: any) {
    this.chartOption = option;
    this.setCharts();
  }

  private setVisible(isVisible: boolean) {
    if (!this.box || this.visible === isVisible) return;
    this.box.hidden = !isVisible;
    this.visible = isVisible;
    if (isVisible) this.setCharts();
  }

  private refreshBegin() {
    if (this.box) this.box.hidden = true;
  }

  private refreshing() {
    this.setCharts();
  }

  private refreshEnd() {
    if (this.box) this.box.hidden = false;
  }

  private on(eventName: string, callback: any) {
    this.chart?.on(eventName, callback);
  }

  private off(eventName: string, callback: any) {
    this.chart?.off(eventName, callback);
  }

  //设置图表实例的配置项以及数据
  private setCharts() {
    if (!this.visible) return;
    if (this.chartOption == null || this.chartOption == 'undefined') return;
    this.chart?.setOption(this.chartOption);
    this.chartOption.animation = false;
  }

  /*创建layer的容器，添加到scene之上*/
  private createLayer() {
    const scene = this._viewer.scene;
    scene.canvas.setAttribute('tabIndex', "0");
    var box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.top = '0px';
    box.style.left = '0px';
    box.style.width = scene.canvas.width + 'px';
    box.style.height = scene.canvas.height + 'px';
    box.style.pointerEvents = 'none';
    box.setAttribute('class', 'echartMap');
    box.id = "echartMap";
    this.box = box;
    this._viewer.container.appendChild(box);
    this.chart = echarts.init(box); //创建一个 ECharts 实例
    this.startSceneEventListeners();
  }

  /*销毁实例*/
  public remove() {
    echarts.init(document.getElementById('echartMap')).dispose();
    this.chart?.dispose();
    if (this.box) {
      this.box.outerHTML = '';
      this.box = undefined;
    }
    this.chartOption = null;
    this._viewer.scene.postRender.removeEventListener(this.moveHandler, this);
    this._viewer.destroy();
  }

  /*监听场景事件，根据图层是否显示，判断是否重绘echarts*/
  private startSceneEventListeners() {
    this._viewer.scene.postRender.addEventListener(this.moveHandler, this);
  }

  private moveHandler() {
    if (!this.visible) return;
    this.setCharts();
    //重新设置大小
    this.chart?.resize({
      width: this._viewer.canvas.width,
      height: this._viewer.canvas.height
    });
    if (this.box) this.box.hidden = false;
  }

  private getE3CoordinateSystem(viewer: Viewer): any {
    class CoordinateSystem {
      private _viewer: Viewer;
      private _mapOffset: [number, number];
      constructor(viewer: Viewer) {
        this._viewer = viewer;
        this._mapOffset = [0, 0];
      }
      public static create(ecModel: any) {
        ecModel.eachSeries((seriesModel: any) => {
          if (seriesModel.get('coordinateSystem') === 'cesium') {
            seriesModel.coordinateSystem = new CoordinateSystem(viewer);
          }
        });
      }
      public static getDimensionsInfo() {
        return ['x', 'y'];
      }
      public dimensions = ['x', 'y'];

      public setMapOffset(offset: [number, number]) {
        this._mapOffset = offset;
      }
      public dataToPoint(data: [number, number]) {
        const scene = this._viewer.scene
        const cartesian = Cartesian3.fromDegrees(data[0], data[1]);
        if (!cartesian) return [0, 0];
        if (scene.mode === SceneMode.SCENE3D && Cartesian3.angleBetween(scene.camera.position, cartesian) > Math.toRadians(80)) return !1;
        const canvasCoordinate = scene.cartesianToCanvasCoordinates(cartesian);
        return canvasCoordinate ? [canvasCoordinate.x - this._mapOffset[0], canvasCoordinate.y - this._mapOffset[1]] : origin
      }
      public pointToData(point: [number, number]) {
        const mapOffset = this._mapOffset
        const ellipsoid = viewer.scene.globe.ellipsoid
        const cartesian = new Cartesian3(point[0] + mapOffset[1], point[1] + mapOffset[1], 0)
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        return cartographic ? [cartographic.longitude, cartographic.latitude] : [0, 0]
      }
      public getViewerRect() {
        const canvas = this._viewer.canvas;
        return new echarts.graphic.BoundingRect(0, 0, canvas.width, canvas.height);
      }
      public getRoamTransform() {
        return echarts.matrix.create();
      }
    }
    return CoordinateSystem
  }
}
