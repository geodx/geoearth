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

import { TrajectoryPlayer } from '../../tools/trajectory/index';
import { ModelResourceItem } from '../types';
import { CesiumData } from './data/CesiumData';
export class ModelManager extends CesiumData<Entity> {
    private readonly dataSourceTool: CustomDataSource;
    private readonly motionPlayers = new Map<string, TrajectoryPlayer>();

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
        if (motion && (
            !Number.isFinite(motion.speed) ||
            motion.speed <= 0 ||
            !Array.isArray(motion.path) || motion.path.length < 2
        )) {
            throw new Error('运动速度和路线长度必须大于 0');
        }

        const entity = this.dataSourceTool.entities.add(option);

        // 模型资源只负责接入轨迹工具；运动不修改全局时钟，也不接管相机。
        if (motion) {
            const player = new TrajectoryPlayer(this.viewer, { entity, speed: motion.speed, loop: true, showPath: false });
            try {
                player.setPath(motion.path.map(point => ({ position: {
                    // 二维路线沿用模型配置高度，不额外做地形采样。
                    longitude: point[0], latitude: point[1], height: prop.position.height ?? 0,
                } })));
                player.play();
                this.motionPlayers.set(entity.id, player);
            } catch (error) {
                player.destroy();
                this.dataSourceTool.entities.remove(entity);
                throw error;
            }
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
        this.motionPlayers.get(id)?.destroy();
        this.motionPlayers.delete(id);
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
