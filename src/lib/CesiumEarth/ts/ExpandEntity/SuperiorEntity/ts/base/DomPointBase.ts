import { Cartesian2, Cartesian3, Viewer, Entity, PointGraphics, Color, SceneTransforms, Ellipsoid } from "cesium";
import { getTerrainMostDetailedHeight, isOnBack } from "../../../../Utils/SceneUtils";
import type { WorldDegree } from "../../../../cesium.earth";

type domRenderType = {
    directionX?: "left" | "center" | "right";
    directionY?: "bottom" | "middle" | "top";
    maxHeight?: number;
    callback?: () => any
}

export default class DomPointBase {
    protected viewer: Viewer;
    protected worldDegrees: WorldDegree;
    protected position: Cartesian3;
    protected pointEntity: Entity;
    protected showPointEntiy: boolean;
    protected postRenderFunc: (...args: any[]) => void;
    protected $container: HTMLElement;
    protected start: boolean; // 是否调用了init
    protected isDestroy: boolean; // 是否销毁
    protected visible: boolean;   // 控制dom显隐
    /**
     * @description: dom点基类,不要实例化
     * @param {Viewer} viewer viewer
     * @param {WorldDegree} worldDegrees 点经纬度坐标
     * @param {boolean} showPointEntiy (可选)是否显示点的Entity,默认不显示
     * @return {*}
     */
    constructor(viewer: Viewer, worldDegrees: WorldDegree, showPointEntiy: boolean = false) {
        this.viewer = viewer;
        this.worldDegrees = worldDegrees; // 经纬度高组成的位置
        this.position = new Cartesian3(); // 算上地形的高
        this.pointEntity = new Entity(); // 点Entity
        this.showPointEntiy = showPointEntiy; // 是否显示点Entity
        this.postRenderFunc = () => { }; // postRender事件传入的方法，注册和删除时使用
        this.$container = document.createElement("div"); // 根DOM
        this.$container.style.position = "absolute";
        this.start = false; // 点位是否创建
        this.isDestroy = false; // 点位是否销毁
        this.visible = true;    // DOM显隐
    }

    /**
     * @description: 点位创建接口
     * @return {*}
     */
    init() { }
    /**
     * @description: 点位销毁接口
     * @return {*}
     */
    destroy() { }

    /**
     * @description: 控制DOM显隐
     * @param {boolean} visible 是否显示
     * @return {*}
     */
    setVisible(visible: boolean) {
        this.visible = visible;
    }

    /**
     * @description: 获取当前DOM显隐状态
     * @return { boolean } 是否显示
     */
    getVisible() {
        return this.visible;
    }

    /**
     * @description: 添加点实体
     * @return {*}
     */
    protected addPoint() {
        this.pointEntity = this.viewer.entities.add({
            position: this.position,
            point: new PointGraphics({
                // heightReference: HeightReference.RELATIVE_TO_GROUND,
                pixelSize: 10,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                color: Color.RED,
            }),
        });
    }

    /**
     * @description: 默认的场景渲染事件(主要是位置的修改和显示高度的限制)
     * @param {number} maxHeight (可选)显示最大限制高度(超出将不显示),不传或传入0均不做限制，默认无
     * @param {function} callback (可选)回调函数，在默认场景渲染事件之后执行，默认无
     * @return {*}
     */
    protected postRender(domRender: domRenderType = {}) {
        if (this.showPointEntiy) {
            this.addPoint();
        }
        this.postRenderFunc = () => {
            if (!this.$container) return;

            // 判断是否在地球背面 
            let viewerVisible = isOnBack(this.position, this.viewer.camera.position, Ellipsoid.WGS84)

            if (!viewerVisible) {
                this.$container.style.display = "none";
                return;
            }

            const canvasHeight = this.viewer.scene.canvas.height;
            const windowPosition = new Cartesian2();
            SceneTransforms.worldToWindowCoordinates(
                this.viewer.scene,
                this.position,
                windowPosition
            );
            this.$container.style.display = this.visible ? "block" : "none";

            // X方向位置(默认left)
            // @ts-ignore
            const elWidth = this.$container.firstElementChild?.offsetWidth || 0;
            switch (domRender.directionX) {
                case "left":
                    this.$container.style.left = windowPosition.x + "px";
                    break;
                case "right":
                    this.$container.style.left =
                        windowPosition.x - elWidth + "px";
                    break;
                case "center":
                    this.$container.style.left =
                        windowPosition.x - elWidth / 2 + "px";
                    break;
                default:
                    this.$container.style.left = windowPosition.x + "px";
                    break;
            }

            // Y方向位置(默认bottom) 
            // @ts-ignore
            const elHeight = this.$container.firstElementChild?.offsetHeight || 0;
            switch (domRender.directionY) {
                case "bottom":
                    // 用bottom可以更好的定位底端在点上，比较符合常理
                    this.$container.style.bottom =
                        canvasHeight - windowPosition.y + "px";
                    break;
                case "top":
                    this.$container.style.bottom =
                        canvasHeight - windowPosition.y - elHeight + "px";
                    break;
                case "middle":
                    this.$container.style.bottom =
                        canvasHeight - windowPosition.y - elHeight / 2 + "px";
                    break;
                default:
                    this.$container.style.bottom = canvasHeight - windowPosition.y + "px";
                    break;
            }

            if (domRender.maxHeight) {
                if (
                    this.viewer.camera.positionCartographic.height >
                    domRender.maxHeight
                ) {
                    this.$container.style.display = "none";
                } else {
                    this.$container.style.display = "block";
                }
            }
            if (
                domRender.callback &&
                typeof domRender.callback === "function"
            ) {
                domRender.callback();
            }
        };
        return this.postRenderFunc;
    }

    /**
     * @description: 计算实际位置(地形高)
     * @param {Viewer} viewer viewer
     * @param {WorldDegree} worldDegrees 点经纬度坐标
     * @return {Promise<Cartesian3>} 实际位置
     */
    protected async computePosition(viewer: Viewer, worldDegrees: WorldDegree): Promise<Cartesian3> {
        const terrainHeight = await getTerrainMostDetailedHeight(
            viewer,
            worldDegrees.longitude,
            worldDegrees.latitude
        );
        return Cartesian3.fromDegrees(
            worldDegrees.longitude,
            worldDegrees.latitude,
            terrainHeight + (worldDegrees.height || 0)
        );
    }
}
