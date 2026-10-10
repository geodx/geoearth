# 对象拾取与高亮

`earth.interaction` 统一处理 Entity、3D Tiles feature、Model 和普通 Primitive 拾取结果。自动交互默认关闭，手动 API 可以直接使用。

```ts
import { GeoEarth, InteractionEventType } from 'geoearth'

// 属性框与选中标记复用 Cesium 控件，需要在创建 Viewer 时开启。
const earth = new GeoEarth('earth', { infoBox: true, selectionIndicator: true })
await earth.onReady()

earth.interaction.enable({
    hover: true,
    select: true,
    hoverColor: '#67e8f9',
    selectColor: '#fbbf24',
    // 可选：过滤对象；拾取会继续寻找后方符合条件的对象。
    filter: result => result.type === 'entity' || result.type === 'feature'
})

earth.event.interaction.addEventListener(InteractionEventType.SELECT_CHANGE, ({ previous, current }) => {
    console.log('选中变化', previous, current)
    if (current) console.log(current.object, current.properties)
})
```

## API

| 方法 / 属性 | 行为 |
| --- | --- |
| `enable(options?)` | 开启自动悬停和点击选择；重复调用更新选项 |
| `disable()` | 关闭自动交互、清空所有交互状态、恢复样式和 Viewer 原来的点击处理 |
| `pick(position)` | 返回最前方符合 filter 的对象，没有对象时为 `undefined` |
| `drillPick(position, limit?)` | 返回由前到后、按对象身份去重的结果；不应用 filter |
| `select(target)` / `clearSelection()` | 选中 / 清除选中，同时更新原生属性框 |
| `highlight(target, color?)` / `clearHighlight()` | 手动高亮 / 清除；不改变选中对象，默认橙色。highlight 返回是否实际改色 |
| `clearHover()` | 清除悬停状态和待执行的悬停拾取 |
| `getProperties(target)` | 重新读取对象当前属性 |
| `registerHighlightAdapter(adapter)` | 注册优先于内置适配器的自定义适配器，返回移除函数 |
| `isEnabled`、`hovered`、`selected`、`highlighted` | 只读交互状态 |

`position` 是相对 Cesium canvas 的 CSS 像素坐标（`Cartesian2`），通常直接使用屏幕事件的 `position` / `endPosition`。`target` 接受 `PickResult`、Entity、Cesium3DTileFeature、ModelFeature、Model，或原生 `{ primitive, id? }` 拾取对象。

`PickResult` 提供 `type`、`object`、`primitive`、`id`、`name`、`properties` 和可选屏幕 `position`。`properties` 是拾取时的快照；动态属性需要使用 `getProperties` 重新读取。feature 保留原 feature 对象，Entity 保留原 Entity 对象。

## 事件与状态

`earth.event.interaction` 复用 SDK 的 BaseEvent，支持 `addEventListener`、`removeEventListener`、`removeAllEventListeners`。地球销毁时统一清理，不需要业务维护 SDK 内部监听。

- `HOVER_CHANGE`：悬停对象变化。
- `SELECT_CHANGE`：选中对象变化，包括点击空白、属性框关闭和对象移除。
- `HIGHLIGHT_CHANGE`：手动高亮对象变化。

参数都是 `{ type, previous, current }`。重复操作同一个对象不重复通知；清除时 `current` 为 `undefined`。手动高亮状态与适配器是否能够改色分开，使用 `highlight()` 的返回值确认实际改色。

高亮优先级为 **手动高亮 > 选中 > 悬停**。高优先级状态清除后，恢复仍存在的低优先级样式；全部清除后恢复原样式。Entity 恢复原 Property 引用，保留动态材质和动态颜色；高亮期间业务主动换掉的 Property 会保留业务的新值。

悬停按动画帧合并鼠标移动，保留最后的位置。绘制 / 量测的绘制阶段自动暂停鼠标拾取，结束后恢复。Entity 或 DataSource 移除、Primitive 所在集合移除、feature 所在瓦片卸载，会清理对应状态。卸载的 feature 不跨瓦片重建自动重选。

自动交互开启期间接管 Viewer 的默认左键选择；关闭后恢复原处理。业务的 ScreenEvent 监听继续保留。原生双击跟踪保持 Cesium 的行为。

启用时会接续 Viewer 已有的选择。屏幕拾取的 feature / 模型复用空间坐标拾取来放置原生选中标记；程序直接传入无位置的 feature 时仅展示属性。

## 高亮支持与扩展

内置适配器支持 Entity 点、图标、文字、线、面及模型；Cesium3DTileFeature / ModelFeature 的 `color`；Model 的 `color`；带实例 `color` 属性且已 ready 的 Primitive / GroundPrimitive；Billboard、Label、PointPrimitive 等可写颜色的原生对象。Entity 线面高亮时临时使用纯色材质，结束后恢复原材质。

自定义 Shader、特殊外观或没有实例颜色属性的 Primitive 需要适配器。SDK 仍可拾取和选择它们，无法直接改色时 `highlight()` 返回 `false`。

```ts
const removeAdapter = earth.interaction.registerHighlightAdapter({
    supports: result => result.primitive === customObject,
    apply: (_result, color) => {
        const original = customObject.tint
        customObject.tint = color
        return () => { customObject.tint = original }
    }
})
// 不再使用时 removeAdapter()；SDK 会先恢复旧适配器的样式再应用内置适配器。
```

属性框使用 Entity 原有的 `description`；没有 description 时临时显示 properties 表格。feature / Model / Primitive 通过临时 Entity 展示属性。SDK 生成的表格会转义属性文本。

运行示例：`examples/vue-demo/public/demos/events/picking-highlight.html`。
