import type { CameraManager } from '../../camera/CameraManager'
import {
    Cartesian3,
    CustomDataSource,
    DistanceDisplayCondition,
    Entity,
    HeadingPitchRoll,
    HeightReference,
    Math, Resource,
    Transforms,
    Viewer
} from 'cesium';

import * as turf from "@turf/turf";
import { MotionEntity } from '../../visualization';
import { ModelResourceItem } from '../types';
import { CesiumData } from './data/CesiumData';
export class ModelManager extends CesiumData<Entity> {
    private readonly dataSourceTool: CustomDataSource;

    constructor(viewer: Viewer, camera: CameraManager) {
        super(viewer, camera);
        this.dataSourceTool = new CustomDataSource('工作区 GLTF - 附加实体集合');
        this.viewer.dataSources.add(this.dataSourceTool);
    }

    async addData(sourceItem: ModelResourceItem): Promise<Entity> {
        const prop = sourceItem.properties
        const url = prop.url;
        const queryParameters = prop.queryParameters || {};
        const scale = prop.scale || 1;


        // 对地形进行深度测试
        this.viewer.scene.globe.depthTestAgainstTerrain = true;
        const resource = new Resource({ url, queryParameters });
        if (!prop.position) { console.log('缺少模型位置属性position', prop); return }
        const position = Cartesian3.fromDegrees(prop.position.longitude, prop.position.latitude, prop.position.height || 0);
        const heading = Math.toRadians(135);
        const pitch = 0;
        const roll = 0;
        const hpr = new HeadingPitchRoll(heading, pitch, roll);
        const orientation = prop.orientation ? prop.orientation : Transforms.headingPitchRollQuaternion(
            position,
            hpr
        );
        const option: Entity.ConstructorOptions = {
            id: sourceItem.id,
            name: sourceItem.name,
            show: sourceItem.show ?? true,
            position: position,
            orientation: orientation,
            model: {
                uri: resource,
                scale: scale
            }
        };
        if (prop.position.height === null) {
            option.model.heightReference = HeightReference.CLAMP_TO_GROUND;
        }

        if (prop.DistanceDisplayCondition) {
            const near = prop.DistanceDisplayCondition.near;
            const far = prop.DistanceDisplayCondition.far;
            option.model.distanceDisplayCondition = new DistanceDisplayCondition(near, far);
        }

        // 添加实体最小缩放比例
        prop.minimumPixelSize && (option.model.minimumPixelSize = prop.minimumPixelSize);

        const motion = prop.motion;
        const route = motion ? turf.lineString(motion.path) : undefined;
        if (motion && (
            !Number.isFinite(motion.speed) ||
            motion.speed <= 0 ||
            turf.length(route, { units: 'meters' }) <= 0
        )) {
            throw new Error('运动速度和路线长度必须大于 0');
        }

        const entity = this.dataSourceTool.entities.add(option);

        // 添加实体运动
        if (motion) {
            MotionEntity(entity, route, prop.motion.speed);
        }

        this.sourcesItems.push(sourceItem);
        this.instancesMap.set(entity.id, entity);

        return entity;
    };


    async flyToById(id: string): Promise<boolean> {
        const entity = this.getInstanceById(id);
        if (!entity) return false;
        return this.camera.flyToTarget(entity, {
            heading: 0, pitch: -90, range: 0
        }).catch(() => false);
    }

    removeById(id: string) {
        let removeRes = false;
        const instance = this.getInstanceById(id);
        this.sourcesItems = this.sourcesItems.filter(item => item.id !== id);
        if (instance) {
            removeRes = this.dataSourceTool.entities.removeById(id);
            this.instancesMap.delete(id);
        }
        return removeRes;
    }

    destroy(): boolean {
        this.removeAll();
        return this.viewer.dataSources.remove(this.dataSourceTool, true);
    }
}
