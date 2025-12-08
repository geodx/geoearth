
import { Cartesian2, defined, CallbackProperty } from "cesium";
import { Viewer, Entity, ScreenSpaceEventHandler, Rectangle, Color, Cartesian3, ScreenSpaceEventType, Cartographic, PerspectiveFrustum } from "cesium";


class OverviewMap {
    private mainViewer: Viewer;
    private overview: Viewer;
    private viewRectEntity?: Entity;
    private handler: ScreenSpaceEventHandler;
    private isOverViewEvent: boolean;
    private currentRect: Rectangle
    constructor(viewer3D: Viewer, viewerOM: Viewer) {
        this.mainViewer = viewer3D;
        this.overview = viewerOM;
        this.handler = new ScreenSpaceEventHandler(this.overview.canvas);
        this.isOverViewEvent = false
        this.currentRect = Rectangle.MAX_VALUE
        this.initViewRectangle();
        this.syncMainToOverview();
        this.syncOverviewToMain();
    }

    // 绘制主视图范围红框
    private initViewRectangle() {
        this.viewRectEntity = this.overview.entities.add({
            rectangle: {
                coordinates: new CallbackProperty(() => { return this.currentRect }, false),
                material: Color.RED.withAlpha(0.1),
                outline: true,
                outlineColor: Color.RED,
                outlineWidth: 1,
                height: 0,
            },
        });
    }
    // 主视图  
    private syncMainToOverview() {
        // 引起事件监听的相机变化幅度
        this.mainViewer.camera.percentageChanged = 0.05;
        //    scene.postUpdate 应该要丝滑点

        let worldPosition: Cartesian3 | undefined;
        let distance;
        this.mainViewer.camera.changed.addEventListener(() => {
            if (this.isOverViewEvent) return;
            const height = this.mainViewer.camera.positionCartographic.height
            // 如果相机太高，computeViewRectangle 会返回 undefined
            if (height > 10000000) return;
            // 视图的中心是3D摄影机聚焦的点
            let viewCenter = new Cartesian2(
                Math.floor(this.mainViewer.canvas.clientWidth / 2),
                Math.floor(this.mainViewer.canvas.clientHeight / 2)
            );
            // 给定中心的像素，获取世界位置
            let newWorldPosition = this.mainViewer.scene.camera.pickEllipsoid(viewCenter);
            if (defined(newWorldPosition)) {
                // Guard against the case where the center of the screen  does not fall on a position on the globe
                worldPosition = newWorldPosition;
            }
            if (worldPosition) {
                // 获取相机聚焦点的世界位置与相机的世界位置之间的距离
                distance = Cartesian3.distance(
                    worldPosition,
                    this.mainViewer.scene.camera.positionWC
                );
                // 告诉2D相机查看焦点。距离控制二维视图中的缩放程度
                this.overview.camera.lookAt(
                    worldPosition,
                    new Cartesian3(0.0, 0.0, distance * 8)
                );
                this.currentRect = this.getViewRectangle(worldPosition, distance) ?? this.currentRect
            }
        });
    }

    private getViewRectangle(centerWorld: Cartesian3, distance: number): Rectangle | undefined {
        const width = this.mainViewer.canvas.clientWidth
        const height = this.mainViewer.canvas.clientHeight
        if (width === 0 || height === 0) return undefined;
        //真实宽高比
        const aspectRatio = width / height;
        //当前 FOV（Cesium 默认 60° ≈ 1.0472 弧度）
        const frustum = this.mainViewer.camera.frustum as PerspectiveFrustum;
        const fov = frustum.fov as number;
        //计算水平和垂直半视场角
        const halfVFov = fov / 2;
        const halfHFov = Math.atan(Math.tan(halfVFov) * aspectRatio);
        //相机三个轴的方向
        const direction = this.mainViewer.camera.direction;
        const right = this.mainViewer.camera.right;
        const up = this.mainViewer.camera.up;
        //计算屏幕四个角相对于中心点的偏移向量
        const corners: Cartesian3[] = [];
        const offsets = [
            { right: -1, up: -1 }, // 左下
            { right: 1, up: -1 }, // 右下
            { right: 1, up: 1 }, // 右上
            { right: -1, up: 1 }, // 左上
        ];
        for (const o of offsets) {
            const offset = new Cartesian3();
            // right 方向偏移
            Cartesian3.multiplyByScalar(right, o.right * Math.tan(halfHFov) * distance, offset);
            // up 方向偏移
            const upOffset = new Cartesian3();
            Cartesian3.multiplyByScalar(up, o.up * Math.tan(halfVFov) * distance, upOffset);
            // 合并偏移
            Cartesian3.add(offset, upOffset, offset);
            // 加上中心点 → 得到四个角的世界坐标
            Cartesian3.add(centerWorld, offset, offset);
            corners.push(offset);
        }
        //转经纬度，求外接矩形
        const cartographics = corners.map(p => Cartographic.fromCartesian(p)).filter(c => c !== null) as Cartographic[];
        if (cartographics.length === 0) return undefined;
        return Rectangle.fromCartographicArray(cartographics);
    }


    //操作鹰眼红框，控制主视图 
    private syncOverviewToMain() {
        let isDraggingBox = false;
        // 左键按下
        this.handler.setInputAction((movement: any) => {
            const picked = this.overview.scene.pick(movement.position);
            const isOnBox = picked && picked.id === this.viewRectEntity;
            if (isOnBox) {
                isDraggingBox = true;
                this.overview.canvas.style.cursor = "move";
            }
        }, ScreenSpaceEventType.LEFT_DOWN);
        //  鼠标移动
        this.handler.setInputAction((movement: any) => {
            const position = movement.endPosition;
            // 动态切换光标 
            const picked = this.overview.scene.pick(position);
            const isOverBox = picked && picked.id === this.viewRectEntity;
            this.overview.canvas.style.cursor = isOverBox ? "move" : "pointer";
            // 2. 拖拽中：只移动红框
            if (isDraggingBox) {
                const currentPos = this.overview.camera.pickEllipsoid(position);
                if (!currentPos) return;
                const newRect = this.resetRec(currentPos, this.currentRect)
                this.currentRect = Rectangle.clone(newRect);
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        // 左键松开：只有拖拽红框时才更新主视图
        this.handler.setInputAction((movement: any) => {
            if (isDraggingBox) {
                const center = Rectangle.center(this.currentRect);
                // 松手才更新主视图 
                this.jumpToPosition(Cartesian3.fromRadians(center.longitude, center.latitude));
                isDraggingBox = false;
                return;
            }
            // 点击空白处：松手才跳转 
            const cartesian = this.overview.camera.pickEllipsoid(movement.position);
            if (cartesian) {
                const newRect = this.resetRec(cartesian, this.currentRect)
                this.currentRect = Rectangle.clone(newRect);
                this.jumpToPosition(cartesian);
            }
        }, ScreenSpaceEventType.LEFT_UP);

    }

    // 统一跳转函数 
    private jumpToPosition(cartesian: Cartesian3) {
        this.isOverViewEvent = true
        const cartographic = Cartographic.fromCartesian(cartesian);
        const height = this.mainViewer.camera.positionCartographic.height
        this.mainViewer.camera.setView({
            destination: Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                height
            ),
            orientation: {
                heading: this.mainViewer.camera.heading,
                pitch: this.mainViewer.camera.pitch,
                roll: this.mainViewer.camera.roll
            },
        });
        const onceCallback = () => {
            this.isOverViewEvent = false;
            this.mainViewer.camera.moveEnd.removeEventListener(onceCallback);
        };
        this.mainViewer.camera.moveEnd.addEventListener(onceCallback)
    }
    /**
     * 根据newPos重新计算矩形rect的位置，
     * @param newPos 
     * @param rect 
     * @returns 
     */
    private resetRec(newPos: Cartesian3, rect: Rectangle) {
        const currentPos = Cartographic.fromCartesian(newPos)
        const halfWidth = (rect.east - rect.west) / 2;
        const halfHeight = (rect.north - rect.south) / 2;
        const newCenterLon = currentPos.longitude;
        const newCenterLat = currentPos.latitude;
        const newRect = Rectangle.fromRadians(
            newCenterLon - halfWidth,
            newCenterLat - halfHeight,
            newCenterLon + halfWidth,
            newCenterLat + halfHeight
        );
        return newRect
    }
    destroy() {
        // this.viewer.container.onmouseenter = undefined;
        // this.map.getViewport().onmouseenter = undefined;
        // this.activateContainer = '';
        // this.map.removeLayer(this.layer);
        this.handler?.destroy();
        if (this.viewRectEntity) {
            this.overview.entities.remove(this.viewRectEntity);
            this.viewRectEntity = undefined;
        }
    }
}

export { OverviewMap };