import {
    Viewer, BillboardCollection, LabelCollection, Cartesian3, HeightReference,
    VerticalOrigin, NearFarScalar, Color, DistanceDisplayCondition, LabelStyle, Cartesian2
} from "cesium";

export class PrimitiveLabelCol {
    public readonly viewer: Viewer;

    private readonly billboards: BillboardCollection;
    private readonly labels: LabelCollection;

    private readonly billboardScale: number;
    private readonly labelScale: number;

    constructor(viewer: Viewer, billboardScale: number = 0.6, labelScale: number = 0.4) {
        this.viewer = viewer;

        this.billboards = this.viewer.scene.primitives.add(new BillboardCollection())

        this.labels = this.viewer.scene.primitives.add(new LabelCollection())

        this.billboardScale = billboardScale;
        this.labelScale = labelScale;
    }

    public _add(position: Cartesian3, text: string, image: string | HTMLCanvasElement): void {
        this.addBillboard(position, image);
        this.addLabel(position, text);
    }

    public addBillboard(position: Cartesian3, image: string | HTMLCanvasElement) {
        this.billboards.add({
            position,
            // heightReference: HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            image,
            scale: this.billboardScale,
            verticalOrigin: VerticalOrigin.BOTTOM,
            scaleByDistance: new NearFarScalar(5e4, 1, 1e6, 0.4),
        });
    }

    public addLabel(position: Cartesian3, text: string) {
        this.labels.add({
            position,
            text,
            fillColor: Color.WHITE,
            // heightReference: HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: this.labelScale,
            font: "normal 40px MicroSoft YaHei",
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e5),
            scaleByDistance: new NearFarScalar(5e4, 1, 1e6, 0.4),
            verticalOrigin: VerticalOrigin.BOTTOM,
            style: LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cartesian2(14, -4),
            outlineWidth: 20,
            outlineColor: Color.BLACK,
        });
    }

    public remove(): void {
        this.viewer.scene.primitives.remove(this.billboards);
        this.viewer.scene.primitives.remove(this.labels);
    }
}