/*
 * @Description: 限高分析
 */
import { Viewer, PolygonHierarchy, Entity, ClassificationPrimitive, Color } from "cesium";
import { EntityFactory } from '../ExpandEntity';
import { CallbackProperty, GeometryInstance, PolygonGeometry, ColorGeometryInstanceAttribute, ShowGeometryInstanceAttribute } from "cesium";
export class heightLimitAnalysis {
    #viewer: Viewer;
    #hierarchy: PolygonHierarchy;
    #height: number;
    #entity: Entity;
    #primitive: ClassificationPrimitive;
    #isStart: boolean;
    constructor(viewer: Viewer, hierarchy: PolygonHierarchy, height: number) {
        this.#viewer = viewer;
        this.#hierarchy = hierarchy;
        this.#height = height;
        this.#entity = new Entity();
        this.#primitive = new ClassificationPrimitive();
        this.#isStart = false;
    }

    init() {
        if (!this.#isStart) {
            this.#viewer.scene.invertClassification = true;
            this.#viewer.scene.invertClassificationColor = new Color(1, 1, 1, 1);
            this.#entity = EntityFactory.createHeightPloygon(
                this.#hierarchy,
                new CallbackProperty(() => this.#height, false)
            );
            this.#viewer.entities.add(this.#entity);
            this.#primitive = this.#createClassificationPrimitive();
            this.#viewer.scene.primitives.add(this.#primitive);
            this.#isStart = true;
        }
    }

    destroy() {
        if (this.#isStart) {
            this.#viewer.scene.primitives.remove(this.#primitive);
            this.#viewer.scene.invertClassification = false;
            this.#viewer.entities.remove(this.#entity);
            this.#entity = new Entity();
            this.#primitive = new ClassificationPrimitive();
            this.#isStart = false;
        }
    }

    get height() {
        return this.#height;
    }
    set height(height: number) {
        if (this.#isStart) {
            this.#height = height;
            this.#viewer.scene.primitives.remove(this.#primitive);
            this.#primitive = this.#createClassificationPrimitive();
            this.#viewer.scene.primitives.add(this.#primitive);
        }
    }

    #createClassificationPrimitive() {
        return new ClassificationPrimitive({
            geometryInstances: new GeometryInstance({
                geometry: new PolygonGeometry({
                    polygonHierarchy: this.#hierarchy,
                    height: this.#height,
                    extrudedHeight: 200000
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(
                        Color.RED.withAlpha(0.6)
                    ),
                    show: new ShowGeometryInstanceAttribute(true)
                },
            })
        })
    }
}