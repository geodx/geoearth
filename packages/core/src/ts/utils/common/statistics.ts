export const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)
export const mean = (values: readonly number[]): number => values.length ? sum(values) / values.length : NaN

/** 默认总体标准差；sample 为 true 时使用 n-1 计算样本标准差。 */
export function standardDeviation(values: readonly number[], sample = false): number {
    let count = 0, average = 0, squared = 0
    for (const value of values) {
        count++
        const delta = value - average
        average += delta / count
        squared += delta * (value - average)
    }
    const divisor = count - (sample ? 1 : 0)
    return divisor > 0 ? Math.sqrt(squared / divisor) : NaN
}

export function median(values: readonly number[]): number {
    if (!values.length) return NaN
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** Jenks 自然断点，返回包含最小值和各组上界的 k+1 个边界，保留小数精度。 */
export function jenksBreaks(values: readonly number[], classes: number): number[] {
    if (!values.length || !values.every(Number.isFinite)) throw new RangeError('自然断点需要非空的有限数值数组。')
    const data = [...values].sort((a, b) => a - b)
    if (!Number.isInteger(classes) || classes < 1 || classes > new Set(data).size) throw new RangeError('分类数须介于 1 和不同数值的数量之间。')
    const n = data.length
    const costs = Array.from({ length: n + 1 }, () => Array(classes + 1).fill(Infinity))
    const starts = Array.from({ length: n + 1 }, () => Array(classes + 1).fill(0))
    costs[0][0] = 0
    // 相对最小值平移后累计方差，减轻大坐标数值平方相减带来的精度损失。
    for (let end = 1; end <= n; end++) {
        let total = 0, squared = 0
        for (let start = end; start >= 1; start--) {
            const value = data[start - 1] - data[0]
            total += value
            squared += value * value
            const variance = Math.max(0, squared - total * total / (end - start + 1))
            for (let group = 1; group <= classes; group++) {
                const cost = costs[start - 1][group - 1] + variance
                if (cost < costs[end][group]) { costs[end][group] = cost; starts[end][group] = start - 1 }
            }
        }
    }
    const breaks = [data[n - 1]]
    let end = n
    for (let group = classes; group > 1; group--) {
        end = starts[end][group]
        breaks.unshift(data[end - 1])
    }
    return [data[0], ...breaks]
}
