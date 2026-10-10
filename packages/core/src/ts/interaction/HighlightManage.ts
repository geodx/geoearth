import { Color, type Scene } from 'cesium'
import { defaultHighlightAdapters } from './highlightAdapters'
import { isPickAlive, samePick } from './pickObject'
import type { HighlightAdapter, HighlightColor, PickResult } from './types'

interface HighlightState { result: PickResult; color: Color }
interface AppliedHighlight extends HighlightState { restore: () => void }

export function highlightColor(value: HighlightColor): Color {
    const color = typeof value === 'string' ? Color.fromCssColorString(value) : Color.clone(value)
    if (!color) throw new Error(`Invalid highlight color: ${value}`)
    return color
}

/** 统一管理多个高亮来源，避免悬停离开时错误恢复仍被选中的对象。 */
export class HighlightManage {
    private readonly adapters = [...defaultHighlightAdapters]
    private readonly applied: AppliedHighlight[] = []

    constructor(private readonly scene: Scene) {}

    registerAdapter(adapter: HighlightAdapter): () => void {
        this.adapters.unshift(adapter)
        return () => {
            const index = this.adapters.indexOf(adapter)
            if (index !== -1) this.adapters.splice(index, 1)
        }
    }

    /** 按低到高的优先级传入：hover < select < 手动 highlight。 */
    update(states: HighlightState[]): void {
        const desired: HighlightState[] = []
        for (const state of states) {
            const index = desired.findIndex(item => samePick(item.result, state.result))
            if (index !== -1) desired.splice(index, 1)
            desired.push(state)
        }
        for (let index = this.applied.length - 1; index >= 0; index--) {
            const applied = this.applied[index]
            const next = desired.find(item => samePick(item.result, applied.result))
            if (next && Color.equals(next.color, applied.color)) continue
            // 原生集合可能先销毁对象再发 remove，已销毁的对象不能再写回样式。
            if (applied.result.type === 'entity' || isPickAlive(applied.result)) applied.restore()
            this.applied.splice(index, 1)
        }
        for (const state of desired) {
            if (this.applied.some(item => samePick(item.result, state.result))) continue
            const adapter = this.adapters.find(item => item.supports(state.result))
            const restore = adapter?.apply(state.result, state.color)
            if (restore) this.applied.push({ ...state, restore })
        }
        this.scene.requestRender()
    }

    has(result: PickResult): boolean {
        return this.applied.some(item => samePick(item.result, result))
    }

    /** 所在原生集合已销毁，直接释放样式记录，不能访问其中的子对象。 */
    discard(result: PickResult): void {
        const index = this.applied.findIndex(item => samePick(item.result, result))
        if (index !== -1) this.applied.splice(index, 1)
    }

    clear(): void { this.update([]) }
}
