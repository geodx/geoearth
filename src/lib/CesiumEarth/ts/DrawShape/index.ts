
import { CustomDataSource, Viewer } from 'cesium';





/**
 *  名称：坐标采集工具
 *  描述：支持：【画点】、【画线】、【画多折线】、【画角度】、【画多边形】、【画圆】、【画矩形】、【画斜矩形】，返回坐标
 *
 *
 *  @remarks
 *  命名空间：window.CesiumEarth.DrawShape
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
  public viewer!: Viewer;
  public dataSourceToo!: CustomDataSource;


  constructor(viewer: Viewer) {
    this.viewer = viewer;

    this.dataSourceToo = new CustomDataSource('坐标采集工具-实体集合');
    viewer.dataSources.add(this.dataSourceToo).then();
  }

}


export { DrawShape };
