
import { CustomDataSource, DataSource, Viewer, Cartesian3, CallbackProperty } from 'cesium';
import { DrawShape } from '../DrawShape';
import { CartographicTool, GISMathUtils } from '../Utils';
import { EntityFactory } from '../ExpandEntity/EntityFactory';
import { getMostDetailedHeight } from '../Utils/SceneUtils';
import type { Feature, Polygon } from 'geojson'


/**
 * 测量工具类
 */
class MeasureTool {
  private viewer: Viewer;
  private dataSourceTool: DataSource;
  private drawShape: DrawShape;
  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.dataSourceTool = new CustomDataSource('测量工具-实体集合');
    this.viewer.dataSources.add(this.dataSourceTool).then();
    this.drawShape = new DrawShape(viewer);
  }


  /**
   * 测量 点高程
   */
  measureHeight() {
    this.drawShape.drawPoint({
      endCallback: async (positions: Cartesian3[]) => {
        const position = CartographicTool.formCartesian3(positions[0]!);
        let heightStr = '计算中...';
        this.dataSourceTool.entities.add(EntityFactory.createRedPoint(positions[0]!));
        this.dataSourceTool.entities.add(EntityFactory.buildLabel(positions[0]!,
          new CallbackProperty(() => heightStr, false))
        );
        const [cartesianHasHeight] = await getMostDetailedHeight(this.viewer, [{
          longitude: position.longitude,
          latitude: position.latitude,
          height: 0
        }]);

        const height = cartesianHasHeight?.height;

        heightStr = height?.toFixed(3) + ' m';
      }
    })
  }
  /**
    * 测高差
    */
  verticalDistance() {
    this.drawShape.drawHeightDistinct({
      endCallback: (positions: Cartesian3[]) => {
        console.log("结束回调：", positions.length);

        if (positions.length === 2) {
          this.dataSourceTool.entities.add(EntityFactory.createHeightEllipse(positions));
          const worldDegree = CartographicTool.formCartesian3(positions[0]!);
          const heightDifference = GISMathUtils.getHeight(positions);
          const pointLabelEntity = EntityFactory.PointLabelEntity(
            Cartesian3.fromDegrees(worldDegree.longitude, worldDegree.latitude, worldDegree.height + heightDifference),
            heightDifference + '米'
          )
          this.dataSourceTool.entities.add(pointLabelEntity);
        }
      }
    });
  }

  /**
     * 测量角度
     */
  measureTriangle() {

    this.drawShape.drawTriangle({
      endCallback: (positions: Cartesian3[]) => {
        if (positions.length === 3) {
          // 绘制点
          for (let i in positions) {
            this.dataSourceTool.entities.add(EntityFactory.createRedPoint(positions[i]!));
          }

          // 绘制线条
          this.dataSourceTool.entities.add(EntityFactory.createLightingLine(positions));

          // 绘制最后的标注
          let text = GISMathUtils.calculateTriangle(positions)?.toFixed(3) + '度';
          let entityLabel = EntityFactory.buildLabel(positions[1]!, text);

          this.dataSourceTool.entities.add(entityLabel);
        }
      }
    });
  }
  /**
    * 测量空间距离
    */
  spaceDistance() {
    this.drawShape.drawPolyLine({
      endCallback: (positions: Cartesian3[]) => {
        if (positions.length >= 2) {
          // 绘制点
          for (let i in positions) {
            this.dataSourceTool.entities.add(EntityFactory.createRedPoint(positions[i]!));
          }

          // 绘制线条
          this.dataSourceTool.entities.add(EntityFactory.createLightingLine(positions));

          // 绘制最后的标注
          for (let i = 0; i < positions.length - 1; i++) {
            let startPoint = positions[i]!;
            let endPoint = positions[i + 1]!;
            this.dataSourceTool.entities.add(EntityFactory.spaceDistanceLabel(startPoint, endPoint));
          }
        }
      }
    });
  }

  /**
    * 测量面积
    */
  surfaceArea() {
    this.drawShape.drawPolygon({
      endCallback: async (positions: Cartesian3[]) => {
        if (positions.length > 3) {
          positions.push(positions[0]!);
          this.dataSourceTool.entities.add(EntityFactory.createLightingPolygon(positions));
          const geoJson: Polygon = {
            type: 'Polygon',
            coordinates: [CartographicTool.formCartesian3S(positions).map(item => [item.longitude, item.latitude, item.height])]
          };
          const feature: Feature = {
            type: "Feature",
            geometry: geoJson,
            properties: {}
          }
          this.dataSourceTool.entities.add(await EntityFactory.polygonCenterLabel(this.viewer, feature, '面积'));
        } else {
          console.error('绘制失败');
        }
      }
    });
  }

  /**
  * 测量周长
  */
  perimeter() {
    this.drawShape.drawPolygon({
      endCallback: async (positions: Cartesian3[]) => {
        if (positions.length > 3) {
          positions.push(positions[0]!);
          this.dataSourceTool.entities.add(EntityFactory.createLightingPolygon(positions));
          const geoJson: Polygon = {
            type: 'Polygon',
            coordinates: [CartographicTool.formCartesian3S(positions).map(item => [item.longitude, item.latitude, item.height])]
          };
          const feature: Feature = {
            type: "Feature",
            geometry: geoJson,
            properties: {}
          }
          this.dataSourceTool.entities.add(await EntityFactory.polygonCenterLabel(this.viewer, feature, '周长'));
        } else {
          console.error('绘制失败');
        }
      }
    });
  }

  /**
  * 终止测量
  */
  stopMeasure() {
    this.drawShape.callStop();
  }
  /**
   * 清除所有测量结果
   */
  removeAll() {
    this.dataSourceTool.entities.removeAll();
  }

}



export { MeasureTool };



