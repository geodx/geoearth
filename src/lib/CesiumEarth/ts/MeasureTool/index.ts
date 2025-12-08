
import { CustomDataSource, DataSource, Viewer } from 'cesium';
import { DrawShape } from '../DrawShape';


/**
 * 测量工具类
 */
class MeasureTool {
  #viewer: Viewer;
  #dataSourceToo: DataSource;
  #drawShape: DrawShape;
  constructor(viewer: Viewer) {
    this.#viewer = viewer;
    this.#dataSourceToo = new CustomDataSource('测量工具-实体集合');
    this.#viewer.dataSources.add(this.#dataSourceToo).then();

    this.#drawShape = new DrawShape(viewer);
  }

  /**
   * 清除所有测量结果
   */
  removeAll() {
    this.#dataSourceToo.entities.removeAll();
  }

}



export { MeasureTool };



