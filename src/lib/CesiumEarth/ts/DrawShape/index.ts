
import {
  CustomDataSource, Viewer, ScreenSpaceEventHandler, defined,
  Cartesian3, Entity, CallbackProperty, Cartographic,
  ArcType, EllipsoidGeodesic, Color, PolygonHierarchy, ColorMaterialProperty,
  HeightReference, Material, ClippingPlane
} from 'cesium';
import { HandlerManage } from '../HandlerManage';
import { CoordinateType } from './CoordinateType';
import { ScreenSpaceEventType } from 'cesium';
import { coordinateTransform } from './coordinateTransform';
import { EntityFactory } from '../ExpandEntity';
import { CartographicTool } from '../Utils/CoordinateTool';
import { PolylineLightingMaterial } from '../ExpandEntity/Material/Polyline';
import { getRectanglePoint } from './getRectanglePoint';
import { getInclinedRectangle } from './getInclinedRectangle';
import { GISMathUtils } from '../Utils';
import { CallbackPositionProperty } from 'cesium';



const commitEndCallBack = (coordinateType: CoordinateType, endCallback: Function, ps: Cartesian3[]) => {
  if (typeof endCallback === 'function') {
    let type = coordinateType || CoordinateType.cartesian3;
    endCallback(coordinateTransform(type, ps));
  }
};

interface DrawShapeOptions {
  position?: any,
  normal?: any,
  dimensions?: any,
  coordinateType: CoordinateType,
  endCallback: Function,
  moveCallback?: Function,
  errCallback?: Function
}
/**
 *  名称：坐标采集工具
 *  描述：支持：【画点】、【画线】、【画多折线】、【画角度】、【画多边形】、【画圆】、【画矩形】、【画斜矩形】，返回坐标
 *
 *
 *  @remarks
 *  命名空间：CesiumEarth.DrawShape
 *
 *
 *  支持的输出格式：cartesian（默认）、cartographicObj、cartographicArr
 *
 *  最后修改日期：2022-02-28
 *
 *  @example
 *
 *  const drawShape = new DrawShape(this.viewer3D);
 *
 *  // 默认返回的数据格式是笛卡尔坐标系
 *  positions = [
 *    {"x":-2170133.6691256277,"y":4662743.784446367,"z":3759613.917915065},
 *    {"x":-2170143.223638534,"y":4663097.568298324,"z":3759172.906975031},
 *    {"x":-2170616.8730793963,"y":4662536.019548276,"z":3759592.791057056},
 *    {"x":-2170133.6691256277,"y":4662743.784446367,"z":3759613.917915065}
 *  ]
 *
 */
class DrawShape {
  private viewer: Viewer;
  private dataSourceToo: CustomDataSource;

  // 绘制图形的坐标串
  private coordinates: Cartesian3[] = [];
  // 已经确定位置的几何形节点
  private dynamicNodesPoint: Entity[] = [];
  // 绘图过程中生成的实体，如点和图形
  private drawEntities: Entity | undefined;

  private endCallback: Function | undefined;
  private errCallback: Function | undefined;
  private moveCallback: Function | undefined;
  private returnPositions?: Cartesian3[] | number[][] | Cartographic[];

  private isDepthTest: boolean = true;

  private handler: ScreenSpaceEventHandler;
  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.handler = HandlerManage.getHandle(viewer, null).handler;

    this.dataSourceToo = new CustomDataSource('坐标采集工具-实体集合');
    viewer.dataSources.add(this.dataSourceToo).then();
  }


  // 画点函数
  public drawPoint({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    // 设置左键单击拾取坐标事件，结束画点函数
    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.drawShapeEnd();
        commitEndCallBack(coordinateType, endCallback, [earthPosition]);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      if (typeof moveCallback === 'function') {
        moveCallback(newPosition);
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件，以异常结束的方式终止画点函数
    handler.setInputAction(() => {
      this.drawShapeErrorCallback(null);
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画线函数
  public drawLine({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;


    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(EntityFactory.createPoint(earthPosition)); // 生成点

        this.returnPositions = coordinateTransform(coordinateType, this.coordinates);

        // 生成点和图形
        if (!this.drawEntities) {
          this.drawEntities = this.dataSourceToo.entities.add({
            polyline: {
              positions: new CallbackProperty(() => {
                return this.coordinates;
              }, false),
              width: 12,
              clampToGround: true,
              arcType: ArcType.RHUMB,
              material: new PolylineLightingMaterial(Color.GREEN)
            }
          });
        }

        if (this.coordinates.length >= 2) {
          commitEndCallBack(coordinateType, endCallback, this.coordinates);
          this.drawShapeEnd();
        } else {
          this.coordinates.push(earthPosition);
        }


      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      // 移动点跟着光标动
      if (defined(newPosition)) {

        if (this.coordinates.length === 1) {
          this.coordinates.push(newPosition);
        }

        if (this.coordinates.length >= 2) {
          // 更新最新鼠标点
          this.coordinates.pop();
          this.coordinates.push(newPosition);
        }

        if (typeof moveCallback === 'function') {
          moveCallback(this.coordinates);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件
    handler.setInputAction(() => {
      this.coordinates.pop();
      if (this.coordinates.length >= 1) {
        commitEndCallBack(coordinateType, endCallback, this.coordinates);
      } else {
        this.drawShapeErrorCallback(null);
      }
      this.drawShapeEnd();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画多折线
  public drawPolyLine({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;


    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(EntityFactory.createPoint(earthPosition)); // 生成点

        this.coordinates.push(earthPosition);
        this.returnPositions = coordinateTransform(coordinateType, this.coordinates);

        // 生成点和图形
        if (!this.drawEntities) {
          this.drawEntities = this.dataSourceToo.entities.add({
            polyline: {
              positions: new CallbackProperty(() => {
                return this.coordinates;
              }, false),
              width: 12,
              clampToGround: true,
              arcType: ArcType.RHUMB,
              material: new PolylineLightingMaterial(Color.GREEN)
            }
          });
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      // 移动点跟着光标动
      if (defined(newPosition)) {

        if (this.coordinates.length === 1) {
          this.coordinates.push(newPosition);
        }

        if (this.coordinates.length >= 2) {
          // 更新最新鼠标点
          this.coordinates.pop();
          this.coordinates.push(newPosition);
        }

        if (typeof moveCallback === 'function') {
          moveCallback(this.coordinates);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件
    handler.setInputAction(() => {
      this.coordinates.pop();
      if (this.coordinates.length >= 1) {
        commitEndCallBack(coordinateType, endCallback, this.coordinates);
      } else {
        this.drawShapeErrorCallback(null);
      }
      this.drawShapeEnd();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画角度
  public drawTriangle({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    let returnPositions: Cartesian3[] = [];// 多折线坐标数组

    let dynamicPositions;

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(
          EntityFactory.createPoint(earthPosition)); // 生成点

        returnPositions.push(earthPosition);
        this.coordinates.push(earthPosition);

        // 生成点和图形
        if (!this.drawEntities) {


          dynamicPositions = new CallbackProperty(() => {
            return this.coordinates;
          }, false);
          this.drawEntities = this.dataSourceToo.entities.add({
            polyline: {
              positions: dynamicPositions,
              width: 12,
              clampToGround: true,
              arcType: ArcType.RHUMB,
              // @ts-ignore
              material: new PolylineLightingMaterial(Color.GREEN)
            }
          });
        }


        if (returnPositions.length === 3) {
          commitEndCallBack(coordinateType, endCallback, returnPositions);
          this.drawShapeEnd();
        }

      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      // 移动点跟着光标动
      if (defined(newPosition)) {

        if (this.coordinates.length === 1) {
          this.coordinates.push(newPosition);
        }

        if (this.coordinates.length >= 2) {
          // 更新最新鼠标点
          this.coordinates.pop();
          this.coordinates.push(newPosition);
          this.returnPositions = coordinateTransform(coordinateType, this.coordinates);
        }

        if (typeof moveCallback === 'function') {
          moveCallback(this.coordinates);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件
    handler.setInputAction(() => {

      this.drawShapeEnd();

      if (returnPositions.length >= 2) {
        commitEndCallBack(coordinateType, endCallback, returnPositions);
      } else {
        this.drawShapeErrorCallback(null);
      }
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画多边形
  public drawPolygon({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    let minPointsSize = 2; // 多边形最少点数
    let returnPosition: Cartesian3[] = []; // 诡异的bug，数组的值会发生跳动

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(EntityFactory.createPoint(earthPosition)); // 生成点

        returnPosition.push(JSON.parse(JSON.stringify(earthPosition)));

        this.coordinates.push(earthPosition);
        this.returnPositions = coordinateTransform(coordinateType, this.coordinates);

        if (this.dynamicNodesPoint.length === minPointsSize) {
          if (!this.drawEntities) {
            this.drawEntities = this.dataSourceToo.entities.add(EntityFactory.createLightingPolygon(this.coordinates));
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);

      // 移动点跟着光标动
      if (defined(newPosition)) {

        this.coordinates.pop();
        this.coordinates.push(newPosition);

        if (typeof moveCallback === 'function') {
          let moveReturn = JSON.parse(JSON.stringify(returnPosition));
          moveReturn.push(JSON.parse(JSON.stringify(newPosition)));
          moveCallback(moveReturn);
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    // 右键结束
    handler.setInputAction(() => {
      this.drawShapeEnd();

      // 如果绘制的点数少于最小点数，返回绘制失败
      if (returnPosition.length >= minPointsSize) {
        returnPosition.push(returnPosition[0]!);
        commitEndCallBack(coordinateType, endCallback, returnPosition);
      } else {
        this.drawShapeErrorCallback(null);
      }
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画圆
  public drawCircle({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    let dynamicPositions: CallbackProperty | null = null;
    let circleCenter: Cartesian3 | null = null; // 圆心
    let distance = 0; // 半径

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(
          EntityFactory.createPoint(earthPosition)); // 生成点

        if (!circleCenter) {
          circleCenter = earthPosition;
        } else {
          if (typeof endCallback === 'function') {
            endCallback({
              'Center': circleCenter,
              'EndPoint': earthPosition,
              'Radius': distance
            });
          }
          this.drawShapeEnd();
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      // 移动点跟着光标动
      if (defined(newPosition)) {

        if (circleCenter) {
          let cartographic0 = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(
            circleCenter);
          let cartographic1 = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(
            newPosition);
          let geodesic = new EllipsoidGeodesic(cartographic0,
            cartographic1);
          distance = geodesic.surfaceDistance;

          if (typeof moveCallback === 'function') {
            moveCallback({
              'Center': circleCenter,
              'EndPoint': newPosition,
              'Radius': distance
            });
          }
          if (!dynamicPositions) {
            dynamicPositions = new CallbackProperty(function () {
              return distance;
            }, false);
          }
          if (!this.drawEntities) {
            // @ts-ignore
            this.drawEntities = this.dataSourceToo.entities.add({
              position: circleCenter,
              name: 'Red ellipse on surface',
              ellipse: {
                // @ts-ignore
                semiMinorAxis: dynamicPositions,
                // @ts-ignore
                semiMajorAxis: dynamicPositions,
                material: Color.RED.withAlpha(0.5)
              }
            });
          }
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件，表示结束取消
    handler.setInputAction((event: any) => {
      this.drawShapeErrorCallback(null);
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  /**
   * 画矩形
   * @param coordinateType
   * @param endCallback
   * @param moveCallback
   * @param errCallback
   */
  public drawRectangle({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    // 用于表示正矩形的两个坐标的，分别为矩形【左上角和右上角坐标】
    let RectanglePoint: Cartesian3[] = [];

    let positions: Cartesian3[] = []; // 多边形坐标数组
    let dynamicPositions; // 异步地址调用 positions 的数组

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(
          EntityFactory.createPoint(earthPosition)); // 生成点
        RectanglePoint.push(earthPosition);

        if (RectanglePoint.length === 1) {
          // 当只有一个点的时候，生成矩形实体
          if (!this.drawEntities) {
            dynamicPositions = new CallbackProperty(function () {
              return new PolygonHierarchy(positions);
            }, false);
            this.drawEntities = this.dataSourceToo.entities.add({
              polygon: {
                hierarchy: dynamicPositions,
                material: new ColorMaterialProperty(
                  Color.LIGHTSKYBLUE.withAlpha(0.3)),
                heightReference: HeightReference.NONE
              }
            });
          }
        }

        if (RectanglePoint.length === 2) {
          RectanglePoint[1] = earthPosition;


          positions = getRectanglePoint(RectanglePoint[0]!, RectanglePoint[1]!);

          commitEndCallBack(coordinateType, endCallback, positions);
          this.drawShapeEnd();
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);

      if (RectanglePoint.length === 1 && newPosition) {
        positions = getRectanglePoint(RectanglePoint[0]!, newPosition);
        if (typeof moveCallback === 'function') {
          moveCallback(coordinateTransform(coordinateType, positions));
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 右键结束,但是不返回结果
    handler.setInputAction(() => {
      this.drawShapeErrorCallback(null);
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  /**
   * 画斜距形
   * @param coordinateType
   * @param endCallback
   * @param moveCallback
   * @param errCallback
   */
  public drawInclinedRectangle({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    let minPointsSize = 2; // 斜距形最少点数
    let dynamicPositions;

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      // 获得鼠标点击位置的坐标

      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        this.dynamicNodesPoint.push(
          EntityFactory.createPoint(earthPosition)); // 生成点
        if (this.coordinates.length < minPointsSize) {
          this.coordinates.push(earthPosition);
        }
        // 生成点和图形
        if (this.dynamicNodesPoint.length === minPointsSize) {
          if (!this.drawEntities) {
            dynamicPositions = new CallbackProperty(() => {
              return new PolygonHierarchy(this.coordinates);
            }, false);
            this.drawEntities = this.dataSourceToo.entities.add({
              polygon: {
                hierarchy: dynamicPositions,
                material: new ColorMaterialProperty(
                  Color.LIGHTSKYBLUE.withAlpha(0.3)),
                heightReference: HeightReference.NONE
              }
            });
          }
        }
        // 第三个点的时候停止
        if (this.dynamicNodesPoint.length === 3) {
          commitEndCallBack(coordinateType, endCallback, this.coordinates);
          this.drawShapeEnd();
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);

      if (defined(newPosition)) {
        // 当position的点数是两个的时候，自动计算出第三第四个点，并且添加到
        if (this.coordinates.length === minPointsSize) {
          let cartesian1 = new Cartesian3();
          let cartesian2 = new Cartesian3();
          getInclinedRectangle(this.coordinates[0], this.coordinates[1], newPosition, cartesian1, cartesian2);
          this.coordinates.push(cartesian1, cartesian2);
        } else if (this.coordinates.length > minPointsSize) {
          this.coordinates.pop();
          this.coordinates.pop();
          let cartesian1 = new Cartesian3();
          let cartesian2 = new Cartesian3();
          getInclinedRectangle(this.coordinates[0], this.coordinates[1], newPosition, cartesian1, cartesian2);
          this.coordinates.push(cartesian1);
          this.coordinates.push(cartesian2);

          if (typeof moveCallback === 'function') {
            moveCallback(this.coordinates);
          }
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 右键结束,但是不返回结果
    handler.setInputAction(() => {
      this.drawShapeErrorCallback(null);
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 画高差
  public drawHeightDistinct({ coordinateType, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    // 设置左键单击拾取坐标事件
    handler.setInputAction((event: any) => {
      let earthPosition = this.viewer.scene.pickPosition(event.position);

      if (defined(earthPosition)) {
        if (this.coordinates.length == 0) {
          this.dynamicNodesPoint.push(EntityFactory.createPoint(earthPosition));

          this.coordinates.push(earthPosition);
          this.coordinates.push(earthPosition);
          this.dataSourceToo.entities.add(EntityFactory.createHeightEllipse(this.coordinates));

          const worldDegree = CartographicTool.formCartesian3(this.coordinates[0]!);
          const heightDifference = GISMathUtils.getHeight(this.coordinates)
          this.dataSourceToo.entities.add(
            EntityFactory.PointLabelEntity(
              Cartesian3.fromDegrees(worldDegree.longitude, worldDegree.latitude, worldDegree.height + heightDifference),
              new CallbackProperty(() => GISMathUtils.getHeight(this.coordinates) + '米', false)
            )
          );
        } else {
          commitEndCallBack(coordinateType, endCallback, this.coordinates);
          this.drawShapeEnd();
          handler.destroy();
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标移动事件
    handler.setInputAction((event: any) => {
      let newPosition = this.viewer.scene.pickPosition(event.endPosition);
      if (defined(newPosition)) {
        if (this.coordinates.length === 2) {
          this.coordinates[1] = newPosition;
        }
      }
      if (typeof moveCallback === 'function') {
        moveCallback(this.coordinates);
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件，表示结束取消
    handler.setInputAction(() => {
      if (this.coordinates.length === 0) {
        commitEndCallBack(coordinateType, endCallback, this.coordinates);
      }
      this.drawShapeEnd();
      handler.destroy();
    }, ScreenSpaceEventType.RIGHT_CLICK);

  }


  /**
   * 画在Y方向上移动的plane
   * @param position   plane的初始位置
   * @param normal    距离
   * @param dimensions   面的大小
   * @param callback   返回值
   */
  public drawYPlan({ position, normal, dimensions, endCallback, moveCallback, errCallback }: DrawShapeOptions) {
    let that = this;
    let handler = this.drawShapeStart();
    this.endCallback = endCallback;
    this.moveCallback = moveCallback;
    this.errCallback = errCallback;

    function createPlaneUpdateFunction(plane: { distance: number; }) {
      return function () {
        plane.distance = targetY;
        return plane;
      };
    }

    let selectedPlane: { material: Material; outlineColor: Color } | undefined;
    let targetY = 0.0;

    let plane = new ClippingPlane(normal, 0.0);

    this.drawEntities = this.dataSourceToo.entities.add({
      position: position,
      plane: {
        // dimensions : new Cartesian2(10000.0, 10000.0),
        dimensions: dimensions,
        material: Color.BLUE.withAlpha(0.5),
        plane: new CallbackProperty(createPlaneUpdateFunction(plane),
          false),
        outline: true,
        outlineColor: Color.BLUE
      }
    });
    // @ts-ignore
    this.drawEntities.drawYPlan = 'drawYPlan';

    handler.setInputAction((movement: { position: Cartesian3 | any; }) => {
      let pickedObject = this.viewer.scene.pick(movement.position);
      if (defined(pickedObject) &&
        defined(pickedObject.id) &&
        defined(pickedObject.id.plane) &&
        pickedObject.id.drawYPlan == 'drawYPlan') {
        selectedPlane = pickedObject.id.plane;
        // @ts-ignore
        selectedPlane.material = Color.RED.withAlpha(0.5);
        // @ts-ignore
        selectedPlane.outlineColor = Color.RED;
        this.viewer.scene.screenSpaceCameraController.enableInputs = false;
      }
    }, ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction(() => {
      if (defined(selectedPlane)) {
        // @ts-ignore
        selectedPlane.material = Color.BLUE.withAlpha(0.5);
        // @ts-ignore
        selectedPlane.outlineColor = Color.BLUE;
        selectedPlane = undefined;
      }
      if (typeof endCallback === 'function') {
        endCallback(targetY);
      }

      this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    }, ScreenSpaceEventType.LEFT_UP);

    handler.setInputAction((movement: { startPosition: Cartesian3 | any; endPosition: Cartesian3 | any; }) => {
      if (defined(selectedPlane)) {
        let deltaY = movement.startPosition.y - movement.endPosition.y;
        targetY += deltaY;
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 鼠标右击事件，表示结束取消
    handler.setInputAction(() => {
      this.drawShapeErrorCallback(null);
    }, ScreenSpaceEventType.RIGHT_CLICK);
  };

  // 在绘图过程中，可能需要由外部调用函数的方式，终止当前的绘图动作，并返回现有的结果
  public callStop() {
    if (this.returnPositions?.length && this.endCallback) {
      this.returnPositions.pop();
      this.endCallback(this.returnPositions);
    }
    this.drawShapeEnd();
  }

  /**
   * 正在执行的绘制任务被其他绘制任务挤掉之后执行的回调
   * @param err
   */
  private drawShapeErrorCallback(err: any) {
    let that = this;
    this.drawShapeEnd();
    typeof this.errCallback === 'function' && this.errCallback(err);
  }

  // 画图前的一些准备工作
  private drawShapeStart() {
    let that = this;
    this.drawShapeEnd();
    // 改变鼠标样式
    window.document.body.style.cursor = 'crosshair';
    // 获取事件句柄
    this.handler = HandlerManage.getHandle(this.viewer, this.drawShapeErrorCallback).handler;

    // 保存当前视图深度探测状态
    this.isDepthTest = this.viewer.scene.globe.depthTestAgainstTerrain;
    // 开启深度探测
    if (!this.isDepthTest) {
      this.viewer.scene.globe.depthTestAgainstTerrain = true;
      console.log('%c自动开启深度检测！', 'color: #43bb88;');
    }

    return this.handler;
  }

  // 执行画图完成后的一些工作
  private drawShapeEnd() {
    let that = this;
    // 恢复鼠标样式
    window.document.body.style.cursor = 'auto';
    // 清除已经绘制的 entity
    this.clearDrawEntity();
    // 恢复深度探测的状态
    this.viewer.scene.globe.depthTestAgainstTerrain = this.isDepthTest;
    // 销毁事件句柄
    if (!this.handler.isDestroyed()) {
      this.handler.destroy();
    }

    this.endCallback = Function;
    this.moveCallback = Function;
    this.errCallback = Function;
  }

  /**
   * 清除已经绘制的 entity
   */
  private clearDrawEntity() {
    let that = this;
    this.coordinates = [];

    this.dataSourceToo.entities.removeAll();

    // 已经确定位置的几何形节点
    this.dynamicNodesPoint = [];

    // 绘制的实体
    this.drawEntities = undefined;
  }
}


export { DrawShape };
