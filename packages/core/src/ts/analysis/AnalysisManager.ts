import type { SceneHost } from '../utils/scene/types'
import { HeightLimitAnalysis, type HeightLimitOptions } from './height-limit/HeightLimitAnalysis'
import { LayerSplitAnalysis, type LayerSplitOptions } from './layer-split/LayerSplitAnalysis'
import { SurfaceExcavateAnalysis, type SurfaceExcavateOptions } from './surface-excavate/SurfaceExcavateAnalysis'
import { computeProfile } from './profile/computeProfile'
import type { ProfileOptions, ProfileResult } from './profile/types'
import type { WorldPosition } from '../utils/coordinate/positions'
import { computeLineOfSight } from './line-of-sight/computeLineOfSight'
import type { LineOfSightOptions, LineOfSightResult } from './line-of-sight/types'

export class AnalysisManager {
    private swipe?: LayerSplitAnalysis
    private excavation?: SurfaceExcavateAnalysis

    constructor(private readonly host: SceneHost) {}

    computeProfile(path: readonly WorldPosition[], options?: ProfileOptions): Promise<ProfileResult> {
        return computeProfile(this.host, path, options)
    }

    computeLineOfSight(observer: WorldPosition, target: WorldPosition, options?: LineOfSightOptions): Promise<LineOfSightResult> {
        return computeLineOfSight(this.host, observer, target, options)
    }

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
