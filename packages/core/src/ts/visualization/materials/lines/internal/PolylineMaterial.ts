import { Event, JulianDate } from 'cesium'
import type { MaterialProperty, Property } from 'cesium'

export abstract class PolylineMaterial implements MaterialProperty {
    readonly isConstant = false
    readonly definitionChanged = new Event()

    private readonly startTime = JulianDate.now()
    protected readonly duration: number

    protected constructor(duration: number) {
        if (!Number.isFinite(duration) || duration <= 0) {
            throw new RangeError('Material duration must be greater than 0.')
        }

        this.duration = duration
    }

    abstract getType(time: JulianDate): string

    abstract getValue(time?: JulianDate, result?: any): any

    abstract equals(other?: Property): boolean

    protected getProgress(time: JulianDate = JulianDate.now()): number {
        const elapsed = JulianDate.secondsDifference(time, this.startTime) * 1000
        const normalized = ((elapsed % this.duration) + this.duration) % this.duration

        return normalized / this.duration
    }
}