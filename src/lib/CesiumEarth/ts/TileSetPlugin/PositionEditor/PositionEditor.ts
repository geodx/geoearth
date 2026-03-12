
import CesiumEarth from "@/lib/CesiumEarth";
import { Cesium3DTileFeature, JulianDate, ScreenSpaceEventType, Matrix3, Matrix4, Transforms } from "cesium";
import { ColorMaterialProperty } from "cesium";
import { ScreenSpaceEventHandler } from "cesium";
import { CallbackProperty, PolylineArrowMaterialProperty } from "cesium";
import {
    Viewer, Cesium3DTileset, Cartographic, Math, PolylineGraphics, Color, Entity,
    Cartesian3
} from "cesium"

type params = {
    rx: number,
    ry: number,
    rz: number,
    latitude: number,
    longitude: number,
    height: number,
    scale: number
}
/**
 * Cesium3DTileset 交互编辑类
 */
export class PositionEditor {
    private viewer: Viewer;
    private tileset: Cesium3DTileset;
    private params: params;
    private highlightAxis: { polyline: PolylineGraphics; color: Color; };
    private axisList: Entity[] = [];
    private eventHandler?: ScreenSpaceEventHandler;
    private moveType: string = "";
    private moving = false;
    constructor(viewer: Viewer, tileset: Cesium3DTileset, options?: params) {
        this.viewer = viewer;
        this.tileset = tileset;
        this.params = {
            scale: 1,
            longitude: 0,
            latitude: 0,
            height: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            ...options,
        };
        const cartographic = Cartographic.fromCartesian(this.tileset.boundingSphere.center);
        this.params.longitude = Math.toDegrees(cartographic.longitude);
        this.params.latitude = Math.toDegrees(cartographic.latitude);
        this.params.height = cartographic.height;
        this.highlightAxis = { polyline: new PolylineGraphics(), color: Color.TRANSPARENT };
        this.activate();
    }


    // 激活(构造时会执行)
    public activate(): void {
        this.deactivate();
        this.axisList = [];
        this.createAxis();
        this.registerEvents();
    }

    // 冻结
    public deactivate(): void {
        if (this.eventHandler) {
            this.eventHandler.destroy();
            this.eventHandler = undefined;
        }

        this.axisList.forEach((axisEntity) => {
            this.viewer.entities.remove(axisEntity);
        });
    }
    // 获取参数
    public getParams(): params {
        return this.params;
    }

    private createAxis(): void {
        const xAxis = this.createXaxis();
        this.axisList.push(xAxis);

        const yAxis = this.createYaxis();
        this.axisList.push(yAxis);

        const zAxis = this.createZaxis();
        this.axisList.push(zAxis);
    }
    private createXaxis(): Entity {
        return this.viewer.entities.add({
            type: "axis",
            subType: "xaxis",
            polyline: {
                positions: new CallbackProperty(() => {
                    return Cartesian3.fromDegreesArrayHeights([
                        this.params.longitude,
                        this.params.latitude,
                        this.params.height,
                        this.params.longitude + 0.001,
                        this.params.latitude,
                        this.params.height,
                    ]);
                }, false),
                width: 20,
                material: new PolylineArrowMaterialProperty(Color.BLUE),
            },
        })
    }

    private createYaxis(): Entity {
        return this.viewer.entities.add({
            type: "axis",
            subType: "yaxis",
            polyline: {
                positions: new CallbackProperty(() => {
                    return Cartesian3.fromDegreesArrayHeights([
                        this.params.longitude,
                        this.params.latitude,
                        this.params.height,
                        this.params.longitude,
                        this.params.latitude + 0.001,
                        this.params.height,
                    ]);
                }, false),
                width: 20,
                material: new PolylineArrowMaterialProperty(Color.GREEN),
            },
        })
    }

    private createZaxis(): Entity {
        return this.viewer.entities.add({
            type: "axis",
            subType: "zaxis",
            polyline: {
                positions: new CallbackProperty(() => {
                    return Cartesian3.fromDegreesArrayHeights([
                        this.params.longitude,
                        this.params.latitude,
                        this.params.height,
                        this.params.longitude,
                        this.params.latitude,
                        this.params.height + 60,
                    ]);
                }, false),
                width: 20,
                material: new PolylineArrowMaterialProperty(Color.RED),
            },
        })
    }
    private registerEvents(): void {
        this.eventHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas,);
        this.registerLeftDownEvent();
        this.registerLeftUpEvent();
        this.registerMouseMoveEvent();
    }
    private registerLeftDownEvent(): void {
        this.eventHandler?.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
            const picked = this.viewer.scene.pick(event.position) as
                | Cesium3DTileFeature
                | { id?: Entity }
                | undefined;

            if (!picked || !("id" in picked) || !picked.id || picked.id.type !== "axis") {
                return;
            }

            this.moveType = picked.id.subType ?? "";

            const polyline = picked.id.polyline as PolylineGraphics | undefined;
            if (!polyline) return;

            const material = polyline.material as PolylineArrowMaterialProperty | undefined;
            if (!material) return;

            this.highlightAxis.color = material.color?.getValue(JulianDate.now()) ?? Color.TRANSPARENT;
            this.highlightAxis.polyline = polyline;
            material.color = new ColorMaterialProperty(Color.YELLOW);

            this.viewer.enableCursorStyle = false;
            document.body.style.cursor = "move";

            this.moving = true;
            this.viewer.scene.screenSpaceCameraController.enableRotate = false;
        }, ScreenSpaceEventType.LEFT_DOWN);
    }

    private registerLeftUpEvent(): void {
        this.eventHandler?.setInputAction(() => {
            if (!this.moving) return;

            this.viewer.enableCursorStyle = true;
            document.body.style.cursor = "default";

            const polyline = this.highlightAxis.polyline as PolylineGraphics;
            const material = polyline?.material as PolylineArrowMaterialProperty | undefined;
            if (material) {
                material.color = new ColorMaterialProperty(this.highlightAxis.color);
            }

            this.highlightAxis = {
                polyline: {} as PolylineGraphics,
                color: Color.TRANSPARENT,
            };

            this.moving = false;
            this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        }, ScreenSpaceEventType.LEFT_UP);
    }

    private registerMouseMoveEvent(): void {
        this.eventHandler?.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
            if (!this.moving) return;

            if (this.moveType === "zaxis") {
                this.params.height += event.startPosition.y - event.endPosition.y;
                this.updateModelMatrix();
                return;
            }

            const endCartesian = this.viewer.scene.pickPosition(event.endPosition);
            const startCartesian = this.viewer.scene.pickPosition(event.startPosition);

            if (!endCartesian || !startCartesian) return;

            const endCartographic = Cartographic.fromCartesian(endCartesian);
            const startCartographic = Cartographic.fromCartesian(startCartesian);

            if (this.moveType === "xaxis") {
                this.params.longitude += Math.toDegrees(
                    endCartographic.longitude - startCartographic.longitude,
                );
                this.updateModelMatrix();
                return;
            }

            if (this.moveType === "yaxis") {
                this.params.latitude += Math.toDegrees(
                    endCartographic.latitude - startCartographic.latitude,
                );
                this.updateModelMatrix();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }
    private updateModelMatrix(): void {
        if (!this.tileset) return;

        const rotationX = Matrix3.fromRotationX(
            Math.toRadians(this.params.rx),
        );
        const rotationY = Matrix3.fromRotationY(
            Math.toRadians(this.params.ry),
        );
        const rotationZ = Matrix3.fromRotationZ(
            Math.toRadians(this.params.rz),
        );

        const matrixX = Matrix4.fromRotationTranslation(rotationX);
        const matrixY = Matrix4.fromRotationTranslation(rotationY);
        const matrixZ = Matrix4.fromRotationTranslation(rotationZ);

        const position = Cartesian3.fromDegrees(
            this.params.longitude,
            this.params.latitude,
            this.params.height,
        );

        const modelMatrix = Transforms.eastNorthUpToFixedFrame(position);

        Matrix4.multiply(modelMatrix, matrixX, modelMatrix);
        Matrix4.multiply(modelMatrix, matrixY, modelMatrix);
        Matrix4.multiply(modelMatrix, matrixZ, modelMatrix);

        const scaleMatrix = Matrix4.fromUniformScale(this.params.scale);
        Matrix4.multiply(modelMatrix, scaleMatrix, modelMatrix);

        // 原代码就是这么写的，直接保留
        (this.tileset as any)._root.transform = modelMatrix;
    }
}