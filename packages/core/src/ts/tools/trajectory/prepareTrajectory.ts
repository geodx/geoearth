import { Cartesian3, Cartographic, Ellipsoid, EllipsoidGeodesic, JulianDate } from 'cesium'
import { toCartesian } from '../../utils/coordinate/positions'
import type { TrajectorySample } from './types'

interface GeographicSegment {
    curve: EllipsoidGeodesic
    startHeight: number
    endHeight: number
}

export interface PreparedTrajectory {
    positions: Cartesian3[]
    seconds: number[]
    duration: number
    timed: boolean
    geographic: boolean
    ellipsoid: Ellipsoid
    segments: Array<GeographicSegment | undefined>
}

/** 预计算各点的相对时间和分段曲线，播放过程中不修改 Viewer.clock。 */
export function prepareTrajectory(samples: readonly TrajectorySample[], speed: number, ellipsoid = Ellipsoid.WGS84): PreparedTrajectory {
    if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('轨迹速度必须为正数，单位：米/秒。')
    if (samples.length < 2) throw new RangeError('轨迹至少需要两个采样点。')
    const positions = samples.map(sample => toCartesian(sample.position, ellipsoid))
    const timed = samples[0].time !== undefined
    if (samples.some(sample => (sample.time !== undefined) !== timed)) {
        throw new Error('轨迹采样点必须全部提供时间戳，或全部省略。')
    }
    const times = timed ? samples.map(sample => typeof sample.time === 'string'
        ? JulianDate.fromIso8601(sample.time)
        : JulianDate.clone(sample.time as JulianDate)) : []
    const seconds = [0]
    const segments: PreparedTrajectory['segments'] = []
    for (let i = 1; i < samples.length; i++) {
        let segment: GeographicSegment | undefined
        // 经纬度输入沿椭球测地线移动；Cartesian3 输入保持空间直线语义。
        if (!(samples[i - 1].position instanceof Cartesian3) && !(samples[i].position instanceof Cartesian3)) {
            const start = Cartographic.fromCartesian(positions[i - 1], ellipsoid)
            const end = Cartographic.fromCartesian(positions[i], ellipsoid)
            if (Math.abs(start.longitude - end.longitude) + Math.abs(start.latitude - end.latitude) > 1e-12) {
                segment = {
                    curve: new EllipsoidGeodesic(start, end, ellipsoid),
                    startHeight: start.height,
                    endHeight: end.height,
                }
            }
        }
        segments.push(segment)
        const distance = segment
            ? Math.hypot(segment.curve.surfaceDistance, segment.endHeight - segment.startHeight)
            : Cartesian3.distance(positions[i - 1], positions[i])
        const time = timed
            ? JulianDate.secondsDifference(times[i], times[0])
            : seconds[i - 1] + distance / speed
        if (!Number.isFinite(time) || time <= seconds[i - 1]) {
            throw new RangeError('时间戳必须严格递增；无时间戳时相邻位置不能重合。')
        }
        seconds.push(time)
    }
    return {
        positions, seconds, duration: seconds[seconds.length - 1], timed,
        geographic: samples.every(sample => !(sample.position instanceof Cartesian3)),
        ellipsoid, segments,
    }
}

/** 按相对秒数定位分段；二分查找避免长轨迹每帧从头扫描。 */
export function sampleTrajectory(path: PreparedTrajectory, time: number, result = new Cartesian3()): Cartesian3 {
    const clamped = Math.min(path.duration, Math.max(0, time))
    let low = 1
    let high = path.seconds.length - 1
    while (low < high) {
        const middle = (low + high) >> 1
        if (path.seconds[middle] < clamped) low = middle + 1
        else high = middle
    }
    const fraction = (clamped - path.seconds[low - 1]) / (path.seconds[low] - path.seconds[low - 1])
    const segment = path.segments[low - 1]
    if (!segment) return Cartesian3.lerp(path.positions[low - 1], path.positions[low], fraction, result)
    const position = segment.curve.interpolateUsingFraction(fraction)
    const height = segment.startHeight + (segment.endHeight - segment.startHeight) * fraction
    return Cartesian3.fromRadians(position.longitude, position.latitude, height, path.ellipsoid, result)
}
