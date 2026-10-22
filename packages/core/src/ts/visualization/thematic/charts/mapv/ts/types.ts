export interface MapVDataItem {
    geometry: {
        type: string
        coordinates: any
    }
    count?: number
    time?: number
    [key: string]: any
}

export interface MapVDataSet {
    get(options?: any): MapVDataItem[]
    set(data: MapVDataItem[]): void
    add(data: MapVDataItem | MapVDataItem[]): void
    clear(): void
    [key: string]: any
}

export interface MapVOptions {
    draw?: string
    context?: '2d' | 'webgl'
    zIndex?: number
    size?: number
    max?: number
    min?: number
    animation?: {
        enabled?: boolean
        duration?: number
        trails?: number
        stepsRange?: {
            start: number
            end: number
        }
    }
    methods?: {
        click?: (item: MapVDataItem | null, event: MouseEvent) => void
        mousemove?: (item: MapVDataItem | null, event: MouseEvent) => void
    }
    /** 其余 MapV 绘制与数据范围配置按原参数透传。 */
    [key: string]: any
}
