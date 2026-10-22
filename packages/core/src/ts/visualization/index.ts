export * from './markers'
export * from './entities'
export * from './materials/lines/index'
export { GradientMaterial, createGradientAppearance } from './materials/areas/GradientMaterial'
export type { GradientMaterialOptions } from './materials/areas/GradientMaterial'
export * from './thematic/regions/index'
export * from './projection/index'
export type { VisualizationHost, VisualizationPosition } from './types'
// 图表和热力引擎仅通过独立子入口加载，避免增加主包体积。
