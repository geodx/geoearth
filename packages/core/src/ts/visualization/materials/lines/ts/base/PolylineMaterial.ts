import { Event, JulianDate } from 'cesium'
import type { MaterialProperty, Property } from 'cesium'

/** 统一计算线材质的周期进度，以时间差保持不同帧率下的速度一致。 */
export abstract class PolylineMaterial implements MaterialProperty {
    readonly isConstant = false
    readonly definitionChanged = new Event()
    protected readonly startTime: JulianDate
    protected readonly duration: number

    protected constructor(duration: number, startTime: JulianDate = JulianDate.now()) {
        if (!Number.isFinite(duration) || duration <= 0) {
            throw new RangeError('Material duration must be greater than 0.')
        }
        this.duration = duration
        this.startTime = JulianDate.clone(startTime)
    }

    abstract getType(time: JulianDate): string

    abstract getValue(time?: JulianDate, result?: any): any

    abstract equals(other?: Property): boolean

    protected getProgress(time: JulianDate = JulianDate.now()): number {
        const elapsed = JulianDate.secondsDifference(time, this.startTime) * 1000
        // 双重取模使早于起始时刻的时间也能映射到同一个正向周期。
        const normalized = ((elapsed % this.duration) + this.duration) % this.duration
        return normalized / this.duration
    }
}
