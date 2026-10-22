import {
    Cartesian2, Cartesian3, Color, CustomDataSource, Entity, ImageMaterialProperty,
    LabelStyle, VerticalOrigin, ArcType, HeightReference,
} from 'cesium'
import { pointOnFeature } from '@turf/turf'
import { OwnedResource } from '../../../../utils/scene/OwnedResource'
import { toCartesian } from '../../../../utils/coordinate/positions'
import type { VisualizationHost } from '../../../types'
import { GradientMaterial } from '../../../materials/areas/GradientMaterial'
import { polygonHierarchy, regionPolygons, ringPositions } from './base/regionGeometry'
import type { RegionData, RegionFeature, RegionLayerOptions, RegionStyle } from './types'
import { RegionAssets } from './assets'

/** 区域支持多面及孔洞；填充、边界和墙体分别绘制，每个要素生成一个标签。 */
export class RegionLayer extends OwnedResource {
    readonly dataSource = new CustomDataSource('GeoEarth regions')
    readonly ready: Promise<void>
    private options: RegionLayerOptions

    constructor(host: VisualizationHost, options: RegionLayerOptions) {
        super(host)
        this.options = options
        try {
            this.setData(options.data)
        }
        catch (error) {
            super.destroy()
            throw error
        }
        this.dataSource.show = options.show ?? true
        this.ready = this.attachDataSource(this.dataSource)
    }

    get show(): boolean {
        return this.dataSource.show
    }

    set show(value: boolean) {
        this.assertAlive()
        this.dataSource.show = value
        this.requestRender()
    }

    setStyle(style: NonNullable<RegionLayerOptions['style']>): void {
        this.assertAlive()
        const previous = this.options
        this.options = { ...previous, style }
        try {
            this.setData(previous.data)
        }
        catch (error) {
            this.options = previous
            throw error
        }
    }

    setData(data: RegionData): void {
        this.assertAlive()
        const features = Array.isArray(data) ? data as RegionFeature[] : (data as {
            features: RegionFeature[]
        }).features
        if (!Array.isArray(features)) throw new Error('Region data must be a FeatureCollection or feature array.')
        // 先生成全部新实体，再替换当前数据，避免无效更新清空已有区域。
        const entities: Entity[] = []
        features.forEach((feature, index) => {
            const configured = typeof this.options.style === 'function' ? this.options.style(feature, index) : this.options.style
            const style: RegionStyle = {
                ...(this.options.theme === 'administrative' ? { fillImage: RegionAssets.grid, fillRepeat: new Cartesian2(10, 10), wallImage: RegionAssets.wall } : {}),
                ...configured,
            }
            const height = style.height ?? 0, extruded = style.extrudedHeight
            if (!Number.isFinite(height) || (extruded !== undefined && !Number.isFinite(extruded)) || !Number.isFinite(style.outlineWidth ?? 2) || (style.outlineWidth ?? 2) < 0) throw new RangeError('Invalid region heights or outline width.')
            const color = style.fillColor ?? Color.CYAN.withAlpha(.35)
            const top = Math.max(height, extruded ?? height)
            regionPolygons(feature).forEach(rings => {
                entities.push(new Entity({
                    name: String(feature.properties?.name ?? ''), properties: feature.properties ?? {}, polygon: {
                        hierarchy: polygonHierarchy(rings, style.perPositionHeight ? undefined : height),
                        perPositionHeight: style.perPositionHeight ?? false,
                        ...(style.perPositionHeight ? {} : { height }), extrudedHeight: extruded,
                        material: style.fillMaterial ?? (style.fillImage
                            ? new ImageMaterialProperty({ image: style.fillImage, repeat: style.fillRepeat, color, transparent: true })
                            : style.gradient ? new GradientMaterial({ color }) : color),
                    }
                }))
                for (const ring of rings) {
                    if ((style.outlineWidth ?? 2) > 0) entities.push(new Entity({
                        polyline: {
                            positions: ringPositions(ring, style.outlineHeight ?? top), material: style.outlineMaterial ?? style.outlineColor ?? Color.CYAN,
                            width: style.outlineWidth ?? 2, arcType: ArcType.GEODESIC,
                        }
                    }))
                    if (style.wallImage) {
                        const positions = ringPositions(ring, top)
                        entities.push(new Entity({
                            wall: {
                                positions, maximumHeights: positions.map(() => top), minimumHeights: positions.map(() => Math.min(height, extruded ?? 0)),
                                material: new ImageMaterialProperty({ image: style.wallImage, repeat: style.wallRepeat, color: style.wallColor ?? Color.WHITE, transparent: true }),
                            }
                        }))
                    }
                }
            })
            const text = style.labelText ?? feature.properties?.[this.options.labelProperty ?? 'name']
            if (this.options.showLabels !== false && text != null) {
                const [longitude, latitude] = pointOnFeature(feature).geometry.coordinates
                entities.push(new Entity({
                    position: style.labelPosition ? toCartesian(style.labelPosition) : Cartesian3.fromDegrees(longitude, latitude, top), label: {
                        text: String(text), font: '14px sans-serif', fillColor: Color.WHITE, outlineColor: Color.BLACK,
                        outlineWidth: 2, style: LabelStyle.FILL_AND_OUTLINE, verticalOrigin: VerticalOrigin.BOTTOM,
                        pixelOffset: new Cartesian2(0, -8), heightReference: HeightReference.NONE, ...style.label,
                    }
                }))
            }
        })
        this.dataSource.entities.suspendEvents()
        try {
            this.dataSource.entities.removeAll()
            entities.forEach(entity => this.dataSource.entities.add(entity))
        }
        finally {
            this.dataSource.entities.resumeEvents()
        }
        this.options = { ...this.options, data }
        this.requestRender()
    }

    clear(): void {
        this.setData([])
    }

    override destroy(): void {
        if (this.destroyed) return
        if (!this.viewer.isDestroyed()) this.viewer.dataSources.remove(this.dataSource, true)
        super.destroy()
    }
}
