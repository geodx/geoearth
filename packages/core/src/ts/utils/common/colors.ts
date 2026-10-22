/** 接受 #rgb、rgb、#rrggbb 或 rrggbb，返回 RGB 分量。 */
export function hexToRgb(hex: string): [number, number, number] {
    let value = hex.replace(/^#/, '')
    if (value.length === 3) value = value.split('').map(character => character + character).join('')
    if (!/^[\da-f]{6}$/i.test(value)) throw new RangeError('颜色必须为三位或六位十六进制字符串。')
    const number = parseInt(value, 16)
    return [number >> 16, number >> 8 & 255, number & 255]
}

export function rgbToHex(red: number, green: number, blue: number): string {
    const components = [red, green, blue]
    if (!components.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) throw new RangeError('RGB 分量必须为 0 到 255 的整数。')
    return '#' + components.map(value => value.toString(16).padStart(2, '0')).join('')
}
