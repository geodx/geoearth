import type CesiumEarth from "@/lib/CesiumEarth";

export interface ParticleStore {
    selectedPlot: any
    plots: CesiumEarth.FireParticle[]
}
//粒子保存
const particleStore: ParticleStore = {
    selectedPlot: null,//选中的粒子
    plots: []//粒子仓库数组
};
export default particleStore;
