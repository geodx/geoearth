/****************************************************************************
 名称：创建鹰眼容器

 最后修改日期：2025-11-18
 ****************************************************************************/

import { OverviewMapPosition } from './types';

function createRoot(host: HTMLElement, embedded: boolean, position: OverviewMapPosition, width: string | number, height: string | number): HTMLElement {
    const root = document.createElement('div')

    root.classList.add('geoearth-overview-map')

    if (embedded) {
        root.classList.add('geoearth-overview-map--embedded')
        root.style.width = toCssSize(width ?? '100%')
        root.style.height = toCssSize(height ?? '100%')
    } else {
        root.classList.add('geoearth-overview-map--floating')
        root.classList.add(`geoearth-overview-map--${position}`)
        root.style.width = toCssSize(width ?? 280)
        root.style.height = toCssSize(height ?? 180)
    }

    host.appendChild(root)

    return root
}

function toCssSize(value: number | string): string {
    return typeof value === 'number' ? `${value}px` : value
}

export { createRoot };
