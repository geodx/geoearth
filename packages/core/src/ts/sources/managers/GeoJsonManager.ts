import { Color } from "cesium";
import { PlotDataSource } from "../../tools/plot/PlotDataSource";
import { CesiumData } from "./data/CesiumData";
import { PolylineArrowMaterialProperty } from "cesium";
import { Cartesian2, HeadingPitchRange } from "cesium";
import * as turf from "@turf/turf";
import { EntityFactory } from "../../visualization";
import { GeoJsonResourceItem } from "../types";
export class GeoJsonManager extends CesiumData<PlotDataSource> {
    constructor(viewer) {
        super(viewer);
    }

    async addData(sourceItem: GeoJsonResourceItem): Promise<PlotDataSource> {
        const properties = sourceItem.properties;
        const url = properties.url;
        const id = sourceItem.id;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`GeoJSON 请求失败：${response.status}`);
        }
        const geoJson = await response.json();

        const dataSource = new PlotDataSource(this.viewer, sourceItem.name);

        // 加载 GeoJSON，并处理线箭头样式。
        const loadedDataSource = await dataSource.load(geoJson, { clampToGround: true, })
        loadedDataSource.entities.values.forEach(entity => {
            if (
                properties.symbol &&
                properties.symbol.lineArrow &&
                entity.polyline
            ) {
                entity.polyline.material =
                    new PolylineArrowMaterialProperty(
                        Color.RED
                    );

                entity.polyline.width = 15;
            }
        });

        // 在数据覆盖范围的中心位置添加标注。
        if (properties.label) {
            const coordinates = turf.center(geoJson).geometry.coordinates;
            const labelOptions = {
                pixelOffset: properties.label.pixelOffset
                    ? new Cartesian2(
                        properties.label.pixelOffset.x,
                        properties.label.pixelOffset.y,
                    )
                    : undefined,
            };
            const labelEntity = EntityFactory.buildLabelByDegrees(
                {
                    longitude: coordinates[0],
                    latitude: coordinates[1],
                    height: 0,
                },
                properties.label.text,
                labelOptions
            );

            dataSource.entities.add(labelEntity);
        }

        dataSource.show = sourceItem.show ?? true;

        // 加入集合成功后，再登记资源。
        await this.viewer.dataSources.add(dataSource);

        this.instancesMap.set(id, dataSource);
        this.sourcesItems.push(sourceItem);

        return dataSource;
    }

    async flyToById(id: string): Promise<boolean> {
        const dataSource = this.getInstanceById(id);

        if (!dataSource) {
            return false;
        }

        return this.viewer.flyTo(dataSource, {
            offset: new HeadingPitchRange(0, -Math.PI / 2, 0),
        }).catch(() => false);
    }

    removeById(id: string): boolean {
        let removed = false;
        const dataSource = this.getInstanceById(id);

        this.sourcesItems = this.sourcesItems.filter(
            item => item.id !== id
        );

        if (dataSource) {
            removed = this.viewer.dataSources.remove(dataSource);
            this.instancesMap.delete(id);
        }

        return removed;
    }

    destroy(): boolean {
        return this.removeAll();
    }
}