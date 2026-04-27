import { Entity, Viewer, CustomDataSource, Cartographic } from "cesium";
import { AMapService } from "./service/AMapService";
import { CoordinateType } from "../DrawShape/CoordinateType";
import { GraphHopperService } from "./service/GraphHopperService";
import { DrawShape } from "../DrawShape";
import type { WorldDegree } from "../Impl/Declare";
import { MarkTool } from "../Utils/MarkTool";
import { buildBillboard } from "../ExpandEntity/NormalEntity/buildBillboard";

export type RoutingServiceType = "AMap" | "GraphHopper";


/**
 * === PathPlanning ===
 * 路径规划控制器：采集起终点/途经点/规避区，多服务计算路线并生成实体
 */
export class PathPlanning {
  private readonly viewer: Viewer;
  private readonly dataSourceTool: CustomDataSource;

  private routingServiceType: RoutingServiceType;

  private startingPointEntity: Entity | null = null;
  private endPointEntity: Entity | null = null;
  private passPointEntityArr: Entity[] = [];
  private avoidRangeEntityArr: Entity[] = [];
  private roadEntityArr: Entity[] = [];

  public startingPoint: WorldDegree = { longitude: 0, latitude: 0, height: 0 };
  public endPoint: WorldDegree = { longitude: 0, latitude: 0, height: 0 };
  public passPointArr: WorldDegree[] = [];
  public avoidRanges: WorldDegree[][] = [];
  public naviData: any = null;

  private drawShape: DrawShape
  constructor(viewer: Viewer, routingServiceType?: RoutingServiceType) {
    this.viewer = viewer;
    this.routingServiceType = routingServiceType || "AMap"

    this.dataSourceTool = new CustomDataSource("路径规划-实体集合");
    viewer.dataSources.add(this.dataSourceTool).then();

    this.drawShape = new DrawShape(viewer)
  }

  async takeStartingPoint(): Promise<void> {
    const img = new URL('../../img/pathPlaning/start.png', import.meta.url).href
    const tip = new MarkTool(img);
    this.clearRoads();
    if (this.startingPointEntity) {
      this.dataSourceTool.entities.remove(this.startingPointEntity);
      this.startingPointEntity = null;
    }

    const p = await this.takePoint();
    if (p) {
      this.startingPoint = p;
      this.startingPointEntity = this.addMarkEntity(p.longitude, p.latitude, img);
    }

    tip.remove();
  }

  async takeEndPoint(): Promise<void> {
    const img = new URL('../../img/pathPlaning/end.png', import.meta.url).href
    const tip = new MarkTool(img);
    this.clearRoads();

    if (this.endPointEntity) {
      this.dataSourceTool.entities.remove(this.endPointEntity);
      this.endPointEntity = null;
    }

    const p = await this.takePoint();
    if (p) {
      this.endPoint = p;
      this.endPointEntity = this.addMarkEntity(p.longitude, p.latitude, img);
    }

    tip.remove();
  }

  async takePassPoint(): Promise<void> {
    const img = new URL('../../img/pathPlaning/pass.png', import.meta.url).href
    const tip = new MarkTool(img);
    this.clearRoads();

    const p = await this.takePoint();
    if (p) {
      this.passPointArr.push(p);
      this.passPointEntityArr.push(this.addMarkEntity(p.longitude, p.latitude, img));
    }

    tip.remove();
  }

  async takeAvoidRange(): Promise<Entity[]> {
    this.clearRoads();

    return new Promise((resolve, reject) => {
      this.drawShape.drawPolygon({
        coordinateType: CoordinateType.cartographicObj,
        endCallback: (poly: Cartographic[]) => {
          this.avoidRanges.push(poly);
          const ent = this.dataSourceTool.entities.add(AMapService.entityAvoidRange(poly));
          this.avoidRangeEntityArr.push(ent);
          resolve(this.avoidRangeEntityArr);
        },
        errCallback: () => {
          reject([]);
        },
      });
    });
  }

  clearPassPoint(): void {
    this.passPointArr = [];
    this.passPointEntityArr.forEach((e) => this.dataSourceTool.entities.remove(e));
    this.passPointEntityArr = [];
  }

  clearAvoidRanges(): void {
    this.avoidRanges = [];
    this.avoidRangeEntityArr.forEach((e) => this.dataSourceTool.entities.remove(e));
    this.avoidRangeEntityArr = [];
  }

  clearRoads(): void {
    this.roadEntityArr.forEach((e) => this.dataSourceTool.entities.remove(e));
    this.roadEntityArr = [];
  }

  /**根据naviData生成路线实体；d为选中的路线索引(默认0)*/
  buildPathEntity(selectedIndex = 0): void {
    if (!this.naviData) return;

    this.dataSourceTool.entities.removeAll();
    this.passPointEntityArr = [];
    this.avoidRangeEntityArr = [];
    this.roadEntityArr = [];

    this.startingPointEntity = this.addMarkEntity(
      this.startingPoint.longitude,
      this.startingPoint.latitude,
      new URL('../../img/pathPlaning/start.png', import.meta.url).href
    );
    this.endPointEntity = this.addMarkEntity(
      this.endPoint.longitude,
      this.endPoint.latitude,
      new URL('../../img/pathPlaning/end.png', import.meta.url).href
    );

    this.passPointArr.forEach((p) => {
      this.passPointEntityArr.push(this.addMarkEntity(p.longitude, p.latitude, new URL('../../img/pathPlaning/pass.png', import.meta.url).href));
    });

    this.avoidRanges.forEach((poly) => {
      this.avoidRangeEntityArr.push(this.dataSourceTool.entities.add(AMapService.entityAvoidRange(poly)));
    });

    if (this.routingServiceType === "AMap") {
      console.log("使用高德地图服务");
      // naviData.paths[i].steps[j].polyline => WorldDegree[]
      this.naviData.paths.forEach((path: any, idx: number) => {
        if (idx !== selectedIndex) return;

        const pts: WorldDegree[] = [];
        pts.push(this.startingPoint);
        path.steps.forEach((s: any) => pts.push(...s.polyline));
        pts.push(this.endPoint);

        const lineEnt = this.dataSourceTool.entities.add(AMapService.entityNaviLine(pts, String(idx + 1)));
        this.roadEntityArr.push(lineEnt);
      });
    } else {
      console.log("使用GraphHopper服务");
      // GraphHopper: naviData[i].points.coordinates => [lon,lat][]
      this.naviData.forEach((route: any, idx: number) => {
        if (idx !== selectedIndex) return;

        const pts: WorldDegree[] = [];
        pts.push(this.startingPoint);
        route.points.coordinates.forEach((c: number[]) => {
          pts.push({ longitude: c[0]!, latitude: c[1]!, height: 0 });
        });
        pts.push(this.endPoint);

        const lineEnt = this.dataSourceTool.entities.add(GraphHopperService.entityNaviLine(pts, String(idx + 1)));
        this.roadEntityArr.push(lineEnt);
      });
    }
  }

  /**调用导航服务计算路径，并默认生成第0条路线实体*/
  async runNavigation(): Promise<any> {
    let res: any;

    if (this.routingServiceType === "AMap") {
      res = await AMapService.navigation(this.startingPoint, this.endPoint, this.passPointArr, this.avoidRanges);
    } else {
      res = await GraphHopperService.navigation(this.startingPoint, this.endPoint, this.passPointArr, this.avoidRanges);
    }

    if (res != null) {
      this.naviData = res;
      this.buildPathEntity(0);
    }

    return res;
  }

  resetNavigation(): void {
    this.clearAvoidRanges();
    this.clearPassPoint();
    this.clearRoads();

    this.avoidRanges = [];
    this.dataSourceTool.entities.removeAll();

    this.startingPointEntity = null;
    this.endPointEntity = null;
    this.naviData = null;

    this.startingPoint = { longitude: 0, latitude: 0, height: 0 };
    this.endPoint = { longitude: 0, latitude: 0, height: 0 };
  }

  destroy(): void {
    this.resetNavigation();
    this.viewer.dataSources.remove(this.dataSourceTool);
  }

  /**绘制取点：返回经纬度保留5位小数，高度置0*/
  private takePoint(): Promise<WorldDegree | null> {
    return new Promise((resolve) => {
      this.drawShape.drawPoint({
        coordinateType: CoordinateType.cartographicObj,
        endCallback: (posArr: Cartographic[]) => {
          const p = posArr[0]!;
          const lon = Math.floor(p.longitude * 1e5) / 1e5;
          const lat = Math.floor(p.latitude * 1e5) / 1e5;
          resolve({ longitude: lon, latitude: lat, height: 0 });
        },
        errCallback: () => resolve(null),
      });
    });
  }
  private addMarkEntity(lon: number, lat: number, imgUrlBase64: string): Entity {
    return this.dataSourceTool.entities.add(
      buildBillboard(lon, lat, { imgUrl: imgUrlBase64, width: 15, height: 21 }),
    );
  }
}