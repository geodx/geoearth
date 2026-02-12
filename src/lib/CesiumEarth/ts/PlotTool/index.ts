import { Viewer, CustomDataSource } from "cesium";
import * as turf from "@turf/turf";
import type { FeatureCollection } from "geojson";
import { BOMTool, DrawShape, PlotDataSource, SafeTool } from "../cesium.earth";
import CesiumEarth from "../..";
import { kml } from "@tmcw/togeojson";
import { toKML } from "@placemarkio/tokml";
import { CoordinateType } from "../DrawShape/CoordinateType";
import type { Cartesian3 } from "cesium";
import { ScreenSpaceEventHandler } from "cesium";
function readFile({ errFunc, endFunc }: { errFunc: Function, endFunc: Function }) {
  document.getElementById("_ef")?.remove();
  const inputObj = document.createElement("input");
  inputObj.setAttribute("id", "_ef")
  inputObj.setAttribute("type", "file")
  inputObj.setAttribute("style", "display:none")
  document.body.appendChild(inputObj)
  inputObj.onchange = function () {
    const fl = inputObj.files || errFunc('未选择任何文件');
    const file = fl[0]
    const fileName = file.name
    const filePath = inputObj.value
    const fileType = detectFileType(fileName)
    const reader = new FileReader();
    if (!fileType) {
      errFunc?.("文件类型无法识别，只支持kml、GeoJson格式",);
      return;
    }
    reader.readAsText(file, "UTF-8")
    if (fileType === "geoJson") {
      reader.onload = (evt: any) => {
        try {
          const fileData = JSON.parse(evt.target.result)
          endFunc && endFunc({ fileName, filePath, fileType, geoJson: fileData });
        } catch (e) {
          errFunc && errFunc('文件已损坏', e);
        }
      };
    }
    if (fileType === "kml") {
      reader.onload = (evt: any) => {
        const parser = new DOMParser();
        try {
          const pe = parser.parseFromString(evt.target.result, "text/xml")
          const fileData = kml(pe);
          if (fileData.features.length === 0) {
            console.log("数据为空", fileData)
            errFunc && errFunc("文件已损坏")
            return;
          }
          endFunc && endFunc({ fileName, filePath, fileType, geoJson: fileData });
        } catch (e) {
          errFunc && errFunc('文件已损坏', e);
        }
      };
    }
  }
  inputObj.click()
}
function detectFileType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".geojson")) {
    return "geoJson";
  }
  if (lowerName.endsWith(".kml") || lowerName.endsWith(".xml")) {
    return "kml";
  }
  return "";

}


/**
 * 标绘工具类
 * 核心模块，在坐标采集工具的基础上封装的标绘工具
 */
class PlotTool {
  private viewer: Viewer;
  private fileName: string;
  public GeoJson: FeatureCollection
  private GeoJsonBackups: any[];
  public clampToGround: boolean;
  public dataSourceTool: PlotDataSource;
  private drawShape: DrawShape;
  private DrawType: any[];
  private id: string = "";
  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.fileName = "";
    this.GeoJson = turf.featureCollection([]);
    this.GeoJsonBackups = [];
    this.clampToGround = true;
    this.dataSourceTool = new PlotDataSource(this.viewer, '标绘工具-实体集合');
    this.drawShape = new DrawShape(viewer);
    this.DrawType = [{
      fillColor: "rgb(238, 204, 204)",
      fillStyle: "./icon/full.png",
      borderColor: "rgb(252, 220, 113)",
      borderWidth: "5px",
      borderStyle: "solid",
      opacity: "0.5"
    }, {
      fillColor: "rgb(2,0,255)",
      fillStyle: "solid",
      lineWidth: "5",
      opacity: "0.5"
    }, {}];
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.dataSources.add(this.dataSourceTool).then();
    this.initEvent();
  }
  private initEvent() {
    CesiumEarth.EventManage.screenEvent.addEventListener(
      CesiumEarth.ScreenSpaceEventType.MOUSE_MOVE,
      CesiumEarth.ScopeType.Viewer3D,
      this.mouseMoveEvent);
    CesiumEarth.EventManage.screenEvent.addEventListener(
      CesiumEarth.ScreenSpaceEventType.LEFT_CLICK,
      CesiumEarth.ScopeType.Viewer3D,
      this.leftClickEvent);
  }
  private mouseMoveEvent = (e: any) => { }
  private leftClickEvent = (e: any) => {
    const feature = this.viewer.scene.pick(e.position);
    console.log(e.position, feature);
    if (feature?.id) {
      this.id = feature.id.id
    }
  }
  // 导入外部文件资源
  inputFileData({ errFunc, endFunc }: any) {
    readFile({
      errFunc: (msg: string) => {
        errFunc(msg);
      },
      endFunc: ({ fileName, filePath, fileType, geoJson }: any) => {
        this.fileName = fileName;
        this.addGeoJsonBackupBefore()
        if (geoJson.type === "FeatureCollection") {
          this.GeoJson = geoJson;
        } else {
          this.GeoJson = turf.featureCollection([geoJson]);
        }
        this.addGeoJsonBackupAfter();
        endFunc(fileName)
      },
    });
  }
  // 保存为 GeoJson 文件
  SaveAsGeoJson(func: any) {
    BOMTool.saveShareContent(JSON.stringify(this.GeoJson), "导出.GeoJson");
    func?.("导出 GeoJson 文件成功")
  }
  // 保存为 Kml 文件
  SaveAsKML(func: any) {
    const v = toKML(this.GeoJson);
    BOMTool.saveShareContent(v, "export.kml");
    func?.("导出 KML 文件成功")
  }
  // 添加标注点
  addPoint(draw: any) {
    return new Promise(callFunc => {
      this.drawShape.drawPoint({
        coordinateType: CoordinateType.cartographicPoiArr,
        endCallback: (positions: any[]) => {
          this.addGeoJsonBackupBefore();
          const pointLable = { id: "Point-" + SafeTool.uuid(), "marker-symbol": draw['marker-symbol'] };
          const geoPoint = turf.point(positions[0], pointLable);
          this.GeoJson.features.push(geoPoint);
          this.addGeoJsonBackupAfter();
          callFunc(true);
        },
        errCallback: () => {
          callFunc(false);
        }
      });
    });
  }
  // 添加标注线
  addMultiLine(strokeMaterial: string, strokeWidth: number, func: any) {
    return new Promise((callFun) => {
      this.drawShape.drawPolyLine({
        coordinateType: CoordinateType.cartographicPoiArr,
        endCallback: (positions: any[]) => {
          this.addGeoJsonBackupBefore();
          const geoLine = turf.lineString(positions, {
            id: "Line-" + SafeTool.uuid(),
            "stroke-material": strokeMaterial || "normal",
            "stroke-width": strokeWidth || 12,
            name: "多段线"
          });
          this.GeoJson.features.push(geoLine);
          this.addGeoJsonBackupAfter();
          func?.({
            message: "添加多段线",
            width: 320
          }, "success", 2000, geoLine);
          callFun(true);
        },
        errCallback: () => {
          callFun(false);
        }
      });
    });
  }
  // 添加标注面
  addPolygon(func: any) {
    return new Promise(callFun => {
      this.drawShape.drawPolygon({
        coordinateType: CoordinateType.cartographicPoiArr,
        endCallback: (positions: any[]) => {
          this.addGeoJsonBackupBefore();
          let geoPolygon = turf.polygon([positions], {
            id: "Polygon-" + SafeTool.uuid(),
            fill: "rgba(128,224,245,0.5)",
            name: "面"
          });
          this.GeoJson.features.push(geoPolygon);
          this.addGeoJsonBackupAfter();
          func?.({ message: "添加面", width: 320 }, "success", 2000)
          callFun(true);
        },
        errCallback: () => {
          callFun(false);
        }
      });
    });
  }
  async addModel(modelUrl: String, height: number = 0) {
    this.drawShape.drawPoint({
      coordinateType: CoordinateType.cartographicPoiArr,
      endCallback: (positions: any[]) => {
        this.addGeoJsonBackupBefore();
        const properties = { id: "model-" + SafeTool.uuid(), "model-url": modelUrl };
        positions[0][2] += height;
        const geoPoint = turf.point(positions[0], properties);
        this.GeoJson.features.push(geoPoint);
        this.addGeoJsonBackupAfter();
      }
    });
  }
  delEntity(func: any) {
    this.addGeoJsonBackupBefore();
    this.dataSourceTool.entities.removeById(this.id);
    const featureCollection = turf.featureCollection([]);
    turf.featureEach(this.GeoJson, feature => {
      if (feature.properties?.id !== this.id) {
        featureCollection.features.push(feature);
      }
    });
    this.GeoJson = featureCollection;
    this.addGeoJsonBackupAfter();
    func?.({ message: "删除实体", width: 320 }, "success", 2000);
  }
  analyticGeometry() {
    this.dataSourceTool.entities.removeAll();
    this.dataSourceTool.load(this.GeoJson, { clampToGround: this.clampToGround });
  }
  // 撤销操作
  revoke() {
    if (this.GeoJsonBackups.length > 0) {
      this.GeoJson = this.GeoJsonBackups.pop();
      this.analyticGeometry();
    }
  }
  addGeoJsonBackupAfter() {
    this.analyticGeometry();
  }
  addGeoJsonBackupBefore() {
    const geo = JSON.parse(JSON.stringify(this.GeoJson));
    this.GeoJsonBackups.push(geo);
  }
  // 清空标注结果
  removeAll() {
    this.dataSourceTool.entities.removeAll();
    this.GeoJson = turf.featureCollection([]);
    this.GeoJsonBackups = [];
  }
  // 销毁标绘工具
  destroy() {
    this.dataSourceTool.entities.removeAll();
    this.viewer.dataSources.remove(this.dataSourceTool);
    CesiumEarth.EventManage.screenEvent.removeEventListener(this.mouseMoveEvent);
    CesiumEarth.EventManage.screenEvent.removeEventListener(this.leftClickEvent);
    document.body.style.cursor = "default";
  }


}


export { PlotTool };

