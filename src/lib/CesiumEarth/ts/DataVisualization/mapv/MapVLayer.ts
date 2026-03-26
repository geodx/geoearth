import { MapVRenderer } from "./MapVRenderer";
import { Viewer, Scene, ScreenSpaceEventHandler, ScreenSpaceEventType } from "cesium";

class MapVLayer {
    private viewer: Viewer;
    private scene: Scene;
    private mapvBaseLayer: MapVRenderer;
    private mapVOptions: any;
    private devicePixelRatio: number;
    public canvas: HTMLCanvasElement;
    private container: Element;

    private handler: any;
    private innerMoveStart: () => void;
    private innerMoveEnd: () => void;

    constructor(viewer: Viewer, dataSet: any, options: any, container?: HTMLElement) {
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.mapvBaseLayer = new MapVRenderer(viewer, dataSet, options, this);
        this.mapVOptions = options;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.canvas = this._createCanvas();
        if (container) {
            this.container = container;
            this.container.appendChild(this.canvas);
        } else {
            this.container = viewer.container;
            this.container.appendChild(this.canvas);
        }
        this.innerMoveStart = this.moveStartEvent;
        this.innerMoveEnd = this.moveEndEvent;

        this.bindEvent();
        this._reset();
    }



    private bindEvent(): void {
        this.scene.camera.moveStart.addEventListener(this.innerMoveStart, this);
        this.scene.camera.moveEnd.addEventListener(this.innerMoveEnd, this);

        const eventHandler = new ScreenSpaceEventHandler(this.canvas);
        // 添加左键监听
        eventHandler.setInputAction(() => {
            this.innerMoveEnd();
        }, ScreenSpaceEventType.LEFT_UP);
        // 添加右键监听
        eventHandler.setInputAction(() => {
            this.innerMoveEnd();
        }, ScreenSpaceEventType.RIGHT_UP);

        this.handler = eventHandler;
    }

    private unbindEvent(): void {
        this.scene.camera.moveStart.removeEventListener(this.innerMoveStart, this);
        this.scene.camera.moveEnd.removeEventListener(this.innerMoveEnd, this);
        this.scene.postRender.removeEventListener(this._reset, this);
        if (this.handler) {
            this.handler.destroy();
            this.handler = null;
        }
    }

    private moveStartEvent(): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.animatorMovestartEvent();
            this.scene.postRender.addEventListener(this._reset, this);
        }
    }

    private moveEndEvent(): void {
        this.scene.postRender.removeEventListener(this._reset, this);
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.animatorMoveendEvent();
        }
        this._reset();
    }

    private zoomStartEvent(): void {
        this._unvisiable();
    }

    private zoomEndEvent(): void {
        this._unvisiable();
    }

    public addData(data: any, options: any): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.addData(data, options);
        }
    }

    public updateData(data: any, options: any): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.updateData(data, options);
        }
    }

    public getData(): any {
        if (this.mapvBaseLayer) {
            const dataSet = this.mapvBaseLayer.getData();
            return dataSet;
        }
    }

    public removeData(data: any): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.removeData(data);
        }
    }

    public removeAllData(): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer.clearData();
        }
    }

    private _visiable(): void {
        this.canvas.style.display = "block";
    }

    private _unvisiable(): void {
        this.canvas.style.display = "none";
    }

    private _createCanvas(): HTMLCanvasElement {
        let id = 0;
        const canvas = document.createElement("canvas");
        canvas.id = this.mapVOptions.layerid || "mapv" + id++;
        canvas.style.position = "absolute";
        canvas.style.top = "0px";
        canvas.style.left = "0px";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = this.mapVOptions.zIndex || 100;
        canvas.width = this.viewer.canvas.width
        canvas.height = this.viewer.canvas.height
        canvas.style.width = this.viewer.canvas.style.width;
        canvas.style.height = this.viewer.canvas.style.height;

        const pixelRatio = this.devicePixelRatio;
        if (this.mapVOptions.context === "2d") {
            const context = canvas.getContext(this.mapVOptions.context);
            context?.scale(pixelRatio, pixelRatio);
        }

        return canvas;
    }

    private _reset(): void {
        this.resizeCanvas();
        this.fixPosition();
        this.onResize();
        this.render();
    }

    public draw(): void {
        this._reset();
    }
    public setZIndex(zIndex: string) {
        if (this.canvas) this.canvas.style.zIndex = zIndex
    }
    public show(): void {
        this._visiable();
    }

    public hide(): void {
        this._unvisiable();
    }

    public destroy(): void {
        this.unbindEvent();
        this.remove();
    }

    private remove(): void {
        if (this.mapvBaseLayer) {
            this.removeAllData();
            this.mapvBaseLayer.destroy();
            this.canvas.parentElement?.removeChild(this.canvas);
        }
    }

    public update(value: any): void {
        if (value) {
            this.updateData(value.data, value.options);
        }
    }

    private resizeCanvas(): void {
        if (this.canvas) {
            const canvas = this.canvas;
            canvas.style.position = "absolute";
            canvas.style.top = "0px";
            canvas.style.left = "0px";
            canvas.width = this.viewer.canvas.width
            canvas.height = this.viewer.canvas.height
            canvas.style.width = this.viewer.canvas.style.width;
            canvas.style.height = this.viewer.canvas.style.height;
        }
    }

    private fixPosition(): void {
    }

    private onResize(): void {
    }

    private render(): void {
        if (this.mapvBaseLayer) {
            this.mapvBaseLayer._canvasUpdate();
        }
    }
}

export { MapVLayer };