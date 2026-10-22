import type { Viewer } from 'cesium'
import type { LinkedViewOptions } from '../types'

export interface LinkedViewContainer {
    /** 传给副 GeoEarth 的内部容器。 */
    secondary: HTMLElement
    setVisible(visible: boolean): void
    destroy(): void
}

export function createLinkedViewContainer(viewer: Viewer, options: LinkedViewOptions): LinkedViewContainer {
    const host = viewer.container as HTMLElement

    const primary = Array.from(host.children).find(element => element.classList.contains('cesium-viewer')) as HTMLElement | undefined

    if (!primary) {
        throw new Error('[GeoEarth linkage] 找不到主视图容器')
    }

    const doc = host.ownerDocument

    // 外层负责分屏，位置、宽高由 linkage.scss 控制。
    const secondaryPanel = doc.createElement('div')
    secondaryPanel.className = 'geoearth-linkage-secondary'

    // 内层交给 GeoEarth，初始化为 relative、100% 宽高也不会影响外层布局。
    const secondary = doc.createElement('div')
    secondary.className = 'geoearth-linkage-earth'

    secondaryPanel.appendChild(secondary)

    const layoutClass = `geoearth-linkage--${options.layout ?? 'horizontal'}`

    const variable = '--geoearth-linkage-ratio'
    const previousValue = host.style.getPropertyValue(variable)
    const previousPriority = host.style.getPropertyPriority(variable)

    host.classList.add('geoearth-linkage', layoutClass)
    primary.classList.add('geoearth-linkage-primary')

    host.style.setProperty(variable, `${(options.ratio ?? 0.5) * 100}%`,)

    host.appendChild(secondaryPanel)

    return {
        // 返回内部容器，createLinkedViewer 无需修改。
        secondary,

        setVisible(visible) {
            host.classList.toggle(
                'geoearth-linkage--hidden',
                !visible,
            )
        },

        destroy() {
            // 删除整个面板，包括里面的副地球容器。
            secondaryPanel.remove()

            primary.classList.remove('geoearth-linkage-primary')

            host.classList.remove(
                'geoearth-linkage',
                layoutClass,
                'geoearth-linkage--hidden',
            )

            if (previousValue) {
                host.style.setProperty(
                    variable,
                    previousValue,
                    previousPriority,
                )
            } else {
                host.style.removeProperty(variable)
            }
        },
    }
}