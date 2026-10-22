/** 使用浏览器剪贴板 API；权限拒绝时将错误交给调用方处理。 */
export async function copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
}

/** 解析 data URL；同时支持 Base64 与百分号编码，不截断内容中的逗号。 */
export function dataUrlToBlob(url: string): Blob {
    const comma = url.indexOf(',')
    if (!url.startsWith('data:') || comma < 0) throw new TypeError('需要有效的 data URL。')
    const metadata = url.slice(5, comma)
    const value = url.slice(comma + 1)
    const bytes = /;base64$/i.test(metadata)
        ? Uint8Array.from(atob(value), character => character.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(value))
    return new Blob([bytes], { type: metadata.replace(/;base64$/i, '') || 'text/plain;charset=US-ASCII' })
}
