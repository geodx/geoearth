export type TreeNode<T> = T & { children: TreeNode<T>[] }

/** 复制节点后组树；缺失父节点的项作为根节点，重复 ID 或父子循环直接报错。 */
export function arrayToTree<T, K>(items: readonly T[], getId: (item: T) => K, getParentId: (item: T) => K | null | undefined): TreeNode<T>[] {
    const nodes = new Map<K, TreeNode<T>>()
    for (const item of items) {
        const id = getId(item)
        if (nodes.has(id)) throw new Error(`树节点 ID 重复：${String(id)}`)
        nodes.set(id, { ...item, children: [] })
    }
    const roots: TreeNode<T>[] = []
    for (const item of items) {
        const node = nodes.get(getId(item))!
        const parentId = getParentId(item)
        const parent = parentId == null ? undefined : nodes.get(parentId)
        if (parent) parent.children.push(node)
        else roots.push(node)
    }
    // 只从根遍历即可判断是否存在无法到达的循环，避免逐节点重复追溯父链。
    if (flattenTree(roots).length !== items.length) throw new Error('树数据存在父子循环。')
    return roots
}

export function flattenTree<T>(roots: readonly TreeNode<T>[]): TreeNode<T>[] {
    const result: TreeNode<T>[] = []
    const stack = [...roots].reverse()
    while (stack.length) {
        const node = stack.pop()!
        result.push(node)
        for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i])
    }
    return result
}

export function findTreeNode<T>(roots: readonly TreeNode<T>[], predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | undefined {
    return flattenTree(roots).find(predicate)
}
