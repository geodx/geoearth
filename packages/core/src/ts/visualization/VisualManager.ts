import {
    BounceMarker, ClusterLayer, FloatingMarker, HtmlMarker, LabelMarker, LiquidFillMarker,
    MarkerLayer, PanelMarker, PopupMarker, VideoMarker,
    type BounceMarkerOptions, type ClusterLayerOptions, type FloatingMarkerOptions,
    type HtmlMarkerOptions, type LabelMarkerOptions, type LiquidFillMarkerOptions,
    type PanelMarkerOptions, type PopupMarkerOptions, type VideoMarkerOptions,
} from './markers'
import { VideoProjection, type VideoProjectionOptions } from './projection'
import { RegionLayer, type RegionLayerOptions } from './thematic/regions'
import type { VisualizationHost } from './types'

/** 创建并挂载到当前场景的可视化对象。 */
export class VisualManager {
    constructor(private readonly host: VisualizationHost) {}

    addMarkerLayer(): MarkerLayer {
        return new MarkerLayer(this.host)
    }

    addClusterLayer(options?: ClusterLayerOptions): ClusterLayer {
        return new ClusterLayer(this.host, options)
    }

    addHtmlMarker(options: HtmlMarkerOptions): HtmlMarker {
        return new HtmlMarker(this.host, options)
    }

    addLabelMarker(options: LabelMarkerOptions): LabelMarker {
        return new LabelMarker(this.host, options)
    }

    addLiquidFillMarker(options: LiquidFillMarkerOptions): LiquidFillMarker {
        return new LiquidFillMarker(this.host, options)
    }

    addPopupMarker(options: PopupMarkerOptions): PopupMarker {
        return new PopupMarker(this.host, options)
    }

    addPanelMarker(options: PanelMarkerOptions): PanelMarker {
        return new PanelMarker(this.host, options)
    }

    addVideoMarker(options: VideoMarkerOptions): VideoMarker {
        return new VideoMarker(this.host, options)
    }

    addBounceMarker(options: BounceMarkerOptions): BounceMarker {
        return new BounceMarker(this.host, options)
    }

    addFloatingMarker(options: FloatingMarkerOptions): FloatingMarker {
        return new FloatingMarker(this.host, options)
    }

    addRegionLayer(options: RegionLayerOptions): RegionLayer {
        return new RegionLayer(this.host, options)
    }

    addVideoProjection(video: HTMLVideoElement, options: VideoProjectionOptions): VideoProjection {
        return new VideoProjection(this.host, video, options)
    }
}
