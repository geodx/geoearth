import CesiumEarth from "@/lib/CesiumEarth";
import type { Appearance } from "cesium";
import { MaterialAppearance, Material } from "cesium";
import {
    Viewer, Color, Cartesian3, Entity, Primitive, PolygonGeometry,
    PolygonHierarchy, VertexFormat, GeometryInstance, PerInstanceColorAppearance,
    PolylineDashMaterialProperty, DistanceDisplayCondition, NearFarScalar,
    VerticalOrigin, LabelStyle, Cartesian2
} from "cesium";
export class AreaLabel {
    private viewer: Viewer;

    /**每个区域对应的颜色(索引与features一致)*/
    private colors: Color[];

    /**每个区域对应的标签信息(索引与features一致)*/
    private labels: Array<{ position: Cartesian3; label: string }>;

    /**GeoJSON Feature数组(Polygon/MultiPolygon)*/
    private features: any[];

    private entities: Entity[] = [];

    private primitives: Primitive[] = [];

    /**
     * @param viewer Viewer
     * @param colors 每个区域颜色
     * @param labels 每个区域标签(位置+文本)
     * @param features GeoJSON Feature数组
     */
    constructor(
        viewer: Viewer,
        colors: Color[],
        labels: Array<{ position: Cartesian3; label: string }>,
        features: any[],
    ) {
        this.viewer = viewer;
        this.colors = colors;
        this.labels = labels;
        this.features = features;
    }

    /**批量添加*/
    init(): void {
        this.features.forEach((feature, index) => {
            this.addRegion(feature, index);
        });
    }

    /**销毁清理*/
    destroy(): void {
        //Entity清理
        this.entities.forEach((e) => this.viewer.entities.remove(e));
        this.entities = [];

        //Primitive清理
        this.primitives.forEach((p) => this.viewer.scene.primitives.remove(p));
        this.primitives = [];
    }

    /**添加单个区域(面+边界线+标签)*/
    private addRegion(feature: any, index: number): void {
        const color = this.colors[index] ?? Color.WHITE;
        const labelInfo = this.labels[index];
        //1)解析坐标→[lon,lat,height]
        const degreesArrayHeights = this.getDegreesArrayHeights(feature);

        //2)转Cartesian3数组
        const positions = Cartesian3.fromDegreesArrayHeights(degreesArrayHeights);

        //3)面:PolygonGeometry→GeometryInstance→Primitive
        const polygonGeometry = new PolygonGeometry({
            polygonHierarchy: new PolygonHierarchy(positions),
            vertexFormat: VertexFormat.ALL,
        });

        const geometry = PolygonGeometry.createGeometry(polygonGeometry);
        if (!geometry) return;
        const geometryInstance = new GeometryInstance({ geometry });

        const primitive = this.viewer.scene.primitives.add(
            new Primitive({
                geometryInstances: geometryInstance,
                appearance: new CesiumEarth.SuperiorEntity.PrimitiveGradientAppearance(color) as Appearance,
                // asynchronous: false,
                asynchronous: !import.meta.env.DEV,
            }),
        );

        this.primitives.push(primitive);
        //4)边界线Entity:虚线材质
        const borderEntity = this.viewer.entities.add({
            polyline: {
                positions,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: color.withAlpha(1),
                }),
            },
        });
        this.entities.push(borderEntity);

        //5)标签Entity
        if (labelInfo?.position) {
            const labelEntity = this.viewer.entities.add({
                position: labelInfo.position,
                label: {
                    text: labelInfo.label ?? "",
                    fillColor: color,
                    scale: 0.5,
                    font: "normal 45px MicroSoft YaHei",
                    distanceDisplayCondition: new DistanceDisplayCondition(0, 9e6),
                    scaleByDistance: new NearFarScalar(5e4, 1, 5e5, 0.5),
                    verticalOrigin: VerticalOrigin.BOTTOM,
                    style: LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cartesian2(0, -10),
                    outlineWidth: 10,
                    outlineColor: Color.BLACK,
                },
            });
            this.entities.push(labelEntity);
        }
    }

    /**
     * 从GeoJSON Feature提取Polygon/MultiPolygon的外环坐标
     * 输出扁平数组:[lon,lat,height,lon,lat,height,...]
     */
    private getDegreesArrayHeights(feature: any): number[] {
        const out: number[] = [];
        const geom = feature?.geometry;
        if (!geom) return out;

        let ring: number[][] = [];

        if (geom.type === "MultiPolygon") {
            //原代码只取了第一个polygon的外环:coordinates[0][0]
            ring = geom.coordinates?.[0]?.[0] ?? [];
        } else if (geom.type === "Polygon") {
            ring = geom.coordinates?.[0] ?? [];
        }

        for (let i = 0; i < ring.length; i++) {
            const p = ring[i];
            if (!p) continue; //至少要有经纬度
            out.push(p[0]!, p[1]!, p[2] ?? 100);
        }

        return out;
    }

}