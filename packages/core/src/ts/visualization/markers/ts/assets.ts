// 标记图像通过相对 URL 参与 ESM 和 IIFE 构建。
export const MarkerAssets = {
    floating: new URL('../assets/images/floating.png', import.meta.url).href,
    bounce: new URL('../assets/images/bounce.png', import.meta.url).href,
    camera: new URL('../assets/images/camera.png', import.meta.url).href,
    panelPoint: new URL('../assets/images/panel-point.png', import.meta.url).href,
    panelPedestal: new URL('../assets/images/panel-pedestal.png', import.meta.url).href,
}

const badges = {
    '10-plus': new URL('../assets/images/clusters/10-plus.png', import.meta.url).href,
    '10': new URL('../assets/images/clusters/10.png', import.meta.url).href,
    '150-plus': new URL('../assets/images/clusters/150-plus.png', import.meta.url).href,
    '2': new URL('../assets/images/clusters/2.png', import.meta.url).href,
    '3': new URL('../assets/images/clusters/3.png', import.meta.url).href,
    '30-plus': new URL('../assets/images/clusters/30-plus.png', import.meta.url).href,
    '300-plus': new URL('../assets/images/clusters/300-plus.png', import.meta.url).href,
    '4': new URL('../assets/images/clusters/4.png', import.meta.url).href,
    '5': new URL('../assets/images/clusters/5.png', import.meta.url).href,
    '6': new URL('../assets/images/clusters/6.png', import.meta.url).href,
    '7': new URL('../assets/images/clusters/7.png', import.meta.url).href,
    '8': new URL('../assets/images/clusters/8.png', import.meta.url).href,
    '9': new URL('../assets/images/clusters/9.png', import.meta.url).href,
    '90-plus': new URL('../assets/images/clusters/90-plus.png', import.meta.url).href,
}

/** 2～10 个使用精确数量图标，更多点位按数量区间选择分档图标。 */
export function clusterImage(count: number): string {
    const level = [300, 150, 90, 30].find(level => count >= level) ?? (count > 10 ? 10 : undefined)
    return level ? badges[(level + '-plus') as keyof typeof badges] : badges[String(Math.max(2, count)) as keyof typeof badges]
}
