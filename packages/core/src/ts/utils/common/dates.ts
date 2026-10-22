export type DateInput = Date | string | number

function toDate(value: DateInput): Date {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) throw new RangeError('无效的日期。')
    return date
}

/** 按本地时区格式化，不隐式转换为 UTC。 */
export function formatDateTime(value: DateInput = new Date()): string {
    const date = toDate(value)
    const pad = (number: number) => String(number).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** month 从 1 开始。 */
export function daysInMonth(year: number, month: number): number { return new Date(year, month, 0).getDate() }

function calendarDay(value: DateInput): number {
    const date = toDate(value)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
}

/** 按日历日期计数，跨夏令时也不会出现 23/25 小时导致的小数天。 */
export function dateDayDifference(first: DateInput, second: DateInput): number { return calendarDay(first) - calendarDay(second) }

/** 年内第几天，从 1 开始。 */
export function dayOfYear(value: DateInput): number {
    const date = toDate(value)
    return calendarDay(date) - calendarDay(new Date(date.getFullYear(), 0, 1)) + 1
}
