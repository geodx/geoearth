import * as turf from "@turf/turf";
import {
    Entity, DataSource, Cartesian3, Cartographic, Viewer,
    CzmlDataSource, JulianDate, HeadingPitchRange
} from "cesium";
import { ElMessage } from "element-plus";
import { CoordinateType } from "../../DrawShape/CoordinateType";
import { DrawShape } from "../../DrawShape";
import { getMostDetailedHeight } from "../SceneUtils/getMostDetailedHeight";
import type { WorldDegree } from "../../Impl/Declare";
import { Cartesian3Tool } from "../CoordinateTool/Cartesian3Tool";
import { EntityFactory } from "../../ExpandEntity/EntityFactory";

export enum RoamingEnum {
    PEOPLE_ROAM = 1,
    CAR_ROAM = 2,
    UAV_ROAM = 3,
}

export enum viewEnum {
    TPP = 1,
    FPP = 2,
}
// export type RoamingType = "贴地漫游" | "行人漫游" | "车辆漫游" | "飞行漫游";
async function fetchCZML() {
    const response = await fetch(new URL('/CesiumEarth/pathRoaming/CZML.json', import.meta.url))
    const json = await response.json()
    return json;
}
export class PathRoaming {
    private viewer: Viewer;
    private speed: number = 50;// 速度
    private multiplier = 1;
    private roamingType = RoamingEnum.CAR_ROAM;
    private viewType: viewEnum;
    /**显示路径实体*/
    private pathEntity: Entity;

    private _roamingPath: number[][] = []; // 漫游路径 
    private czmlCache?: any;
    private czmlDataSource?: DataSource;
    private isRoaming: boolean = false; // 是否创建了漫游
    private listener?: () => void;  // view2 时的事件监听
    private trackingEntity?: Entity;  // 视角跟踪的 Entity
    private destroyed = false;
    private baseCzmlTemplate: any
    constructor(viewer: Viewer, opt: any = {}) {
        this.viewer = viewer;
        this.multiplier = opt.multiplier ?? this.multiplier;
        this.roamingType = opt.roamingType ?? this.roamingType;
        this.viewType = opt.viewType ?? viewEnum.TPP;
        this.viewer.clock.multiplier = this.multiplier;

        this.pathEntity = new Entity();
        this.viewer.entities.add(this.pathEntity);
        fetchCZML().then(czml => {
            this.baseCzmlTemplate = czml;
        })
    }

    get showPath(): boolean {
        return this.pathEntity.show;
    }
    set showPath(v: boolean) {
        this.pathEntity.show = v;
    }
    /**
      * 获取漫游路径
      * @returns { number[][] }
      */
    get roamingPath(): number[][] {
        return this._roamingPath;
    }
    /**设置漫游路径(会先stop)*/
    set roamingPath(path: number[][]) {
        this.stopRoaming();
        this._roamingPath = path;
    }


    /**
     * 设置基础速度,请在设置漫游路径前使用,否则不会改变当前正在漫游的速度
     * @param { number } speed 速度
     */
    set roamSpeed(speed: number) {
        if (!this.isRoaming) {
            this.speed = speed;
        } else {
            ElMessage.error("请在设置漫游路径前使用");
        }
    }

    /**
     * 获取础速度,注意,该速度不一定为实际动画速度
     * @returns { number }
     */
    get roamSpeed(): number {
        return this.speed;
    }

    /**
     * 设置漫游速度,实际为设置 clock 运行倍速,请传入大于 0 的参数
     * @param { number } multiple 基础速度的倍数,例如 speed 为 10,要设置为 20 请传入 2
     */
    set runSpeed(multiple: number) {
        if (multiple > 0) {
            this.viewer.clock.multiplier = multiple;
        } else {
            ElMessage.error("请设置大于0的值");
        }
    }
    /**
      * 绘制路线(折线)并设置漫游路径
      * - heightOffset存在：用平均高+偏移
      * - 否则：用turf lineChunk细分，再ry采样贴地高度
      */
    drawLine(heightOffset?: number): Promise<null> {
        this.stopRoaming();
        return new Promise((resolve) => {
            const drawShape = new DrawShape(this.viewer);
            drawShape.drawPolyLine({
                coordinateType: CoordinateType.cartographicPoiArr,
                endCallback: async (poiArr: number[][]) => {
                    if (this.destroyed) return;
                    const line = turf.lineString(poiArr);
                    let path: number[][] = [];

                    if (heightOffset != null) {
                        const avgH = poiArr.reduce((sum, p) => sum + (p[2] ?? 0), 0) / poiArr.length;
                        path = line.geometry.coordinates.map((c: number[]) => [c[0]!, c[1]!, avgH + heightOffset]);
                    } else {
                        const totalLenM = turf.length(line, { units: "meters" });
                        const coords: number[][] = [];
                        turf.lineChunk(line, totalLenM / 50, { units: "meters" })
                            .features.forEach((f: any) => {
                                coords.push(...f.geometry.coordinates);
                            });

                        // 先转成对象数组，采样高度，再转回[number[]]
                        let pts: WorldDegree[] = coords.map((c) => ({ longitude: c[0]!, latitude: c[1]!, height: 0 }));
                        pts = await getMostDetailedHeight(this.viewer, pts);
                        path = pts.map((p) => [p.longitude!, p.latitude!, p.height!]);
                    }
                    this.roamingPath = path;
                    // 生成发光线并显示
                    this.pathEntity = EntityFactory.createLightingLine(Cartesian3Tool.formCartographicArrS(poiArr));
                    this.viewer.entities.add(this.pathEntity);

                    resolve(null);
                },
            });
        });
    }
    /**
     * 开始漫游 
     * @param { viewType } viewType 漫游视角 
     */
    async startRoaming(viewType: viewEnum = viewEnum.TPP): Promise<void> {
        if (this.roamingPath.length === 0) {
            ElMessage.error("漫游路径为空");
            return;
        }
        if (this.isRoaming) {
            // 用于暂停后恢复
            if (this.viewType === viewEnum.TPP) {
                this.viewer.trackedEntity = this.trackingEntity;
            }
            this.viewer.clock.shouldAnimate = true;
            return
        }
        // 初始化并开始漫游
        this.czmlCache = await this.buildCZML(this.roamingPath);

        // 漫游视角 1, 2 分别对应 view1 和 view2
        this.viewType = viewType;
        this.czmlCache[1].id += Date.now() + ''
        this.viewer.dataSources.add(CzmlDataSource.load(this.czmlCache)).then(ds => {
            console.log(ds);
            this.czmlDataSource = ds;
            this.trackingEntity = ds.entities.getById(this.czmlCache[1].id) as Entity;
            if (this.viewType === viewEnum.TPP) {
                this.view1();
            } else {
                this.view2();
            }
        });

        this.viewer.clock.multiplier = 1;
        this.viewer.clock.shouldAnimate = true;
        this.isRoaming = true;

    }

    /**
     * 暂停漫游
     */
    stopRoaming() {
        this.viewer.trackedEntity = undefined;
        this.viewer.clock.shouldAnimate = false;
    }

    /**
     * 销毁
     */
    destroy() {
        this.viewer.clock.shouldAnimate = false;
        this.isRoaming = false;
        if (this.listener) {
            this.viewer.scene.postRender.removeEventListener(this.listener);
        }
        if (this.czmlDataSource) {
            this.viewer.dataSources.remove(this.czmlDataSource);
        }
        this.viewer.trackedEntity = undefined;
        this.trackingEntity = new Entity();
        this.czmlCache = JSON.parse(JSON.stringify(this.baseCzmlTemplate));
        if (this.pathEntity) {
            this.viewer.entities.remove(this.pathEntity);
            this.pathEntity = new Entity();
        }
        this.roamingPath.length = 0;
    }

    /**
     * 构建 CZML
     * @param { number[][] } ps 漫游路径(角度)
     */
    buildCZML(ps: number[][]): any {
        if (ps.length === 0) {
            ElMessage.error("请传入有效漫游路径");
            return;
        }

        this.setRoamingType(this.roamingType);
        const czml = JSON.parse(JSON.stringify(this.baseCzmlTemplate));
        const startTime = JulianDate.fromIso8601("2012-08-04T10:00:00Z");
        let currentTime = startTime.clone();
        let lastPosition: number[];
        const cartographicArr = czml[1].position.cartographicDegrees;
        // 添加 position
        ps.forEach((nowPosition) => {
            if (lastPosition) {
                let from = turf.point(lastPosition);
                let to = turf.point(nowPosition);
                // 计算两点间长度
                let distance = turf.rhumbDistance(from, to, { units: 'meters' });
                // 计算新时间
                currentTime = JulianDate.addSeconds(
                    currentTime,
                    Math.ceil(distance / this.speed),
                    currentTime
                );
            }
            // 添加路径，注意坐标为经纬度，且格式为 [时间节点，经度, 维度, 高, ...]，此处时间节点就是用来计算速度的，每一个线段起始时间节点与终止时间节点定义了当前线段的速度
            cartographicArr.push(JulianDate.toIso8601(currentTime));
            cartographicArr.push(nowPosition[0]);
            cartographicArr.push(nowPosition[1]);
            cartographicArr.push(nowPosition[2]);
            lastPosition = nowPosition;
        });
        // 根据上述计算的时间修改 availability
        czml[1].availability = `${startTime}/${currentTime}`;
        return czml;
    }

    /**
     * 设置模型
     * @param { roamingType } roamingType , 1:"行人漫游", (默认)2:"车辆漫游", 3:"飞行漫游"
     */
    setRoamingType(roamingType: RoamingEnum = RoamingEnum.CAR_ROAM): void {
        this.roamingType = roamingType;
        switch (roamingType) {
            case RoamingEnum.PEOPLE_ROAM:
                this.baseCzmlTemplate[1].model.gltf = "/CesiumEarth/pathRoaming/model/Cesium_Man.glb";
                this.baseCzmlTemplate[1].model.scale = 0.9;
                break;
            case RoamingEnum.CAR_ROAM:
                this.baseCzmlTemplate[1].model.gltf = "/CesiumEarth/pathRoaming/model/GroundVehicle.glb"
                this.baseCzmlTemplate[1].model.scale = 1;
                break;
            case RoamingEnum.UAV_ROAM:
                this.baseCzmlTemplate[1].model.gltf = "/CesiumEarth/pathRoaming/model/Cesium_Air.glb"
                this.baseCzmlTemplate[1].model.scale = 0.1;
                break;
        }
    }

    /**
     * 漫游视角1
     */
    view1() {
        this.viewer.trackedEntity = this.trackingEntity;
        this.listener = this.viewer.scene.postRender.addEventListener(() => {
            if (this.trackingEntity && this.viewer.clock.shouldAnimate) {
                // 获取当前时间的位置
                const curPoint = this.trackingEntity.position?.getValue(this.viewer.clock.currentTime);
                if (curPoint) {
                    this.viewer.scene.clampToHeight(curPoint, []);
                }
            }
        });
    }

    /**
     * 漫游视角2
     */
    view2() {
        let prePoint: Cartesian3;
        this.listener = this.viewer.scene.postRender.addEventListener(() => {
            if (this.trackingEntity && this.viewer.clock.shouldAnimate) {
                // 获取当前时间的位置
                const curPoint = this.trackingEntity.position?.getValue(this.viewer.clock.currentTime);
                if (prePoint && curPoint) {
                    // // 计算 heading
                    // let heading = getHeading(prePoint, curPoint);
                    // // 计算 pitch
                    // let pitch = Math.toRadians(-30.0);
                    // let range = 100;
                    // this.viewer.camera.lookAt(
                    //     curPoint,
                    //     new HeadingPitchRange(heading, pitch, range)
                    // );
                    this.viewer.scene.clampToHeight(curPoint);

                }
                // 当前点在下一次渲染时为前一个点
                prePoint = Cartesian3.clone(curPoint!);
            }
        });
    }
}
