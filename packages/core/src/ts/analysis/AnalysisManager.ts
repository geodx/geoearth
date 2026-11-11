import type { SceneHost } from '../utils/scene/types'
import { HeightLimitAnalysis, type HeightLimitOptions } from './height-limit/HeightLimitAnalysis'
import { LayerSplitAnalysis, type LayerSplitOptions } from './layer-split/LayerSplitAnalysis'
import { SurfaceExcavateAnalysis, type SurfaceExcavateOptions } from './surface-excavate/SurfaceExcavateAnalysis'

export class AnalysisManager {
    private swipe?: LayerSplitAnalysis
    private excavation?: SurfaceExcavateAnalysis

    constructor(private readonly host: SceneHost) {}

    /** 同一场景共享一条分界线；销毁当前卷帘后可再次创建。 */
    addImagerySwipe(options?: LayerSplitOptions): LayerSplitAnalysis {
        if (this.swipe && !this.swipe.isDestroyed()) throw new Error('请先销毁当前影像卷帘。')
        return this.swipe = new LayerSplitAnalysis(this.host, options)
    }

    addHeightLimit(options: HeightLimitOptions): HeightLimitAnalysis {
        return new HeightLimitAnalysis(this.host, options)
    }

    /** 采样期间也保留开挖槽位，直到当前实例销毁。 */
    addTerrainExcavation(options: SurfaceExcavateOptions): SurfaceExcavateAnalysis {
        if (this.excavation && !this.excavation.isDestroyed()) throw new Error('请先销毁当前地形开挖。')
        return this.excavation = new SurfaceExcavateAnalysis(this.host, options)
    }
}
