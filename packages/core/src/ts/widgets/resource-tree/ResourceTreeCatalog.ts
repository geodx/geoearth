import { SourceType, type ResourceItem } from '../../sources/types';
import type { ResourceTreeGroup, ResourceTreeLayoutItem, ResourceTreeState } from './types';

/** 树的目录与布局。实例和实际加载状态仍由 ResourceManager 管理。 */
export class ResourceTreeCatalog {
    private readonly resources = new Map<string, ResourceItem>();
    private readonly layout = new Map<string, ResourceTreeLayoutItem>();
    private readonly initialLayout = new Map<string, ResourceTreeLayoutItem>();
    private catalogs: string[] = [];
    readonly expanded = new Set<string>();
    private nextOrder = 0;

    upsert(item: ResourceItem, runtime = false): void {
        if (!item.id) throw new Error(`资源「${item.name}」需要稳定的 id。`);
        const previous = this.resources.get(item.id);
        const properties = { ...(item.properties as object) };
        if (!runtime && previous?.sourceType === SourceType.IMAGERY) {
            const alpha = (previous.properties as { alpha?: number }).alpha;
            if (alpha !== undefined) (properties as { alpha?: number }).alpha = alpha;
        }
        this.resources.set(item.id, {
            ...item,
            show: runtime ? item.show : previous?.show ?? item.show,
            properties,
        });
        if (!this.initialLayout.has(item.id)) this.initialLayout.set(item.id, {
            id: item.id, catalog: item.catalog || '未分类', order: this.nextOrder++,
            base: item.sourceType === SourceType.IMAGERY
                && (item.properties as { baseLayer?: boolean }).baseLayer === true,
        });
        if (!this.layout.has(item.id)) {
            this.layout.set(item.id, { ...this.initialLayout.get(item.id) });
        }
        this.ensureCatalog(this.layout.get(item.id).catalog);
    }

    get(id: string): ResourceItem | undefined {
        const item = this.resources.get(id);
        return item ? { ...item, catalog: this.layout.get(id).catalog } : undefined;
    }

    all(): ResourceItem[] { return [...this.resources.keys()].map(id => this.get(id)); }
    isBase(id: string): boolean {
        return this.resources.get(id)?.sourceType === SourceType.IMAGERY && this.layout.get(id)?.base === true;
    }

    setBase(id: string, base: boolean): void {
        const item = this.require(id);
        if (item.sourceType !== SourceType.IMAGERY) throw new Error('只有影像可以设为底图。');
        this.layout.get(id).base = base;
    }

    groups(): ResourceTreeGroup[] {
        const groups = new Map<string, ResourceTreeGroup>();
        for (const item of this.all()) {
            if (item.showInTree === false) continue;
            const kind = item.sourceType === SourceType.TERRAIN ? 'terrain'
                : this.isBase(item.id) ? 'base' : 'catalog';
            const key = kind === 'catalog' ? `catalog:${item.catalog}` : kind;
            if (!groups.has(key)) groups.set(key, {
                key, kind, title: kind === 'base' ? '底图'
                    : kind === 'terrain' ? '地形' : item.catalog, items: [],
            });
            groups.get(key).items.push(item);
        }
        for (const group of groups.values()) group.items.sort((a, b) =>
            this.layout.get(a.id).order - this.layout.get(b.id).order);
        const rank = (g: ResourceTreeGroup) => g.kind === 'base' ? -2
            : g.kind === 'terrain' ? -1 : this.catalogs.indexOf(g.title);
        return [...groups.values()].sort((a, b) => rank(a) - rank(b));
    }

    prioritize(catalogs: string[]): void {
        this.catalogs = [...new Set([...catalogs, ...this.catalogs])];
    }

    move(id: string, catalog: string, beforeId?: string): void {
        const item = this.require(id);
        if (this.isBase(id) || item.sourceType === SourceType.TERRAIN) {
            throw new Error('底图、地形不支持拖入业务目录。');
        }
        if (!catalog.trim()) throw new Error('分类名称不能为空。');
        const target = beforeId ? this.require(beforeId) : undefined;
        if (target && (target.catalog !== catalog || this.isBase(target.id)
            || target.sourceType === SourceType.TERRAIN)) throw new Error('目标节点不在指定业务目录中。');
        if (beforeId === id) return;
        this.layout.get(id).catalog = catalog;
        this.ensureCatalog(catalog);
        const siblings = this.all().filter(r => r.id !== id && r.catalog === catalog
            && !this.isBase(r.id) && r.sourceType !== SourceType.TERRAIN)
            .sort((a, b) => this.layout.get(a.id).order - this.layout.get(b.id).order);
        const index = beforeId ? siblings.findIndex(r => r.id === beforeId) : siblings.length;
        siblings.splice(index, 0, this.get(id));
        siblings.forEach((r, order) => { this.layout.get(r.id).order = order; });
    }

    moveCatalog(catalog: string, beforeCatalog?: string): void {
        if (!this.catalogs.includes(catalog)) throw new Error('分类不存在。');
        if (catalog === beforeCatalog) return;
        if (beforeCatalog && !this.catalogs.includes(beforeCatalog)) throw new Error('目标分类不存在。');
        const order = this.catalogs.filter(value => value !== catalog);
        order.splice(beforeCatalog ? order.indexOf(beforeCatalog) : order.length, 0, catalog);
        this.catalogs = order;
    }

    exportState(): ResourceTreeState {
        return { version: 1, catalogs: [...this.catalogs],
            items: [...this.layout.values()].map(item => ({ ...item })),
            expanded: [...this.expanded] };
    }

    importState(input: unknown): void {
        // 全部校验通过后才替换，避免部分写入。
        const state = validateState(input);
        for (const item of state.items) {
            if (item.base && this.resources.has(item.id)
                && this.resources.get(item.id).sourceType !== SourceType.IMAGERY) {
                throw new Error('布局中只有影像可以标记为底图。');
            }
        }
        this.catalogs = [...new Set([...state.catalogs, ...this.catalogs])];
        for (const item of state.items) this.layout.set(item.id, { ...item });
        this.expanded.clear();
        state.expanded.forEach(key => this.expanded.add(key));
        this.nextOrder = Math.max(this.nextOrder, ...state.items.map(item => item.order + 1));
    }

    reset(): void {
        this.layout.clear(); this.catalogs = []; this.expanded.clear();
        for (const item of this.initialLayout.values()) {
            this.layout.set(item.id, { ...item }); this.ensureCatalog(item.catalog);
        }
    }

    private ensureCatalog(catalog: string): void {
        if (!this.catalogs.includes(catalog)) this.catalogs.push(catalog);
    }
    private require(id: string): ResourceItem {
        const item = this.get(id);
        if (!item) throw new Error(`资源不存在：${id}`);
        return item;
    }
}

export function validateState(input: unknown): ResourceTreeState {
    const state = input as ResourceTreeState;
    const strings = (v: unknown): v is string[] => Array.isArray(v)
        && v.length <= 10000 && v.every(s => typeof s === 'string' && s.length <= 1024);
    if (!state || state.version !== 1 || !strings(state.catalogs)
        || !strings(state.expanded) || !Array.isArray(state.items) || state.items.length > 10000) {
        throw new Error('资源树布局格式无效。');
    }
    const ids = new Set<string>();
    for (const item of state.items) {
        if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 1024
            || ids.has(item.id) || typeof item.catalog !== 'string' || !item.catalog.trim()
            || item.catalog.length > 1024 || typeof item.base !== 'boolean'
            || !Number.isSafeInteger(item.order) || item.order < 0) throw new Error('资源树布局条目无效。');
        ids.add(item.id);
    }
    return { version: 1, catalogs: [...state.catalogs], expanded: [...state.expanded],
        items: state.items.map(({ id, catalog, base, order }) => ({ id, catalog, base, order })) };
}
