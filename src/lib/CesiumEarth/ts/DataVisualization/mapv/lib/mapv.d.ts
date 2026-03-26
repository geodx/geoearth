export interface MapVGeometry {
    type: string;
    coordinates: unknown;
    _coordinates?: unknown;
}

export interface MapVDataItem {
    geometry?: MapVGeometry;
    lng?: number;
    lat?: number;
    city?: string;
    count?: number;
    [key: string]: any;
}

export interface DataSetGetOptions {
    filter?: (item: MapVDataItem) => boolean;
    transferCoordinate?: (coordinate: unknown) => unknown;
    fromColumn?: string;
    toColumn?: string;
}

export class DataSet {
    constructor(data?: MapVDataItem[] | MapVDataItem, options?: Record<string, unknown>);
    add(data: MapVDataItem[] | MapVDataItem, senderId?: string | number): void;
    get(args?: DataSetGetOptions): MapVDataItem[];
    set(data: MapVDataItem[] | MapVDataItem): void;
    clear(args?: unknown): void;
    update(cbk?: (item: MapVDataItem) => void, condition?: Record<string, unknown>): void;
    initGeometry(transferFn?: (item: MapVDataItem) => MapVGeometry): void;
    getMax(columnName: string): number | undefined;
    getMin(columnName: string): number | undefined;
    getSum(columnName: string): number | undefined;
    getUnique(columnName: string): string[] | undefined;
}

export interface GeoJsonApi {
    getDataSet(json: unknown): DataSet;
}

export interface CsvApi {
    getDataSet(csvText: string, options?: Record<string, unknown>): DataSet;
}

export interface MapVExports {
    version: string;
    DataSet: typeof DataSet;
    geojson: GeoJsonApi;
    csv: CsvApi;
    utilCurve: any;
    utilCityCenter: any;
    utilForceEdgeBundling: any
}

declare const mapv: MapVExports;

export default mapv;