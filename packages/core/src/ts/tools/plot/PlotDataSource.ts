import {
    defined, Resource, DeveloperError, getFilenameFromUri, Cartesian3,
    RuntimeError, ColorMaterialProperty, ConstantProperty, Event,
    EntityCollection, EntityCluster, PinBuilder, Credit, Color, JulianDate,
    DataSource, CallbackProperty, createGuid, Entity, LabelGraphics,
    NearFarScalar, Cartesian2, HorizontalOrigin, LabelStyle, HeightReference,
    ConstantPositionProperty, BillboardGraphics, VerticalOrigin, ModelGraphics,
    PolylineGraphics, ArcType, PolygonGraphics, PolygonHierarchy, Viewer
} from "cesium";
import type { MaterialProperty } from "cesium";
// import { Material, SuperiorEntity } from "../ExpandEntity";
// import { FireParticle, FountainParticle, SmokeParticle } from "../SceneEffect";
export interface PlotLoadOptions {
    credit?: string | Credit;
    sourceUri?: string;

    // 样式默认配置 
    describe?: any;
    markerSize?: number;
    markerSymbol?: string;
    markerColor?: Color;
    stroke?: Color;
    strokeWidth?: number;
    fill?: Color;
    clampToGround?: boolean;
}
type CrsFunction = (coords: number[]) => Cartesian3;
// ========== 默认值  ==========
const DEFAULT_MARKER_SIZE = 48;
const DEFAULT_MARKER_COLOR = Color.ROYALBLUE;
const DEFAULT_STROKE_COLOR = Color.YELLOW;
const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FILL_COLOR = Color.fromBytes(255, 255, 0, 100);
const DEFAULT_CLAMP_TO_GROUND = false;

const MARKER_SIZE_MAP: Record<string, number> = { small: 24, medium: 48, large: 64 };
const BILLBOARD_SIZE = 32;
const SCALE_DISTANCE_NEAR = 2414016;
const SCALE_NEAR_VALUE = 1;
const SCALE_DISTANCE_FAR = 16093000;
const SCALE_FAR_VALUE = 0.1;
// ========== CRS映射 ==========
function fromDegreesCrs(coords: number[]): Cartesian3 {
    return Cartesian3.fromDegrees(coords[0]!, coords[1]!, coords[2]);
}
const CRS_NAMES: Record<string, CrsFunction> = {
    "urn:ogc:def:crs:OGC:1.3:CRS84": fromDegreesCrs,
    "EPSG:4326": fromDegreesCrs,
    "urn:ogc:def:crs:EPSG::4326": fromDegreesCrs,
};
const CRS_LINK_HREFS: Record<string, (p: any) => CrsFunction | Promise<CrsFunction>> = {};
const CRS_LINK_TYPES: Record<string, (p: any) => CrsFunction | Promise<CrsFunction>> = {};

// ========== describe默认实现 ==========
const IGNORE_KEYS = [
    "title",
    "description",
    "marker-size",
    "marker-symbol",
    "marker-color",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "fill",
    "fill-opacity",
];
function buildHtmlTable(props: Record<string, any>, nameKey?: string): string {
    let rows = "";

    for (const key in props) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
        if (key === nameKey) continue;
        if (IGNORE_KEYS.includes(key as any)) continue;

        const val = props[key];
        if (!defined(val)) continue;

        if (typeof val === "object") {
            rows += `<tr><th>${key}</th><td>${buildHtmlTable(val)}</td></tr>`;
        } else {
            rows += `<tr><th>${key}</th><td>${val}</td></tr>`;
        }
    }

    if (rows.length === 0) return "";
    return `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`;
}
function memoizeCallback<T>(factory: (...args: any[]) => T, ...args: any[]) {
    let cached: T | undefined;
    return function () {
        if (!defined(cached)) cached = factory(...args);
        return cached;
    };
}
function defaultDescribe(props: Record<string, any>, nameKey?: string) {
    return new CallbackProperty(memoizeCallback(buildHtmlTable, props, nameKey) as any, true);
}

class PlotDataSource implements DataSource {
    // ---- 静态默认参数  ----
    static markerSize = DEFAULT_MARKER_SIZE;
    static markerSymbol: string | undefined;
    static markerColor = DEFAULT_MARKER_COLOR;
    static stroke = DEFAULT_STROKE_COLOR;
    static strokeWidth = DEFAULT_STROKE_WIDTH;
    static fill = DEFAULT_FILL_COLOR;
    static clampToGround = DEFAULT_CLAMP_TO_GROUND;

    // ---- DataSource字段 ----
    public _name: string;
    public _changed: Event;
    private _error: Event;
    public _loading: Event;
    public _isLoading: boolean;
    public _entityCollection: EntityCollection;
    private _entityCluster: EntityCluster;

    public _promises: Promise<any>[];
    public _pinBuilder: PinBuilder;

    private _credit?: Credit;
    private _resourceCredits: Credit[];

    public readonly viewer: Viewer;
    constructor(viewer: Viewer, name?: string) {
        this._name = name || "PlotDataSource";
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection(this);
        this._entityCluster = new EntityCluster();
        this._promises = [];
        this._pinBuilder = new PinBuilder();
        this._credit = undefined;
        this._resourceCredits = [];

        this.viewer = viewer;

    }
    get credit() { return this._credit; }
    readonly clock: any = undefined;
    get name() { return this._name; }
    set name(v: string) {
        if (this._name !== v) {
            this._name = v;
            this._changed.raiseEvent(this);
        }
    }
    get entities() { return this._entityCollection; }
    get isLoading() { return this._isLoading; }
    get changedEvent() { return this._changed; }
    get errorEvent() { return this._error; }
    get loadingEvent() { return this._loading; }
    get show() { return this._entityCollection.show; }
    set show(v: boolean) { this._entityCollection.show = v; }
    get clustering() { return this._entityCluster; }
    set clustering(v: EntityCluster) {
        if (!defined(v)) throw new DeveloperError("value must be defined.");
        this._entityCluster = v;
    }
    update(time: JulianDate): boolean {
        return true;
    }

    async load(data: any, options?: PlotLoadOptions): Promise<any> {
        if (!defined(data)) throw new DeveloperError("data is required.");
        this._isLoading = true;
        this._loading.raiseEvent(this, true);
        const opt: PlotLoadOptions = options ? options : {};

        // credit
        let credit = opt.credit;
        if (typeof credit === "string") credit = new Credit(credit);
        this._credit = credit;

        let promiseOrData: any = data;
        let sourceUri = opt.sourceUri;

        // string / Resource => fetchJson
        if (typeof data === "string" || data instanceof Resource) {
            const res = new Resource(data)
            promiseOrData = res.fetchJson();
            sourceUri = sourceUri ? sourceUri : res.getUrlComponent()
            const credits = (res as any).credits as Credit[] | undefined;
            if (defined(credits)) {
                for (const c of credits) this._resourceCredits.push(c);
            }
        }

        // 组装“渲染配置”
        const renderOpt = {
            describe: opt.describe ?? defaultDescribe,
            markerSize: opt.markerSize ?? PlotDataSource.markerSize,
            markerSymbol: opt.markerSymbol ?? PlotDataSource.markerSymbol,
            markerColor: opt.markerColor ?? PlotDataSource.markerColor,

            strokeWidthProperty: new ConstantProperty(opt.strokeWidth ?? PlotDataSource.strokeWidth),
            strokeMaterialProperty: new ColorMaterialProperty(opt.stroke ?? PlotDataSource.stroke),
            fillMaterialProperty: new ColorMaterialProperty(opt.fill ?? PlotDataSource.fill),
            clampToGround: opt.clampToGround ?? PlotDataSource.clampToGround,
        };
        return Promise.resolve(promiseOrData).then((json) => {
            return processGeoJson(this, json, renderOpt, sourceUri)
        }).catch(e => {
            // DataSource.setLoading(this, false)
            this._isLoading = false;
            this._loading.raiseEvent(this, false);
            this._error.raiseEvent(this, e)
            return Promise.reject(e)

        });
    }

}
// ========== 内部处理 ==========
// 根据feature/properties找/建Entity并设置name/description
function getOrCreateEntityFromFeature(feature: any, collection: EntityCollection, describe: any,): Entity {
    let id = feature.id || feature.properties?.id;
    if (!defined(id) || feature.type !== "Feature") {
        id = createGuid();
    } else {
        // 保证唯一
        let suffix = 2;
        let candidate = id;
        while (defined(collection.getById(candidate))) {
            candidate = `${id}_${suffix++}`;
        }
        id = candidate;
    }

    const entity = collection.getOrCreateEntity(id);
    const props = feature.properties;

    if (defined(props)) {
        entity.properties = props;

        // name优先策略(title/name/包含title/name的key)
        let nameKey: string | undefined;
        if (defined(props.title)) {
            entity.name = props.title;
            nameKey = "title";
        } else {
            let bestRank = Number.MAX_VALUE;
            for (const k in props) {
                if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
                if (!props[k]) continue;
                const lower = k.toLowerCase();

                if (bestRank > 1 && lower === "title") { bestRank = 1; nameKey = k; break; }
                else if (bestRank > 2 && lower === "name") { bestRank = 2; nameKey = k; }
                else if (bestRank > 3 && /title/i.test(k)) { bestRank = 3; nameKey = k; }
                else if (bestRank > 4 && /name/i.test(k)) { bestRank = 4; nameKey = k; }
            }
            if (defined(nameKey)) entity.name = props[nameKey];
        }

        const desc = props.description;
        if (desc !== null) {
            entity.description = defined(desc) ? new ConstantProperty(desc) : (describe as any)(props, nameKey);
        }
    }

    return entity;
}
function mapCoords<T>(arr: T[], fn: (v: T) => Cartesian3): Cartesian3[] {
    const out = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) out[i] = fn(arr[i]!);
    return out;
}
// label构造(对应VG)
function makeLabel(text = "标记", clampToGround?: boolean): LabelGraphics {
    const label = new LabelGraphics({
        text: text,
        translucencyByDistance: new NearFarScalar(3000000, 1, 5000000, 0),
        pixelOffset: new Cartesian2(0, -45),
        horizontalOrigin: HorizontalOrigin.CENTER,
        font: "12pt bold monospace",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: clampToGround ? HeightReference.CLAMP_TO_GROUND : undefined
    });
    return label;
}

// point/multipoint(对应qB/WB/$B)
function addPointEntity(ds: PlotDataSource, feature: any, coords: number[], opts: any,) {
    const props = feature.properties || {};
    let markerColor: Color = opts.markerColor;
    let markerSize: number = opts.markerSize;
    let markerSymbol: string | undefined = opts.markerSymbol;
    let modelUrl: string | null = null;

    const markerColorStr = props["marker-color"];
    if (defined(markerColorStr)) markerColor = Color.fromCssColorString(markerColorStr);

    const sizeKey = props["marker-size"];
    if (defined(sizeKey)) markerSize = MARKER_SIZE_MAP[sizeKey] ?? markerSize;

    const symbol = props["marker-symbol"];
    if (defined(symbol)) markerSymbol = symbol;

    modelUrl = props["model-url"] ?? null;

    const entity = getOrCreateEntityFromFeature(feature, ds._entityCollection, opts.describe);

    const cart = opts.crs(coords);
    entity.position = new ConstantPositionProperty(cart);

    if (defined(props.name)) {
        entity.name = opts.name;
        if (props.code !== "GradientLabelPointDecorator") {
            entity.label = makeLabel(props.name, props.clampToGround);
        }
    }

    // billboard
    if (markerSymbol) {
        let imagePromise: any;

        // 这里保持原逻辑：URL/dataURI/单字符/图标id/纯色
        const isUrl = (s: string) => /^(?!mailto:)(?:(?:http|https|ftp):\/\/|\/\/)\S+/i.test(s);

        let image: any;
        if (defined(markerSymbol)) {
            if (String(markerSymbol).includes("data:image/") || isUrl(String(markerSymbol))) {
                image = markerSymbol;
            } else if (String(markerSymbol).length === 1) {
                image = ds._pinBuilder.fromText(String(markerSymbol).toUpperCase(), markerColor, markerSize);
            } else {
                image = ds._pinBuilder.fromMakiIconId(markerSymbol, markerColor, markerSize);
            }
        } else {
            image = ds._pinBuilder.fromColor(markerColor, markerSize);
        }

        const bb = new BillboardGraphics({
            verticalOrigin: new ConstantProperty(VerticalOrigin.BOTTOM),
            width: BILLBOARD_SIZE,
            height: BILLBOARD_SIZE,
            scaleByDistance: new NearFarScalar(SCALE_DISTANCE_NEAR, SCALE_NEAR_VALUE, SCALE_DISTANCE_FAR, SCALE_FAR_VALUE),
            pixelOffsetScaleByDistance: new NearFarScalar(SCALE_DISTANCE_NEAR, SCALE_NEAR_VALUE, SCALE_DISTANCE_FAR, SCALE_FAR_VALUE),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: (coords.length === 2 || opts.clampToGround) ? HeightReference.CLAMP_TO_GROUND : undefined
        });

        entity.billboard = bb;

        imagePromise = Promise.resolve(image)
            .then((img: any) => { bb.image = new ConstantProperty(img); })
            .catch(() => { bb.image = new ConstantProperty(ds._pinBuilder.fromColor(markerColor, markerSize)); });

        ds._promises.push(imagePromise);
    }

    // model
    if (modelUrl) {
        entity.model = new ModelGraphics({
            uri: modelUrl,
            minimumPixelSize: 64,
            maximumScale: 2000,
        });
    }

    const pe = props;
    const worldDegrees = { longitude: coords[0]!, latitude: coords[1]!, height: coords[2]! };
    const position = Cartesian3.fromDegrees(worldDegrees.longitude, worldDegrees.latitude, worldDegrees.height)
    // if (pe.code === "winInfo-SimpleLabel") new SuperiorEntity.SampleLablePoint(ds.viewer, worldDegrees, pe.内容);
    // if (pe.code === "winInfo-Bubble-1") new SuperiorEntity.PopupWindow1(ds.viewer, worldDegrees, pe.paramList?.[0]?.value, pe.paramList?.[1]?.value);
    // if (pe.code === "GradientLabelPointDecorator") new SuperiorEntity.GradientLabelPoint(ds.viewer, worldDegrees, document.createElement("div"));
    // if (pe.code === "winInfo-Bubble-2") new SuperiorEntity.PopupWindow2(ds.viewer, worldDegrees, pe.paramList?.[0]?.value, pe.paramList?.[1]?.value);
    // if (pe.code === "winInfo-device") new SuperiorEntity.HudPanel(ds.viewer, worldDegrees, pe.paramList?.[0]?.value, pe.paramList?.[1]?.value, pe.颜色);
    // if (pe.code === "winInfo-HLS") new SuperiorEntity.HlsVideoWindow(ds.viewer, { title: pe.paramList?.[0]?.value, url: pe.paramList?.[1]?.value, position: worldDegrees });

    // if (pe.code === "particleSystem-fire") new FireParticle(ds.viewer, position);
    // if (pe.code === "particleSystem-fountain") new FountainParticle(ds.viewer, position);
    // if (pe.code === "particleSystem-smoke") new SmokeParticle(ds.viewer, position);
}
// function sC(type: string, d = []) {
//     let y = {},
//         E = [];
//     if (type === "fire") E = yG;
//     else if (type === "fountain") E = vG;
//     else if (type === "smoke") E = wG;
//     else return y;
//     return (E.forEach((B) => {
//         if (B.name === "风向") {
//             let Y = d.find((V) => V.name === B.name || {}) ? .value;
//             Y && ((y.heading = Y.heading), (y.pitch = Y.pitch));
//             return;
//         }
//         let N = parseFloat((d.find((Y) => Y.name === B.name) || {}).value);
//         B.min <= N && N <= B.max && (y[B.paramName] = N);
//     }),
//         y
//     );
// }
// polyline(对应ZB/KB/XB)
function addPolylineEntity(ds: PlotDataSource, feature: any, coords: number[][], opts: any) {
    let material: MaterialProperty = opts.strokeMaterialProperty;
    let widthProp = opts.strokeWidthProperty;

    const props = feature.properties || {};
    const materialType = props["stroke-material"] || "normal";
    const width = props["stroke-width"] || 12;
    //  自定义材质
    // switch (materialType) {
    //     case "PolylineArrowMaterial":
    //         material = new Material.Polyline.PolylineArrowMaterial({ color: Color.AQUA, duration: 800, repeatCount: 3 });
    //         break;
    //     case "PolylineEnergyTransMaterial":
    //         material = new Material.Polyline.PolylineEnergyTransMaterial({ color: Color.AQUA, duration: 800, repeatCount: 3 });
    //         break;
    //     case "PolylineLightingMaterial":
    //         material = new Material.Polyline.PolylineLightingMaterial(Color.AQUA);
    //         break;
    //     case "PolylineLinkPulseMaterial":
    //         material = new Material.Polyline.PolylineLinkPulseMaterial({ color: Color.AQUA, duration: 5000 });
    //         break;
    //     case "PolylineSpriteMaterial":
    //         material = new Material.Polyline.PolylineSpriteMaterial({ color: Color.AQUA, duration: 2000, repeatCount: 3 });
    //         break;
    //     case "PolylineSuperMaterial":
    //         material = new Material.Polyline.PolylineSuperMaterial({ color: Color.AQUA, duration: 2000, repeatCount: 3 });
    //         break;
    //     case "PolylineTrailMaterial":
    //         material = new Material.Polyline.PolylineTrailMaterial({ speed: 5 * Math.random(), color: Color.CYAN, percent: 0.5, gradient: 0.01 });
    //         break;
    // default: {
    //     const w = props["stroke-width"];
    //     widthProp = defined(w) ? new ConstantProperty(w) : widthProp;

    //     let c: Color | undefined;
    //     if (defined(props.stroke)) c = Color.fromCssColorString(props.stroke);

    //     const op = props["stroke-opacity"];
    //     if (defined(op) && op !== 1) {
    //         if (!defined(c)) c = (material.getValue().color as Color).clone();
    //         c.alpha = op;
    //     }
    //     if (defined(c)) material = new ColorMaterialProperty(c);
    // }
    // }

    // const entity = getOrCreateEntityFromFeature(feature, ds._entityCollection, opts.describe);
    // const poly = new PolylineGraphics();
    // entity.polyline = poly;

    // poly.clampToGround = opts.clampToGround;
    // poly.material = material;
    // poly.width = new ConstantProperty(width);
    // poly.positions = new ConstantProperty(mapCoords(coords, opts.crs));
    // poly.arcType = new ConstantProperty(ArcType.GEODESIC);
}

// polygon(对应YB/JB/eN)——按你贴的逻辑完整还原会很长，这里给核心框架
function addPolygonEntity(ds: PlotDataSource, feature: any, rings: number[][][], opts: any) {
    if (rings.length === 0 || rings[0]?.length === 0) return;

    let fillMaterial = opts.fillMaterialProperty;
    const strokeWidthProp = opts.strokeWidthProperty;
    const props = feature.properties || {};

    if (defined(props.fill)) {
        let c = Color.fromCssColorString(props.fill);
        const baseAlpha = fillMaterial.color.getValue().alpha;
        c.alpha = baseAlpha;

        const op = props["fill-opacity"];
        if (defined(op) && op !== baseAlpha) c.alpha = op;
        fillMaterial = new ColorMaterialProperty(c);
    }

    const polygon = new PolygonGraphics();
    polygon.material = fillMaterial;
    polygon.arcType = new ConstantProperty(ArcType.GEODESIC);

    const outline = new PolylineGraphics();
    outline.clampToGround = opts.clampToGround;
    outline.material = props.stroke ? new ColorMaterialProperty(Color.fromCssColorString(props.stroke)) : opts.strokeMaterialProperty;
    outline.width = props["stroke-width"] || strokeWidthProp;
    (outline as any).alpha = props["stroke-opacity"] || 1;
    outline.positions = new ConstantProperty(mapCoords(rings[0]!, opts.crs));
    outline.arcType = new ConstantProperty(ArcType.GEODESIC);

    // holes
    const holes: PolygonHierarchy[] = [];
    for (let i = 1; i < rings.length; i++) {
        holes.push(new PolygonHierarchy(mapCoords(rings[i]!, opts.crs)));
    }

    polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(mapCoords(rings[0]!, opts.crs), holes));

    const first = rings[0]!;
    if (opts.clampToGround) {
        polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
    } else if (first[0]!.length > 2) {
        polygon.perPositionHeight = new ConstantProperty(true);
    } else {
        polygon.height = new ConstantProperty(0);
    }

    const entity = getOrCreateEntityFromFeature(feature, ds._entityCollection, opts.describe);
    entity.polygon = polygon;
    entity.polyline = outline;
}

async function processGeoJson(ds: PlotDataSource, obj: any, opts: any, sourceUri?: string) {
    // name from uri
    if (defined(sourceUri)) {
        const filename = getFilenameFromUri(sourceUri);
        if (defined(filename) && ds._name !== filename) {
            ds._name = filename;
            ds._changed.raiseEvent(ds);
        }
    }

    // 解析crs
    const crs = obj.crs;
    let crsFunc: any = fromDegreesCrs;

    if (defined(crs)) {
        if (!defined(crs.properties)) throw new RuntimeError("crs.properties is undefined.");
        const p = crs.properties;
        if (crs.type === "name") {
            crsFunc = CRS_NAMES[p.name];
            if (!defined(crsFunc)) throw new RuntimeError(`Unknown crs name: ${p.name}`);
        } else if (crs.type === "link") {
            let resolver = CRS_LINK_HREFS[p.href];
            if (!defined(resolver)) resolver = CRS_LINK_TYPES[p.type];
            if (!defined(resolver)) throw new RuntimeError(`Unable to resolve crs link: ${JSON.stringify(p)}`);
            crsFunc = resolver(p);
        } else if (crs.type === "EPSG") {
            crsFunc = CRS_NAMES[`EPSG:${p.code}`];
            if (!defined(crsFunc)) throw new RuntimeError(`Unknown crs EPSG code: ${p.code}`);
        } else {
            throw new RuntimeError(`Unknown crs type: ${crs.type}`);
        }
    }

    // return Promise.resolve(crsFunc).then(finalCrs => {
    //     ds._entityCollection.removeAll()
    //     finalCrs !== null && N(ds, obj, finalCrs, opts)
    //     return Promise.all(ds._promises).then(function () {
    //         ds._promises.length = 0
    //         // DataSource.setLoading(ds, false)
    //         ds.isLoading
    //         ds._loading.raiseEvent(ds, false);
    //         return ds
    //     })
    // });


    const finalCrs = await Promise.resolve(crsFunc);

    // 清空并渲染
    ds._entityCollection.removeAll();

    opts.crs = finalCrs;

    // 涉及到的类型：Feature/FeatureCollection/GeometryCollection/Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon/Topology
    const type = obj.type;
    // 渲染分发
    switch (type) {
        case "Feature":
            renderFeature(ds, obj, opts);
            break;
        case "FeatureCollection":
            for (const f of obj.features || []) renderFeature(ds, f, opts);
            break;
        case "GeometryCollection":
            for (const g of obj.geometries || []) renderGeometry(ds, obj, g, opts);
            break;
        // case "Topology": {
        //     for (const k in obj.objects) {
        //         if (!Object.prototype.hasOwnProperty.call(obj.objects, k)) continue;
        //         const feat = topojson.feature(obj, obj.objects[k]);
        //         // feat.type 可能是Feature/FeatureCollection
        //         if (feat.type === "Feature") renderFeature(ds, feat, opts);
        //         else if (feat.type === "FeatureCollection") for (const f of feat.features || []) renderFeature(ds, f, opts);
        //     }
        //     break;
        // }
        default:
            throw new RuntimeError(`Unsupported GeoJSON object type: ${type}`);
    }

    await Promise.all(ds._promises);
    ds._promises.length = 0;
    // DataSource.setLoading(ds as any, false);
    ds.isLoading
    ds._loading.raiseEvent(ds, false);
    return ds;
}
function renderFeature(ds: PlotDataSource, feature: any, opts: any) {
    if (feature.geometry === null) {
        getOrCreateEntityFromFeature(feature, ds._entityCollection, opts.describe);
        return;
    }
    if (!defined(feature.geometry)) throw new RuntimeError("feature.geometry is required.");
    renderGeometry(ds, feature, feature.geometry, opts);
}
function renderGeometry(ds: PlotDataSource, feature: any, geom: any, opts: any) {
    switch (geom.type) {
        case "Point":
            addPointEntity(ds, feature, geom.coordinates, opts);
            break;
        case "MultiPoint":
            for (const c of geom.coordinates) addPointEntity(ds, feature, c, opts);
            break;
        case "LineString":
            addPolylineEntity(ds, feature, geom.coordinates, opts);
            break;
        case "MultiLineString":
            for (const line of geom.coordinates) addPolylineEntity(ds, feature, line, opts);
            break;
        case "Polygon":
            addPolygonEntity(ds, feature, geom.coordinates, opts);
            break;
        case "MultiPolygon":
            for (const poly of geom.coordinates) addPolygonEntity(ds, feature, poly, opts);
            break;
        case "GeometryCollection":
            for (const g of geom.geometries || []) renderGeometry(ds, feature, g, opts);
            break;
        default:
            throw new RuntimeError(`Unknown geometry type: ${geom.type}`);
    }
}
export { PlotDataSource };