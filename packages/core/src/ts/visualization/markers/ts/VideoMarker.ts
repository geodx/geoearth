import { PanelMarker, type PanelMarkerOptions } from './PanelMarker'
import type { VisualizationHost } from '../../types'
import { MarkerAssets } from './assets'

export interface VideoMarkerOptions extends Omit<PanelMarkerOptions, 'content'> {
    video?: HTMLVideoElement
    src?: string
    /** 借用视频默认不改变播放状态；自建视频默认在收起时暂停。 */
    pauseWhenCollapsed?: boolean
    onPlaybackError?: (error: unknown) => void
    /** HLS/video.js 接入函数返回销毁回调，无需依赖 Vue 生命周期。 */
    attachPlayer?: (video: HTMLVideoElement) => (() => void)
}

/** 带摄像头入口的可折叠视频标记，关闭面板后可再次展开。 */
export class VideoMarker extends PanelMarker {
    readonly video: HTMLVideoElement

    constructor(host: VisualizationHost, options: VideoMarkerOptions) {
        const viewer = 'viewer' in host ? host.viewer : host
        const video = options.video ?? viewer.container.ownerDocument.createElement('video')
        if (options.video && options.src) throw new Error('借用视频时，请直接在视频元素上设置播放源。')
        if (!options.video) {
            video.controls = true
            video.playsInline = true
            if (options.src) video.src = options.src
        }
        let resumeOnExpand = false
        const managePlayback = options.pauseWhenCollapsed ?? !options.video
        super(host, { ...options, content: video, markerImage: options.markerImage ?? MarkerAssets.camera,
            onExpandedChange: expanded => {
                if (managePlayback) {
                    if (!expanded) { resumeOnExpand = !video.paused; video.pause() }
                    else if (resumeOnExpand) {
                        resumeOnExpand = false
                        video.play().catch(error => options.onPlaybackError?.(error))
                    }
                }
                options.onExpandedChange?.(expanded)
            },
        })
        this.video = video
        this.element.classList.add('geoearth-video')
        // 逆序清理：先销毁外部播放器，再释放自建视频的媒体资源。
        if (!options.video) this.own(() => { video.pause(); video.removeAttribute('src'); video.load() })
        try { if (options.attachPlayer) this.own(options.attachPlayer(video)) }
        catch (error) { this.destroy(); throw error }
    }
}
