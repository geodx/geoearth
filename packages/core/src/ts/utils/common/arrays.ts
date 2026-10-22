/** 数组操作返回新数组，保留 0、false 等有效值。 */
export function unique<T>(values: readonly T[]): T[] { return [...new Set(values)] }

export function difference<T>(values: readonly T[], excluded: readonly T[]): T[] {
    const set = new Set(excluded)
    return values.filter(value => !set.has(value))
}

export function compact<T>(values: readonly (T | null | undefined)[]): T[] {
    return values.filter((value): value is T => value !== null && value !== undefined)
}

export function shuffle<T>(values: readonly T[], random: () => number = Math.random): T[] {
    const result = [...values]
    for (let i = result.length - 1; i > 0; i--) {
        const index = Math.floor(random() * (i + 1))
        ;[result[i], result[index]] = [result[index], result[i]]
    }
    return result
}
