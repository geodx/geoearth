import { CustomDataSource, Entity, Viewer, Math } from 'cesium';
import { MotionEntity } from '../../ExpandEntity/MotionEntity/index';
import { CesiumData } from './impl/CesiumData';
import { Resource, Cartesian3, HeadingPitchRoll, Transforms, HeightReference, DistanceDisplayCondition, HeadingPitchRange } from 'cesium';
import type { ResourceItem } from '../../Config';
import * as turf from "@turf/turf";
import type { ImageryLayerProps } from '../../Config/ResourceItem/ImageryLayerProps';

class CesiumGLTF extends CesiumData<Entity> {
    private readonly dataSourceTool: CustomDataSource;

    constructor(viewer: Viewer) {
        super(viewer);
        this.dataSourceTool = new CustomDataSource('工作区 GLTF - 附加实体集合');
        this.viewer.dataSources.add(this.dataSourceTool);
    }

    async addData(sourceItem: ResourceItem): Promise<any> {
        let prop = sourceItem.properties as ImageryLayerProps;
        let url = prop.url;
        let queryParameters = prop.queryParameters || {};
        let scale = prop.scale || 1;
        // 对地形进行深度测试
        this.viewer.scene.globe.depthTestAgainstTerrain = true;
        let resource = new Resource({ url, queryParameters });
        if (!prop.position) return console.log('缺少模型位置属性position', prop);
        let position = Cartesian3.fromDegrees(prop.position.longitude, prop.position.latitude, prop.position.height || 0);
        let heading = Math.toRadians(135);
        let pitch = 0;
        let roll = 0;
        let hpr = new HeadingPitchRoll(heading, pitch, roll);
        let orientation = prop.orientation ? prop.orientation : Transforms.headingPitchRollQuaternion(
            position,
            hpr
        );
        let option = {
            id: sourceItem.pid,
            name: sourceItem.name,
            position: position,
            orientation: orientation,
            model: {
                uri: resource,
                scale: scale
            } as any
        };
        if (prop.position.height === null) {
            option.model.heightReference = HeightReference.CLAMP_TO_GROUND;
        }

        if (prop.DistanceDisplayCondition) {
            let near = prop.DistanceDisplayCondition.near;
            let far = prop.DistanceDisplayCondition.far;
            option.model.distanceDisplayCondition = new DistanceDisplayCondition(near, far);
        }

        // 添加实体最小缩放比例
        prop.minimumPixelSize && (option.model.minimumPixelSize = prop.minimumPixelSize);


        const entity = this.dataSourceTool.entities.add(option);

        // 添加实体运动
        if (prop.motion?.path && prop.motion?.speed) {
            MotionEntity(entity, turf.lineString(prop.motion.path), prop.motion.speed);
        }

        this.sourcesItems.push(sourceItem);
        this.instancesMap.set(entity.id, entity);

        return entity;
    };


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
        let instance = this.getInstancesByPid(pid);
        this.sourcesItems = this.sourcesItems.filter(item => item.pid !== pid);
        if (instance) {
            removeRes = this.dataSourceTool.entities.removeById(pid);
            this.instancesMap.delete(pid);
        }
        return removeRes;
    }

    destroy(): boolean {
        return this.removeAll();
    }
}


export { CesiumGLTF };
