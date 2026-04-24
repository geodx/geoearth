
import { CustomDataSource, Entity, Viewer } from 'cesium';
import { CesiumData } from './impl/CesiumData';
import type { ResourceItem } from '../../Config';
import { Cartesian3, NearFarScalar, HeightReference, VerticalOrigin, Color, LabelStyle, HorizontalOrigin, Cartesian2, HeadingPitchRange } from 'cesium';
import type { ImageryLayerProps } from '../../Config/ResourceItem/ImageryLayerProps';


class CesiumPoi extends CesiumData<Entity> {
    dataSourceToo: CustomDataSource;

    constructor(viewer: Viewer) {
        super(viewer);
        this.dataSourceToo = new CustomDataSource('工作区 geoJson - 标注点');
        this.viewer.dataSources.add(this.dataSourceToo).then();
    }

    async addData(sourceItem: ResourceItem): Promise<any> {
        let pid = sourceItem.pid;
        const properties = sourceItem.properties as any
        let { longitude, latitude } = properties.position;

        let text_string = properties.text_string;
        let image_path = properties.image_path;

        let mark = this.dataSourceToo.entities.add({
            id: pid,
            name: ' mark',
            position: Cartesian3.fromDegrees(longitude, latitude),
            billboard: {
                image: image_path,
                width: 15,
                height: 15,
                scaleByDistance: new NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                verticalOrigin: VerticalOrigin.BOTTOM
            },
            label: {
                text: text_string,
                font: '12pt bold monospace',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 4,
                style: LabelStyle.FILL_AND_OUTLINE,
                horizontalOrigin: HorizontalOrigin.LEFT,
                verticalOrigin: VerticalOrigin.BOTTOM,
                pixelOffset: new Cartesian2(20, 0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: HeightReference.RELATIVE_TO_GROUND
            }
        });

        this.sourcesItems.push(sourceItem);
        this.instancesMap.set(pid, mark);

        return mark;
    }


    async flyToByPid(pid: string): Promise<boolean> {
        let ds = this.getInstancesByPid(pid);
        if (ds) {
            return this.viewer.flyTo(ds, {
                offset: new HeadingPitchRange(0, -3.14 / 2, 0)
            }).then(() => {
                return true;
            }).catch(() => {
                return false;
            });
        } else {
            return false;
        }
    }

    removeByPid(pid: string) {
        let removeRes = false;
        let instance = this.instancesMap.get(pid);
        this.sourcesItems = this.sourcesItems.filter(item => item.pid !== pid);
        if (instance) {
            removeRes = this.dataSourceToo.entities.remove(instance);
            this.instancesMap.delete(pid);
        }

        return removeRes;
    }


    destroy(): boolean {
        return this.removeAll();
    }
}

export { CesiumPoi };
