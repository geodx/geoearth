import type { Billboard } from "cesium";
import type { PointPrimitive } from "cesium";
import type { Label } from "cesium";
import type { EntityCluster } from "cesium";
import {
    Viewer, Event, GeoJsonDataSource, NearFarScalar, Entity,
    HeightReference, DistanceDisplayCondition, VerticalOrigin, ConstantProperty,
    BillboardGraphics, LabelGraphics, PointGraphics, Color
} from "cesium";


export interface PointClusterOptions {
    pixelRange?: number;
    minimumClusterSize?: number;

    billboard?: boolean; // 默认true
    point?: boolean;     // 默认false
    label?: boolean;     // 默认false

    // 单点默认图片
    billboardImg?: string
}

type Cluster = {
    billboard: Billboard;
    label: Label;
    point: PointPrimitive;
};

export class PointClusterGeoJson {
    #viewer: Viewer;
    #geojson: string;
    #options: PointClusterOptions;

    DataLoadedEvent: Event;

    #dataSource: GeoJsonDataSource;
    #inited: boolean;

    #clusterListener?: (clusteredEntities: Entity[], cluster: Cluster) => void;

    constructor(viewer: Viewer, geojson: any, options?: PointClusterOptions) {
        this.#viewer = viewer;
        this.#geojson = geojson;
        this.#options = options || {};

        this.DataLoadedEvent = new Event();
        this.#dataSource = new GeoJsonDataSource();
        this.#inited = false;
    }

    public init(): void {
        this.#inited = true;
        this.#load();
    }

    public getOptions(): PointClusterOptions {
        return this.#options;
    }

    public destroy(): void {
        if (!this.#inited) return;

        // 解除聚合事件监听
        if (this.#clusterListener) {
            this.#dataSource.clustering.clusterEvent.removeEventListener(this.#clusterListener);
            this.#clusterListener = undefined;
        }

        // 移除数据源
        this.#viewer.dataSources.remove(this.#dataSource);
        this.#inited = false;
    }

    // ====== private ======

    #load(): void {
        new GeoJsonDataSource().load(this.#geojson).then((ds: GeoJsonDataSource) => {
            this.#dataSource = ds;
            this.#viewer.dataSources.add(ds);

            ds.clustering.enabled = true;
            ds.clustering.pixelRange = this.#options.pixelRange ?? 30;
            ds.clustering.minimumClusterSize = this.#options.minimumClusterSize ?? 3;

            // 单点样式设置
            ds.entities.values.forEach((ent: Entity) => {
                if (ent.billboard) {
                    ent.billboard.image = new ConstantProperty(this.#options.billboardImg || new URL("../img/camera/bluecamera.png", import.meta.url).href)
                    ent.billboard.scaleByDistance = new ConstantProperty(new NearFarScalar(1500, 2, 4e5, 0.05))
                    ent.billboard.disableDepthTestDistance = new ConstantProperty(2e5)
                    ent.billboard.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND)
                    ent.billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM)
                    ent.billboard.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, 5e5))
                }
            });

            this.#bindClusterEvent(ds);
            this.DataLoadedEvent.raiseEvent(ds);
            // this.#viewer.zoomTo(ds);
        }).catch((e) => console.error("geojson load failed", e));
    }

    #bindClusterEvent(ds: GeoJsonDataSource) {
        ds.clustering.clusterEvent.addEventListener((entities, cluster) => {
            cluster.label.show = true;
            cluster.billboard.show = true;
            cluster.billboard.scale = 1.0;
        });
        this.#clusterListener = (entities: Entity[], cluster: Cluster) => {

            cluster.billboard.id = cluster.label.id;

            cluster.billboard.show = this.#boolOpt(this.#options.billboard, true)
            cluster.point.show = this.#boolOpt(this.#options.point, false)
            cluster.label.show = this.#boolOpt(this.#options.label, false)

            cluster.billboard.verticalOrigin = VerticalOrigin.BOTTOM
            cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY
            cluster.billboard.heightReference = HeightReference.RELATIVE_TO_GROUND

            cluster.point.disableDepthTestDistance = Number.POSITIVE_INFINITY

            cluster.label.verticalOrigin = VerticalOrigin.BOTTOM
            cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY
            cluster.label.heightReference = HeightReference.RELATIVE_TO_GROUND

            const len = entities.length;
            // 聚合图片分档(保持原逻辑)
            if (len >= 300) {
                cluster.billboard.image = new URL("../img/pointcluster/300+.png", import.meta.url).href
            } else if (len >= 150) {
                cluster.billboard.image = new URL("../img/pointcluster/150+.png", import.meta.url).href
            } else if (len >= 90) {
                cluster.billboard.image = new URL("../img/pointcluster/90+.png", import.meta.url).href
            } else if (len >= 30) {
                cluster.billboard.image = new URL("../img/pointcluster/30+.png", import.meta.url).href
            } else if (len > 10) {
                cluster.billboard.image = new URL("../img/pointcluster/10+.png", import.meta.url).href
            } else {
                cluster.billboard.image = new URL(`../img/pointcluster/${len}.png`, import.meta.url).href
            }
        };

        ds.clustering.clusterEvent.addEventListener(this.#clusterListener);
    }

    #boolOpt(v: boolean | undefined, def: boolean): boolean {
        return v === undefined ? def : v;
    }
}