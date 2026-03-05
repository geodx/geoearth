export interface HeatmapPoint {
    x: number
    y: number
    value: number
    radius?: number
}

export interface HeatmapData {
    min?: number
    max?: number
    data: HeatmapPoint[]
}

export interface HeatmapConfiguration {
    container: HTMLElement
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    blur?: number
    gradient?: Record<string, string>
    [k: string]: any
}

export interface HeatmapInstance {
    setData(data: HeatmapData): void
    setDataMin(min: number): void
    setDataMax(max: number): void
    addData(data: HeatmapPoint | HeatmapPoint[]): void
    repaint(): void
    getDataURL(): string
    getData(): HeatmapData
    configure(config: Partial<HeatmapConfiguration>): void
}

export interface HeatmapModule {
    create(config: HeatmapConfiguration): HeatmapInstance
}