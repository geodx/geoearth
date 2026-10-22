import {
    CustomDataSource, Entity, GeoJsonDataSource, Color, Cartesian2, ConstantProperty,
    type Billboard, type Label, type PointPrimitive, type DataSource,
} from 'cesium'
import { OwnedResource } from '../../../utils/scene/OwnedResource'
import type { VisualizationHost } from '../../types'
import { clusterImage, MarkerAssets } from './assets'

export interface ClusterGraphics {
    billboard: Billboard
    label: Label
    point: PointPrimitive
}

export interface ClusterLayerOptions {
    /** 传入已有数据源时仅借用；省略时创建并管理自己的数据源。 */
    source?: DataSource
    pixelRange?: number
    minimumClusterSize?: number
    /** image 使用旧工程的数量分档贴图，point 使用简洁的点与数量。 */
    theme?: 'point' | 'image'
    billboardImage?: string
    style?: (entities: Entity[], graphics: ClusterGraphics) => void
}

export class ClusterLayer extends OwnedResource {
    readonly dataSource: DataSource
    readonly ready: Promise<void>
    private readonly borrowed: boolean
    private generation = 0

    constructor(host: VisualizationHost, private readonly options: ClusterLayerOptions = {}) {
        const pixelRange = options.pixelRange ?? 40, minimum = options.minimumClusterSize ?? 3
        if (!Number.isFinite(pixelRange) || pixelRange < 0 || !Number.isInteger(minimum) || minimum < 2) throw new RangeError('Invalid clustering options.')
        super(host)
        this.borrowed = !!options.source
        this.dataSource = options.source ?? new CustomDataSource('GeoEarth clusters')
        const cluster = this.dataSource.clustering
        const previous = {
            enabled: cluster.enabled,
            pixelRange: cluster.pixelRange,
            minimumClusterSize: cluster.minimumClusterSize,
            clusterBillboards: cluster.clusterBillboards,
            clusterLabels: cluster.clusterLabels,
            clusterPoints: cluster.clusterPoints
        }
        cluster.pixelRange = pixelRange
        cluster.minimumClusterSize = minimum
        cluster.clusterBillboards = cluster.clusterLabels = cluster.clusterPoints = true
        cluster.enabled = true
        this.own(cluster.clusterEvent.addEventListener((entities: Entity[], graphics: ClusterGraphics) => {
            graphics.billboard.show = false
            graphics.point.show = true
            graphics.point.pixelSize = 32
            graphics.point.color = Color.DEEPSKYBLUE
            graphics.label.show = true
            graphics.label.text = String(entities.length)
            graphics.label.fillColor = Color.WHITE
            graphics.label.pixelOffset = Cartesian2.ZERO
            graphics.point.id = graphics.label.id = entities
            if (options.theme === 'image') {
                graphics.point.show = false
                graphics.billboard.show = true
                graphics.billboard.image = clusterImage(entities.length)
                graphics.billboard.id = entities
                graphics.label.show = false
            }
            options.style?.(entities, graphics)
        }))
        if (this.borrowed) this.own(() => {
            if (!this.viewer.isDestroyed()) Object.assign(cluster, previous)
        })
        this.ready = this.borrowed ? Promise.resolve() : this.attachDataSource(this.dataSource)
    }

    get show(): boolean {
        return this.dataSource.show
    }

    set show(value: boolean) {
        this.assertAlive()
        this.dataSource.show = value
        this.requestRender()
    }

    add(options: Entity.ConstructorOptions): Entity {
        this.assertAlive()
        if (this.borrowed) throw new Error('Add data through the owner of a borrowed data source.')
        const entity = this.dataSource.entities.add(options)
        this.requestRender()
        return entity
    }

    async load(geojson: string | object): Promise<boolean> {
        this.assertAlive()
        if (this.borrowed) throw new Error('Load data through the owner of a borrowed data source.')
        const task = ++this.generation
        const loaded = await GeoJsonDataSource.load(geojson, { clampToGround: true })
        if (this.destroyed || this.viewer.isDestroyed() || task !== this.generation) return false
        this.dataSource.entities.suspendEvents()
        try {
            this.dataSource.entities.removeAll()
            for (const entity of loaded.entities.values) {
                const billboard = entity.billboard?.clone()
                if (billboard && (this.options.billboardImage || this.options.theme === 'image')) {
                    billboard.image = new ConstantProperty(this.options.billboardImage ?? MarkerAssets.camera)
                }
                this.dataSource.entities.add(new Entity({
                    id: entity.id,
                    name: entity.name,
                    position: entity.position,
                    billboard,
                    label: entity.label,
                    point: entity.point ?? (!entity.billboard ? { pixelSize: 8, color: Color.CYAN } : undefined),
                    properties: entity.properties
                }))
            }
        } finally {
            this.dataSource.entities.resumeEvents()
        }
        this.requestRender()
        return true
    }

    clear(): void {
        this.assertAlive()
        if (this.borrowed) throw new Error('Clear data through the owner of a borrowed data source.')
        ++this.generation
        this.dataSource.entities.removeAll()
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        ++this.generation
        // 先解除监听，再销毁自有数据源。
        super.destroy()
        if (!this.borrowed && !this.viewer.isDestroyed()) this.viewer.dataSources.remove(this.dataSource, true)
    }
}
