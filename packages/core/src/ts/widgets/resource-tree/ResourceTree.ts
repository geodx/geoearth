import { Wunderbaum } from 'wunderbaum';
import type { ImageryLayer } from 'cesium';
import { SourceEventType, ViewerEventType } from '../../events/types';
import { SourceType, type ResourceItem } from '../../sources/types';
import { ResourceTreeCatalog } from './ResourceTreeCatalog';
import type { ResourceTreeGroup, ResourceTreeHost, ResourceTreeOptions, ResourceTreeState } from './types';
import vendorStyle from 'wunderbaum/dist/wunderbaum.css?inline';
import ownStyle from './resource-tree.css?inline';

// 随打包后的第三方代码保留许可说明，不依赖额外的 vendor 文件。
const wunderbaumLicense = "/*! Wunderbaum\nMIT License\n\nCopyright (c) 2021-2025 Martin Wendt\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n*/";

type Node = ReturnType<Wunderbaum['findKey']>;
const styles = new WeakMap<Document, { element: HTMLStyleElement; count: number }>();
const resourceKey = (id: string) => `resource:${id}`;
const groupKey = (key: string) => `group:${key}`;
const errorOf = (e: unknown) => e instanceof Error ? e : new Error(String(e));
const iconMap = Object.fromEntries(Object.keys(Wunderbaum.iconMaps.bootstrap)
    .map(key => [key, `ge-rt-icon ge-rt-${key}`])) as typeof Wunderbaum.iconMaps.bootstrap;

/** 可独立挂载的资源树；只创建、移除自己在容器内生成的节点。 */
export class ResourceTree {
    private readonly catalog = new ResourceTreeCatalog();
    private options: ResourceTreeOptions;
    private tree?: Wunderbaum;
    private root?: HTMLDivElement;
    private treeElement?: HTMLDivElement;
    private status?: HTMLParagraphElement;
    private detail?: HTMLDivElement;
    private query = '';
    private selectedId?: string;
    private busy = false;
    private disposed = false;
    private refreshing = false;
    private queued = false;
    private changingOrder = false;
    private readonly knownGroups = new Set<string>();
    private readonly pending = new Set<string>();
    private readonly errors = new Map<string, string>();
    private cleanup: (() => void)[] = [];
    private releaseStyle?: () => void;
    private readonly removeDestroyListener: () => void;

    constructor(private readonly earth: ResourceTreeHost) {
        this.removeDestroyListener = earth.event.viewer.addEventListener(
            ViewerEventType.BEFORE_DESTROY, () => this.destroy());
    }

    get isOpen(): boolean { return this.root !== undefined; }

    async open(options: ResourceTreeOptions): Promise<void> {
        this.assertAlive();
        if (this.root) { this.show(); return; }
        const container = typeof options.container === 'string'
            ? this.earth.viewer.container.ownerDocument.getElementById(options.container) : options.container;
        if (!container?.appendChild) throw new Error('资源树容器不存在。');
        const firstOpen = !this.options;
        this.options = { draggable: true, allowCrossCatalog: true, ...options };
        this.query = '';
        this.syncCatalog();
        if (firstOpen) this.catalog.prioritize(options.catalogOrder ?? ['基础影像', '电子地图', '业务图层']);
        let restored = false;
        if (options.storageKey) {
            try {
                const value = container.ownerDocument.defaultView.localStorage.getItem(options.storageKey);
                if (value) { this.catalog.importState(JSON.parse(value)); restored = true; }
            } catch (error) { this.report(error); }
        }
        if (!restored && firstOpen && !this.catalog.expanded.size) {
            this.catalog.groups().forEach(group => this.catalog.expanded.add(group.key));
        }
        this.catalog.groups().forEach(group => this.knownGroups.add(group.key));
        const doc = container.ownerDocument;
        this.releaseStyle = acquireStyle(doc);
        const root = this.root = doc.createElement('div');
        root.className = 'geoearth-resource-tree';
        root.style.width = cssSize(options.width ?? '100%');
        root.style.height = cssSize(options.height ?? '100%');
        if (options.font) root.style.font = options.font;
        root.innerHTML = '<header class="ge-rt-heading"><strong></strong><span class="ge-rt-count"></span></header>'
            + '<div class="ge-rt-toolbar"><input type="search" aria-label="搜索资源" placeholder="搜索资源或分类…">'
            + '<button type="button" data-toolbar="expand" title="展开全部">＋</button>'
            + '<button type="button" data-toolbar="collapse" title="收起全部">－</button></div>'
            + '<div class="ge-rt-tree" aria-label="资源目录"></div>'
            + '<div class="ge-rt-detail" aria-label="当前资源"></div>'
            + '<p class="ge-rt-status" role="status" aria-live="polite">正在准备资源树…</p>';
        root.querySelector('strong').textContent = options.title ?? '资源管理';
        this.treeElement = root.querySelector('.ge-rt-tree');
        this.status = root.querySelector('.ge-rt-status');
        this.detail = root.querySelector('.ge-rt-detail');
        container.append(root);
        try {
            const tree = this.tree = new Wunderbaum({
                element: this.treeElement,
                source: [], header: false, checkbox: true, selectMode: 'hier',
                rowHeightPx: 32, debugLevel: 1, iconMap, tooltip: true,
                columns: [{ id: '*', title: '资源', width: '*' }, { id: 'actions', title: '操作', width: '74px' }],
                beforeSelect: e => {
                    if (this.refreshing || this.busy) return false;
                    const id = e.node.data.resourceId as string | undefined;
                    // 单选项重复点击保持当前选择；卸载由明确的“卸载”操作执行。
                    if (id && e.node.parent?.data.kind !== 'catalog' && !e.flag) return false;
                    if (id) this.launch(() => this.setLoaded(id, e.flag));
                    else if (e.node.data.kind === 'catalog') {
                        this.launch(() => this.setGroupLoaded(e.node.data.groupKey, e.flag));
                    }
                    return false;
                },
                activate: e => { this.selectedId = e.node.data.resourceId; this.renderDetail(); },
                click: e => {
                    const button = (e.event.target as Element).closest<HTMLButtonElement>('[data-resource-action]');
                    const id = e.node?.data.resourceId as string | undefined;
                    if (button && id) {
                        this.selectedId = id; this.renderDetail();
                        if (!button.disabled) this.launch(() => button.dataset.resourceAction === 'eye'
                            ? this.setVisible(id, !this.visible(id)) : this.locate(id));
                        return false;
                    }
                    if (id && e.info.region === 'title' && this.earth.sources.isLoaded(id)) {
                        this.launch(() => this.locate(id));
                    }
                },
                expand: e => {
                    // 0.14.1 的声明漏掉 expand 事件的 node、flag 字段。
                    const { node, flag } = e as typeof e & { node?: Node; flag?: boolean };
                    const key = node?.data.groupKey as string | undefined;
                    if (key && !this.refreshing && !this.query) {
                        if (flag) this.catalog.expanded.add(key); else this.catalog.expanded.delete(key);
                        this.saveState();
                    }
                },
                render: e => {
                    const checkbox = e.nodeElem.querySelector<HTMLElement>('.wb-checkbox');
                    if (checkbox) {
                        const radio = e.node.checkbox === 'radio';
                        checkbox.setAttribute('role', radio ? 'radio' : 'checkbox');
                        checkbox.setAttribute('aria-label', `${radio ? '选择' : '加载'} ${e.node.title}`);
                        checkbox.setAttribute('aria-checked', e.node.isPartsel() && !radio ? 'mixed' : String(e.node.isSelected() === true));
                        checkbox.setAttribute('aria-disabled', String(this.busy));
                        checkbox.tabIndex = 0;
                    }
                    const cell = e.renderColInfosById.actions?.elem;
                    if (!cell) return;
                    cell.replaceChildren();
                    const id = e.node.data.resourceId as string | undefined;
                    if (!id) return;
                    const item = this.catalog.get(id);
                    const loaded = this.earth.sources.isLoaded(id);
                    if (item.sourceType !== SourceType.TERRAIN) {
                        const eye = this.button(this.visible(id) ? '◉' : '○',
                            this.visible(id) ? '隐藏资源' : '显示资源');
                        eye.dataset.resourceAction = 'eye';
                        eye.setAttribute('aria-pressed', String(this.visible(id)));
                        eye.disabled = !loaded || this.busy;
                        cell.append(eye);
                    }
                    const locate = this.button('⌖', '定位资源');
                    locate.dataset.resourceAction = 'locate';
                    locate.disabled = !loaded || this.busy;
                    cell.append(locate);
                },
                dnd: {
                    guessDropEffect: false, effectAllowed: 'move', dropEffectDefault: 'move',
                    preventForeignNodes: true, preventNonNodes: true,
                    preventRecursion: true, serializeClipboardData: false,
                    dragStart: e => this.canDrag(e.node),
                    dragEnter: e => this.dropRegions(e.sourceNode, e.node),
                    drop: e => {
                        if (!this.canDrag(e.sourceNode) || !this.dropRegions(e.sourceNode, e.node)) return;
                        try { this.drop(e.sourceNode, e.node, e.region); }
                        catch (error) { this.report(error); }
                    },
                },
            });
            this.bindEvents();
            await tree.ready;
            if (this.tree !== tree || !this.root) return;
            this.refresh();
            this.applyImageryOrder();
            this.message('复选框控制加载，眼睛控制显隐；可拖动分类和业务资源。');
        } catch (error) { this.close(); throw error; }
    }

    /** 合并配置目录和已加载资源；保留观察到的动态资源，卸载后仍可勾选。 */
    refresh(): void {
        if (!this.tree || !this.root || this.disposed) return;
        this.syncCatalog();
        this.refreshing = true;
        try {
            const groups = this.catalog.groups();
            const visibleKeys = new Set(groups.flatMap(group => group.items.map(item => resourceKey(item.id))));
            this.tree.visit(node => {
                if (node.data.resourceId && !visibleKeys.has(node.key)) node.remove();
            });
            groups.forEach((group, index) => {
                if (!this.knownGroups.has(group.key)) {
                    this.knownGroups.add(group.key); this.catalog.expanded.add(group.key);
                }
                let parent = this.tree.findKey(groupKey(group.key));
                if (!parent) parent = this.tree.root.addChildren({
                    key: groupKey(group.key), title: group.title, children: [],
                    expanded: this.catalog.expanded.has(group.key), checkbox: group.kind === 'catalog',
                    radiogroup: group.kind !== 'catalog', icon: 'ge-rt-icon ge-rt-folder',
                    groupKey: group.key, kind: group.kind,
                });
                parent.unselectable = this.busy;
                placeNode(parent, this.tree.root, index);
                group.items.forEach((item, childIndex) => {
                    let node = this.tree.findKey(resourceKey(item.id));
                    if (!node) node = parent.addChildren({
                        key: resourceKey(item.id), title: item.name, resourceId: item.id,
                    });
                    placeNode(node, parent, childIndex);
                    if (node.title !== item.name) node.setTitle(item.name);
                    node.checkbox = group.kind === 'catalog' ? true : 'radio';
                    const iconType = Object.values(SourceType).includes(item.sourceType) ? item.sourceType : 'unknown';
                    const icon = `ge-rt-icon ge-rt-type-${iconType}`;
                    if (node.icon !== icon) node.setIcon(icon);
                    node.unselectable = this.busy;
                    node.tooltip = this.errors.get(item.id) ?? item.name;
                    node.setSelected(group.kind === 'base'
                        ? this.earth.sources.isLoaded(item.id) && this.visible(item.id)
                        : this.earth.sources.isLoaded(item.id), { noEvents: true, force: true });
                    node.setClass('ge-rt-loading', this.pending.has(item.id));
                    node.setClass('ge-rt-error', this.errors.has(item.id));
                    node.update();
                });
            });
            const keys = new Set(groups.map(group => groupKey(group.key)));
            for (const node of [...(this.tree.root.children ?? [])]) if (!keys.has(node.key)) node.remove();
            this.tree.root.fixSelection3FromEndNodes({ noEvents: true, force: true });
            for (const parent of this.tree.root.children ?? []) parent.update();
            if (this.query) this.applyFilter();
            const count = groups.reduce((sum, group) => sum + group.items.length, 0);
            this.root.querySelector('.ge-rt-count').textContent = `${count} 项`;
            this.root.setAttribute('aria-busy', String(this.busy));
            this.renderDetail();
        } finally { this.refreshing = false; }
    }

    async setLoaded(id: string, loaded: boolean): Promise<void> {
        await this.perform(async () => {
            if (loaded) await this.loadOne(id); else this.unloadOne(id);
        });
    }

    async setGroupLoaded(key: string, loaded: boolean): Promise<void> {
        const group = this.catalog.groups().find(group => group.key === key);
        if (!group || group.kind !== 'catalog') throw new Error('只能批量操作业务目录。');
        await this.perform(async () => {
            const failures: string[] = [];
            for (const item of group.items) {
                this.assertAlive();
                try { if (loaded) await this.loadOne(item.id); else this.unloadOne(item.id); }
                catch (error) { failures.push(`${item.name}：${errorOf(error).message}`); }
            }
            if (failures.length) throw new Error(failures.join('；'));
        });
    }

    async setVisible(id: string, visible: boolean): Promise<void> {
        await this.perform(async () => {
            if (visible && this.catalog.isBase(id) && this.earth.sources.isLoaded(id)) {
                await this.selectBase(id); return;
            }
            if (!this.earth.sources.setResourceVisible(id, visible)) throw new Error('资源尚未加载。');
            this.rememberRuntime(id);
        });
    }

    async setBaseImagery(id: string): Promise<void> {
        await this.perform(() => this.selectBase(id));
    }

    setAlpha(id: string, alpha: number): void {
        this.assertIdle();
        const item = this.requireResource(id);
        if (item.sourceType !== SourceType.IMAGERY || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
            throw new Error('影像透明度必须在 0～1 之间。');
        }
        const layer = this.earth.sources.getInstance(id) as ImageryLayer | undefined;
        if (!layer) throw new Error('影像尚未加载。');
        layer.alpha = alpha;
        this.rememberRuntime(id);
        this.earth.event.source.raiseEvent(SourceEventType.CHANGE, {
            type: SourceEventType.CHANGE, sourceType: item.sourceType, source: this.catalog.get(id), id,
        });
        this.refresh();
    }

    moveResource(id: string, catalog: string, beforeId?: string): void {
        this.assertIdle();
        const item = this.requireResource(id);
        if (this.options.allowCrossCatalog === false && item.catalog !== catalog) throw new Error('已禁用跨分类移动。');
        this.catalog.move(id, catalog, beforeId);
        this.layoutChanged();
    }

    exportState(): ResourceTreeState { return this.catalog.exportState(); }

    importState(state: unknown): void {
        this.assertIdle();
        this.catalog.importState(state);
        this.layoutChanged();
        this.restoreExpansion();
    }

    resetState(): void {
        this.assertIdle();
        this.catalog.reset();
        this.catalog.prioritize(this.options.catalogOrder ?? []);
        this.catalog.groups().forEach(group => this.catalog.expanded.add(group.key));
        this.layoutChanged();
        this.restoreExpansion();
    }

    show(): void {
        if (this.root) { this.root.hidden = false; this.refresh(); }
    }
    hide(): void { if (this.root) this.root.hidden = true; }

    close(): void {
        this.cleanup.splice(0).forEach(stop => stop());
        this.tree?.destroy(); this.tree = undefined;
        this.root?.remove(); this.root = undefined;
        this.detail = undefined; this.status = undefined; this.treeElement = undefined;
        this.releaseStyle?.(); this.releaseStyle = undefined;
    }

    destroy(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.close(); this.removeDestroyListener();
    }

    private bindEvents(): void {
        for (const type of Object.values(SourceEventType)) {
            this.cleanup.push(this.earth.event.source.addEventListener(type, event => {
                const item = event.source as ResourceItem;
                if (item?.id && item.name && item.properties) {
                    this.catalog.upsert(item, event.type !== SourceEventType.REMOVE);
                }
                this.queueRefresh();
            }));
        }
        const layers = this.earth.viewer.imageryLayers;
        this.cleanup.push(layers.layerShownOrHidden.addEventListener(() => this.queueRefresh()));
        this.cleanup.push(layers.layerMoved.addEventListener(() => {
            if (!this.changingOrder) this.queueRefresh();
        }));
        const root = this.root;
        const search = root.querySelector<HTMLInputElement>('input[type=search]');
        const input = () => { this.query = search.value.trim(); this.applyFilter(); };
        search.addEventListener('input', input);
        this.cleanup.push(() => search.removeEventListener('input', input));
        const toolbar = (event: MouseEvent) => {
            const action = (event.target as Element).closest<HTMLElement>('[data-toolbar]')?.dataset.toolbar;
            if (action) this.tree.root.visit(node => {
                if (node.data.groupKey) void node.setExpanded(action === 'expand').catch(error => this.report(error));
            });
        };
        root.addEventListener('click', toolbar);
        this.cleanup.push(() => root.removeEventListener('click', toolbar));
    }

    private syncCatalog(): void {
        const configured = this.options?.getResources?.() ?? this.earth.config?.getAllConfig() ?? [];
        configured.forEach(item => this.catalog.upsert(item));
        this.earth.sources.getAllSourceItems().forEach(item => {
            const instance = this.earth.sources.getInstance(item.id) as { show?: boolean; alpha?: number };
            const record = { ...item, show: typeof instance?.show === 'boolean' ? instance.show : item.show,
                properties: { ...(item.properties as object) } };
            if (item.sourceType === SourceType.IMAGERY && typeof instance?.alpha === 'number') {
                (record.properties as { alpha?: number }).alpha = instance.alpha;
            }
            this.catalog.upsert(record, true);
        });
    }

    private queueRefresh(): void {
        if (this.queued || !this.root || this.disposed) return;
        this.queued = true;
        queueMicrotask(() => {
            this.queued = false;
            if (this.root && !this.disposed) {
                try { this.refresh(); } catch (error) { this.report(error); }
            }
        });
    }

    private async loadOne(id: string): Promise<void> {
        const item = this.requireResource(id);
        this.pending.add(id); this.errors.delete(id); this.refresh();
        try {
            if (this.catalog.isBase(id)) { await this.selectBase(id); return; }
            if (this.earth.sources.isLoaded(id)) return;
            await this.earth.sources.addData(item);
            this.assertAlive();
            if (!this.earth.sources.isLoaded(id)) throw new Error('未生成资源实例。');
        } catch (error) {
            this.errors.set(id, errorOf(error).message); throw error;
        } finally { this.pending.delete(id); }
    }

    private unloadOne(id: string): void {
        this.requireResource(id);
        this.rememberRuntime(id);
        if (this.earth.sources.isLoaded(id) && !this.earth.sources.removeSourceById(id)) {
            throw new Error('卸载资源失败。');
        }
        this.errors.delete(id);
    }

    private async selectBase(id: string): Promise<void> {
        const item = this.requireResource(id);
        if (item.sourceType !== SourceType.IMAGERY) throw new Error('只有影像可以设为底图。');
        this.pending.add(id); this.errors.delete(id); this.refresh();
        try {
            if (!this.earth.sources.isLoaded(id)) await this.earth.sources.addData({
                ...item, show: true, properties: { ...(item.properties as object), baseLayer: true },
            });
            this.assertAlive();
            if (!this.earth.sources.isLoaded(id)) throw new Error('底图加载失败。');
            if (!this.earth.sources.setResourceVisible(id, true)) throw new Error('底图无法显示。');
            this.catalog.setBase(id, true);
            // 新底图创建成功后才隐藏旧底图，失败时不影响原来的选择。
            for (const other of this.catalog.all()) {
                if (other.id !== id && this.catalog.isBase(other.id) && this.earth.sources.isLoaded(other.id)) {
                    this.earth.sources.setResourceVisible(other.id, false);
                    this.rememberRuntime(other.id);
                }
            }
            this.rememberRuntime(id); this.saveState();
        } catch (error) { this.errors.set(id, errorOf(error).message); throw error; }
        finally { this.pending.delete(id); }
    }

    private async perform(operation: () => Promise<void>): Promise<void> {
        this.assertIdle();
        this.busy = true; this.refresh();
        this.message('正在处理资源…');
        try {
            await operation();
            this.assertAlive();
            this.applyImageryOrder();
            this.message('操作完成。');
        } finally {
            this.busy = false;
            if (!this.disposed) this.refresh();
        }
    }

    private async locate(id: string): Promise<void> {
        await this.perform(async () => {
            if (!this.earth.sources.isLoaded(id)) throw new Error('请先加载资源。');
            if (!await this.earth.sources.flyToSourceById(id)) throw new Error('资源没有可定位范围，或飞行已取消。');
        });
    }

    private rememberRuntime(id: string): void {
        const item = this.catalog.get(id);
        if (!item) return;
        const instance = this.earth.sources.getInstance(id) as { show?: boolean; alpha?: number };
        if (typeof instance?.show === 'boolean') item.show = instance.show;
        if (item.sourceType === SourceType.IMAGERY && typeof instance?.alpha === 'number') {
            item.properties = { ...(item.properties as object), alpha: instance.alpha };
        }
        this.catalog.upsert(item, true);
    }

    private applyImageryOrder(): void {
        if (this.disposed || this.earth.viewer.isDestroyed()) return;
        const layers = this.earth.viewer.imageryLayers;
        const managed = this.catalog.groups().flatMap(group => group.kind === 'catalog' ? group.items : [])
            .filter(item => item.sourceType === SourceType.IMAGERY && this.earth.sources.isLoaded(item.id))
            .map(item => this.earth.sources.getInstance(item.id) as ImageryLayer);
        // 保留未展示或由外部管理的影像槽位，只排列树中的业务影像。
        const selected = new Set(managed);
        const desired: ImageryLayer[] = [];
        const ordered = [...managed].reverse();
        let next = 0;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers.get(i);
            desired.push(selected.has(layer) ? ordered[next++] : layer);
        }
        this.changingOrder = true;
        try {
            desired.forEach((layer, index) => { if (layers.get(index) !== layer) {
                // 用公开 API 把目标图层移到期望位置，不销毁、不重新加载。
                while (layers.indexOf(layer) > index) layers.lower(layer);
                while (layers.indexOf(layer) < index) layers.raise(layer);
            } });
            for (const item of this.catalog.all()) {
                if (this.catalog.isBase(item.id) && this.earth.sources.isLoaded(item.id)) {
                    layers.lowerToBottom(this.earth.sources.getInstance(item.id) as ImageryLayer);
                }
            }
        } finally { this.changingOrder = false; }
        this.earth.viewer.scene.requestRender();
    }

    private renderDetail(): void {
        if (!this.detail) return;
        const item = this.selectedId ? this.catalog.get(this.selectedId) : undefined;
        if (!item) {
            this.detail.textContent = '选择资源可调整透明度、顺序和分类。';
            delete this.detail.dataset.signature; return;
        }
        const groupForDetail = this.catalog.groups().find(group => group.items.some(r => r.id === item.id));
        const signature = JSON.stringify([item.id, item.name, item.catalog, item.sourceType,
            this.earth.sources.isLoaded(item.id), this.busy, this.catalog.isBase(item.id),
            this.errors.get(item.id), groupForDetail?.items.map(r => r.id)]);
        if (this.detail.dataset.signature === signature) {
            const range = this.detail.querySelector<HTMLInputElement>('input[type=range]');
            const layer = this.earth.sources.getInstance(item.id) as ImageryLayer | undefined;
            if (range && layer && this.detail.ownerDocument.activeElement !== range) range.value = String(layer.alpha);
            return;
        }
        this.detail.dataset.signature = signature;
        this.detail.replaceChildren();
        const doc = this.detail.ownerDocument;
        const title = doc.createElement('strong'); title.textContent = item.name; this.detail.append(title);
        const summary = doc.createElement('p');
        summary.textContent = `${item.sourceType} · ${this.earth.sources.isLoaded(item.id) ? '已加载' : '未加载'}`;
        this.detail.append(summary);
        if (item.sourceType === SourceType.IMAGERY) {
            const label = doc.createElement('label'); label.textContent = '透明度 ';
            const alpha = doc.createElement('input'); alpha.type = 'range'; alpha.min = '0'; alpha.max = '1'; alpha.step = '0.05';
            alpha.setAttribute('aria-label', '影像透明度');
            const layer = this.earth.sources.getInstance(item.id) as ImageryLayer;
            alpha.value = String(layer?.alpha ?? 1); alpha.disabled = this.busy || !layer;
            alpha.addEventListener('change', () => { try { this.setAlpha(item.id, Number(alpha.value)); } catch (e) { this.report(e); } });
            label.append(alpha); this.detail.append(label);
        }
        const actions = doc.createElement('div'); actions.className = 'ge-rt-actions';
        const add = (text: string, task: () => void | Promise<void>, disabled = false) => {
            const button = this.button(text, text); button.disabled = this.busy || disabled;
            button.addEventListener('click', () => this.launch(task)); actions.append(button);
        };
        add('卸载', () => this.setLoaded(item.id, false), !this.earth.sources.isLoaded(item.id));
        if (item.sourceType === SourceType.IMAGERY) {
            add(this.catalog.isBase(item.id) ? '作为叠加图' : '设为底图', () => {
                if (!this.catalog.isBase(item.id)) return this.setBaseImagery(item.id);
                this.catalog.setBase(item.id, false); this.layoutChanged();
            });
        }
        const group = groupForDetail;
        if (group?.kind === 'catalog') {
            const index = group.items.findIndex(r => r.id === item.id);
            add('上移', () => this.moveResource(item.id, item.catalog, group.items[index - 1].id), index === 0);
            add('下移', () => this.moveResource(item.id, item.catalog, group.items[index + 2]?.id), index === group.items.length - 1);
            if (this.options.allowCrossCatalog) {
                const move = doc.createElement('div'); move.className = 'ge-rt-move';
                const input = doc.createElement('input'); input.type = 'text'; input.value = item.catalog;
                input.setAttribute('aria-label', '目标分类'); input.disabled = this.busy;
                const button = this.button('移动', '移动到目标分类'); button.disabled = this.busy;
                button.addEventListener('click', () => this.launch(() => this.moveResource(item.id, input.value.trim())));
                move.append(input, button); this.detail.append(move);
            }
        }
        this.detail.append(actions);
        if (this.errors.has(item.id)) {
            const error = doc.createElement('p'); error.className = 'ge-rt-error-text';
            error.textContent = this.errors.get(item.id); this.detail.append(error);
        }
    }

    private canDrag(node: Node): boolean {
        if (!node || !this.options.draggable || this.busy || this.query) return false;
        const item = node.data.resourceId ? this.catalog.get(node.data.resourceId) : undefined;
        return item ? !this.catalog.isBase(item.id) && item.sourceType !== SourceType.TERRAIN
            : node.data.kind === 'catalog';
    }

    private dropRegions(source: Node, target: Node): false | ('before' | 'after' | 'over')[] {
        if (!this.canDrag(source) || !target || source === target) return false;
        if (!source.data.resourceId) return target.data.kind === 'catalog' ? ['before', 'after'] : false;
        const item = target.data.resourceId ? this.catalog.get(target.data.resourceId) : undefined;
        const targetGroup = item ? this.catalog.groups().find(g => g.items.some(r => r.id === item.id))
            : this.catalog.groups().find(g => g.key === target.data.groupKey);
        if (targetGroup?.kind !== 'catalog') return false;
        if (!this.options.allowCrossCatalog && this.catalog.get(source.data.resourceId).catalog !== targetGroup.title) return false;
        return item ? ['before', 'after'] : ['over'];
    }

    private drop(source: Node, target: Node, region: string): void {
        if (!source.data.resourceId) {
            const groups = this.catalog.groups().filter(group => group.kind === 'catalog');
            const index = groups.findIndex(g => g.key === target.data.groupKey);
            this.catalog.moveCatalog(source.title, region === 'before' ? target.title : groups[index + 1]?.title);
            this.layoutChanged(); return;
        }
        const targetId = target.data.resourceId as string | undefined;
        const group = targetId
            ? this.catalog.groups().find(g => g.items.some(r => r.id === targetId))
            : this.catalog.groups().find(g => g.key === target.data.groupKey);
        const index = group.items.findIndex(r => r.id === targetId);
        this.moveResource(source.data.resourceId, group.title,
            region === 'before' ? targetId : region === 'after' ? group.items[index + 1]?.id : undefined);
    }

    private layoutChanged(): void {
        this.refresh(); this.applyImageryOrder(); this.saveState();
    }
    private restoreExpansion(): void {
        this.tree?.root.visit(node => {
            if (node.data.groupKey) void node.setExpanded(this.catalog.expanded.has(node.data.groupKey), { noEvents: true });
        });
    }
    private applyFilter(): void {
        if (!this.tree) return;
        if (!this.query) { this.tree.clearFilter(); this.restoreExpansion(); return; }
        const query = this.query.toLocaleLowerCase();
        this.tree.filterNodes(node => {
            const item = node.data.resourceId ? this.catalog.get(node.data.resourceId) : undefined;
            return `${node.title} ${item?.catalog ?? ''}`.toLocaleLowerCase().includes(query);
        }, { mode: 'hide', autoExpand: true });
    }
    private saveState(): void {
        const state = this.exportState();
        if (this.options?.storageKey && this.root) {
            try { this.root.ownerDocument.defaultView.localStorage.setItem(this.options.storageKey, JSON.stringify(state)); }
            catch (error) { this.report(error); }
        }
        try { this.options?.onChange?.(state); } catch (error) { this.report(error); }
    }
    private visible(id: string): boolean {
        return (this.earth.sources.getInstance(id) as { show?: boolean })?.show === true;
    }
    private requireResource(id: string): ResourceItem {
        const item = this.catalog.get(id);
        if (!item) throw new Error(`资源不存在：${id}`);
        return item;
    }
    private assertAlive(): void {
        if (this.disposed || this.earth.viewer.isDestroyed()) throw new Error('资源树或地球已经销毁。');
    }
    private assertIdle(): void {
        this.assertAlive();
        if (this.busy) throw new Error('正在处理资源，请稍候。');
    }
    private launch(task: () => void | Promise<void>): void {
        Promise.resolve().then(task).catch(error => this.report(error));
    }
    private message(text: string, error = false): void {
        if (this.status) { this.status.textContent = text; this.status.dataset.error = String(error); }
    }
    private report(error: unknown): void {
        const value = errorOf(error); this.message(value.message, true);
        try { this.options?.onError?.(value); } catch { /* 用户回调不改变控件状态。 */ }
    }
    private button(text: string, title: string): HTMLButtonElement {
        const button = this.root.ownerDocument.createElement('button');
        button.type = 'button'; button.textContent = text; button.title = title; button.setAttribute('aria-label', title);
        return button;
    }
}

function placeNode(node: Node, parent: Node, index: number): void {
    if (parent.children?.[index] === node) return;
    const next = parent.children?.[index];
    if (next && next !== node) node.moveTo(next, 'before'); else node.moveTo(parent, 'appendChild');
}
function cssSize(value: number | string): string { return typeof value === 'number' ? `${value}px` : value; }
function acquireStyle(doc: Document): () => void {
    let entry = styles.get(doc);
    if (!entry) {
        const element = doc.createElement('style'); element.dataset.geoearthResourceTree = 'true';
        element.textContent = `${wunderbaumLicense}\n${vendorStyle}\n${ownStyle}`; doc.head.append(element);
        entry = { element, count: 0 }; styles.set(doc, entry);
    }
    entry.count++;
    return () => { if (--entry.count === 0) { entry.element.remove(); styles.delete(doc); } };
}
