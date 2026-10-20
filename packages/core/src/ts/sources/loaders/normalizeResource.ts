import { ResourceItem } from "..";
import { SafeTool } from "../../utils";

/** 资源访问合法性   */
export function normalizeResource<T extends ResourceItem>(input: T): T {
    if (!input || typeof input !== 'object') {
        throw new Error('资源配置不能为空。');
    }

    if (!input.properties || typeof input.properties !== 'object'
        || Array.isArray(input.properties)) {
        throw new Error(`资源「${input.name}」的 properties 必须是对象。`);
    }

    // 复制资源及 properties 外层
    const item = { ...input };
    item.properties = { ...input.properties };

    item.id ||= SafeTool.uuid();
    item.showInTree ??= true  // 默认在资源树中显示
    item.defaultLoad ??= true // 默认自动加载
    item.show ??= true        // 加载后默认显示
    item.offlineCache ??= false;

    return item;
}
