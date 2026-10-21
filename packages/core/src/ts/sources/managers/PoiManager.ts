import type { CameraManager } from '../../camera/CameraManager'
import { Cartesian2, Cartesian3, Color, CustomDataSource, Entity, HeightReference, HorizontalOrigin, LabelStyle, NearFarScalar, VerticalOrigin, Viewer } from "cesium";
import { PoiResourceItem } from "../types";
import { CesiumData } from "./data/CesiumData";

export class PoiManager extends CesiumData<Entity> {
    private readonly dataSourceTool: CustomDataSource;
    constructor(viewer: Viewer, camera: CameraManager) {
        super(viewer, camera);
        this.dataSourceTool = new CustomDataSource('工作区 POI - 标注点');
        this.viewer.dataSources.add(this.dataSourceTool).then();
    }
    async addData(sourceItem: PoiResourceItem): Promise<Entity> {
        const properties = sourceItem.properties
        const id = sourceItem.id;
        const { longitude, latitude } = properties.position;

        const text = properties.text;
        const imagePath = properties.image;

        const mark = this.dataSourceTool.entities.add({
            id: id,
            name: sourceItem.name,
            show: sourceItem.show ?? true,
            position: Cartesian3.fromDegrees(longitude, latitude),
            billboard: {
                image: imagePath,
                width: 15,
                height: 15,
                scaleByDistance: new NearFarScalar(150, 2, 15000000, 0.5),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                verticalOrigin: VerticalOrigin.BOTTOM
            },
            label: {
                text: text,
                font: '12pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                horizontalOrigin: HorizontalOrigin.LEFT,
                verticalOrigin: VerticalOrigin.BOTTOM,
                pixelOffset: new Cartesian2(imagePath ? 20 : 0, 0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: HeightReference.RELATIVE_TO_GROUND
            }
        });

        this.sourcesItems.push(sourceItem);
        this.instancesMap.set(id, mark);

        return mark;
    }

    async flyToById(id: string): Promise<boolean> {
        const entity = this.getInstanceById(id);
        if (!entity) return false;

        return this.camera.flyToTarget(entity, {
            heading: 0, pitch: -90, range: 0,
        }).catch(() => false);
    }
    removeById(id: string): boolean {
        const entity = this.getInstanceById(id);
        if (!entity) return false;

        const removed = this.dataSourceTool.entities.remove(entity);

        this.instancesMap.delete(id);
        this.sourcesItems = this.sourcesItems.filter(
            item => item.id !== id,
        );

        return removed;
    }
    destroy(): boolean {

        this.removeAll();

        if (!this.viewer.isDestroyed()) {
            this.viewer.dataSources.remove(this.dataSourceTool, true);
        }

        return true;
    }

}