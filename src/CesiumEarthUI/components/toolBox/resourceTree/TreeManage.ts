// TreeManage.ts
import CesiumEarth from '@/lib/CesiumEarth'

export interface TreeNode {
    id: string
    label: string
    checked: boolean
    icon?: string
    isFolder: boolean
    resource?: any
    children?: TreeNode[]
}

export class TreeManage {
    private earth: CesiumEarth.Earth
    private workSpace: any
    public treeData: TreeNode[] = []

    constructor(earth: CesiumEarth.Earth) {
        this.earth = earth
        this.workSpace = earth.viewer3DWorkSpace
        this.buildTreeData()
    }

    // 构建树数据
    buildTreeData() {
        const catalogMap = new Map<string, TreeNode[]>()

        // 假设你有一个配置的资源列表
        const resourceList = this.getResourceList()

        resourceList.forEach((item: any) => {
            const catalogName = item.catalog || '未分类'
            if (!catalogMap.has(catalogName)) {
                catalogMap.set(catalogName, [])
            }

            const node: TreeNode = {
                id: item.pid,
                label: item.name,
                checked: item.show,
                isFolder: true,
                resource: item,
                children: [],
                icon: this.getIconByDataType(item.dataType),
            }

            catalogMap.get(catalogName)!.push(node)
        })

        this.treeData = this.generateTreeData(catalogMap)
    }

    // 获取资源列表（可以替换为实际数据源）
    getResourceList() {
        return [
            {
                pid: '1',
                name: '基础影像',
                catalog: '影像',
                dataType: 'layer',
                show: true,
            },
            {
                pid: '2',
                name: '地形图',
                catalog: '地形',
                dataType: 'terrain',
                show: false,
            },
            {
                pid: '3',
                name: '倾斜摄影',
                catalog: '3D Tiles',
                dataType: '3DTiles',
                show: true,
            },
        ]
    }

    // 获取数据类型对应的图标
    getIconByDataType(dataType: string): string {
        switch (dataType) {
            case CesiumEarth.DataTypeEnum.layer:
                return new URL('./img/tree/图层.png', import.meta.url).href
            case CesiumEarth.DataTypeEnum.terrain:
                return new URL('./img/tree/地形.png', import.meta.url).href
            case CesiumEarth.DataTypeEnum.Cesium3DTile:
                return new URL('./img/tree/倾斜摄影.png', import.meta.url).href
            case CesiumEarth.DataTypeEnum.gltf:
                return new URL('./img/tree/模型.png', import.meta.url).href
            case CesiumEarth.DataTypeEnum.poi:
                return new URL('./img/tree/点.png', import.meta.url).href
            case CesiumEarth.DataTypeEnum.geoJson:
                return new URL('./img/tree/geoJson.png', import.meta.url).href
            default:
                return ''
        }
    }

    // 生成树数据结构
    generateTreeData(catalogMap: Map<string, TreeNode[]>) {
        return Array.from(catalogMap.keys()).map((catalogName) => ({
            id: `catalog_${catalogName}`,
            label: catalogName,
            children: catalogMap.get(catalogName) || [],
            isFolder: true,
        }))
    }

    // 处理勾选事件
    async handleCheck(data: TreeNode, checked: boolean) {
        if (checked) {
            if (data.resource) {
                await this.workSpace.addData(data.resource)
                CesiumEarth.ConfigTool.setResourceParam?.(data.id, 'show', true)
            }
        } else {
            if (data.resource) {
                this.workSpace.removeDataByPid(data.resource.pid)
                CesiumEarth.ConfigTool.setResourceParam?.(data.id, 'show', false)
            }
        }

        this.buildTreeData()
    }

    // 点击节点
    handleNodeClick(data: TreeNode) {
        if (data.resource) {
            this.workSpace.flyToDataByPid(data.resource.pid)
        }
    }
}