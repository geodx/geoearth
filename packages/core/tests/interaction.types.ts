import { Cartesian2, Color, Entity } from 'cesium'
import { GeoEarth, InteractionEventType, type HighlightAdapter, type PickResult } from 'geoearth'

// 从包公开入口检查声明，而不是直接导入源码内部文件。
declare const earth: GeoEarth
declare const entity: Entity

earth.interaction.enable({ hoverColor: '#00ffff', selectColor: Color.YELLOW,
    filter: result => result.type === 'entity' })
const picked: PickResult | undefined = earth.interaction.pick(new Cartesian2(10, 20))
if (picked?.type === 'entity') picked.object.point?.color?.getValue(earth.viewer.clock.currentTime)
if (picked?.type === 'feature') picked.object.getProperty('name')
if (picked?.type === 'model') picked.object.color = Color.BLUE
earth.interaction.select(entity)
const highlighted: boolean = earth.interaction.highlight(entity)
const adapter: HighlightAdapter = {
    supports: result => result.object === entity,
    apply: () => () => {}
}
const removeAdapter: () => void = earth.interaction.registerHighlightAdapter(adapter)
const removeListener: () => void = earth.event.interaction.addEventListener(
    InteractionEventType.SELECT_CHANGE, ({ current }) => {
        if (current?.type === 'entity') console.log(current.object.id)
    })
void highlighted; void removeAdapter; void removeListener
