import { Cartesian2, Cartesian3, Color, Entity, PointGraphics, SceneTransforms, Viewer } from "cesium";

export interface LonLatHeight {
    longitude: number;
    latitude: number;
    height: number;
}

export interface GradientLabelOptions extends LonLatHeight {
    /** 超过该相机高度(米)则隐藏DOM */
    hideWhenCameraHeightGt?: number; // default 4000
    /** DOM bottom偏移(像素) */
    bottomOffsetPx?: number; // default 67
    /** 点样式 */
    pointPixelSize?: number; // default 10
    pointColor?: Color; // default RED
}

/**
 * 给一个Entity绑定“渐变标签”(DOM跟随)，并在Entity上加一个红点PointGraphics。
 * - postRender里更新DOM位置
 * - entity从collection移除后自动destroy
 */
export class GradientLabelPointDecorator {
    private readonly viewer: Viewer;
    private readonly entity: Entity;
    private readonly info: LonLatHeight;

    private readonly rootEl: HTMLDivElement;

    private screenPos = new Cartesian2();
    private worldPos?: Cartesian3;

    private readonly hideWhenCameraHeightGt: number;
    private readonly bottomOffsetPx: number;
    private readonly pointPixelSize: number;
    private readonly pointColor: Color;

    // 事件句柄引用，便于remove
    private readonly onPostRender: () => void;
    private readonly onCollectionChanged: (collection: any, added: any, removed: any) => void;

    constructor(viewer: Viewer, entity: Entity, opts: GradientLabelOptions) {
        this.viewer = viewer;
        this.entity = entity;
        this.info = { longitude: opts.longitude, latitude: opts.latitude, height: opts.height };

        this.hideWhenCameraHeightGt = opts.hideWhenCameraHeightGt ?? 4000;
        this.bottomOffsetPx = opts.bottomOffsetPx ?? 67;
        this.pointPixelSize = opts.pointPixelSize ?? 10;
        this.pointColor = opts.pointColor ?? Color.RED;

        this.rootEl = document.createElement("div");

        // 给entity加一个点 
        this.entity.point = new PointGraphics({
            pixelSize: this.pointPixelSize,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: this.pointColor,
        });

        // 绑定回调(保持this)
        this.onPostRender = this.updateDomPosition.bind(this);

        // Cesium的collectionChanged签名： 
        // 这里只关心removed里是否包含当前entity
        this.onCollectionChanged = (_collection: any, _added: any, removed: any) => {
            // removed通常是Entity[]，也可能是EntityCollection内部数组
            const removedList: any[] = Array.isArray(removed) ? removed : removed?._array ?? removed?.values ?? [];
            const isRemoved = removedList?.some((e) => e?.id === this.entity.id);
            if (isRemoved) {
                this.destroy();
            }
        };

        this.init();
    }

    /** 创建DOM并挂到Cesium容器 */
    private createDom() {
        this.rootEl.classList.add("gradient-label");

        const content = document.createElement("div");
        // innerHTML结构
        content.innerHTML = `<div style="text-align: left">
                                <div>经度：${Number(this.info.longitude.toFixed(6))}°</div>
                                <div>纬度：${Number(this.info.latitude.toFixed(6))}°</div>
                                <div>高程：${Number(this.info.height.toFixed(6))}m</div>
                            </div>`;

        this.rootEl.appendChild(content);

        // viewer.cesiumWidget.container
        this.viewer.cesiumWidget.container.appendChild(this.rootEl);
    }

    /** 初始化：创建DOM、绑定postRender、监听实体移除 */
    private init() {
        this.createDom();

        // 逐帧更新DOM位置
        this.viewer.scene.postRender.addEventListener(this.onPostRender);

        // 监听实体被移除：从entityCollection里找(有则用，没有就降级不监听)
        const collection = this.entity.entityCollection;
        if (collection?.collectionChanged?.addEventListener) {
            collection.collectionChanged.addEventListener(this.onCollectionChanged);
        }
    }

    /** 释放：解绑事件+移除DOM */
    destroy() {
        // 防御：DOM可能已被移除
        if (this.rootEl.parentElement) {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }

        this.viewer.scene.postRender.removeEventListener(this.onPostRender);

        const collection = (this.entity as any).entityCollection;
        if (collection?.collectionChanged?.removeEventListener) {
            collection.collectionChanged.removeEventListener(this.onCollectionChanged);
        }
    }

    /** postRender回调：更新屏幕位置/显隐 */
    private updateDomPosition() {
        const canvasHeight = this.viewer.scene.canvas.height;

        // 取entity当前世界坐标
        if (this.entity.position) {
            this.worldPos = this.entity.position.getValue(this.viewer.clock.currentTime);
        }
        if (!this.worldPos) return;

        // 屏幕坐标
        const ok = SceneTransforms.worldToWindowCoordinates(
            this.viewer.scene,
            this.worldPos,
            this.screenPos,
        );
        if (!ok) return;

        // CSS定位
        this.rootEl.style.position = "absolute";

        // 你原来的 bottom 计算：canvasHeight / devicePixelRatio - y + 67
        this.rootEl.style.bottom =
            canvasHeight / window.devicePixelRatio - this.screenPos.y + this.bottomOffsetPx + "px";

        const width = this.rootEl.offsetWidth;
        this.rootEl.style.left = this.screenPos.x - width / 2 - 2 + "px";

        // 相机高度过高就隐藏
        const cameraHeight = this.viewer.camera.positionCartographic.height;
        this.rootEl.style.display = cameraHeight > this.hideWhenCameraHeightGt ? "none" : "block";
    }
}
