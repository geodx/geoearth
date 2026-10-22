import { defineConfig } from 'vite'
import path from 'node:path'
import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** 可选浏览器扩展将 API 挂到已有 GeoEarth 构造函数，沿用统一的实例化入口。 */
export default defineConfig(({ mode }) => {
    const entries: Record<string, string> = {
        echarts: 'src/ts/visualization/thematic/charts/echarts/index.ts',
        mapv: 'src/ts/visualization/thematic/charts/mapv/index.ts',
        heatmap: 'src/ts/visualization/thematic/heatmap/index.ts',
    }
    if (!entries[mode]) throw new Error('Extension build mode must be echarts, mapv or heatmap.')
    return {
        plugins: [{
            name: 'geoearth-extension-global',
            generateBundle(_options, bundle) {
                for (const output of Object.values(bundle)) {
                    if (output.type !== 'chunk' || !output.isEntry) continue
                    output.code = `(() => {\nif (!window.GeoEarth) throw new Error('[GeoEarth] Load geoearth.js before its thematic extension.');\n${mode === 'echarts' ? "if (!window.echarts) throw new Error('[GeoEarth] Load echarts before the ECharts extension.');\n" : ''}${output.code}\nObject.assign(window.GeoEarth, GeoEarthThematicExtension);\n})();`
                }
            },
            async writeBundle() {
                await cp(path.resolve(__dirname, 'THIRD_PARTY_NOTICES.md'), path.resolve(__dirname, 'dist/THIRD_PARTY_NOTICES.md'))
                if (mode !== 'echarts') return
                const source = path.dirname(require.resolve('echarts/package.json'))
                const target = path.resolve(__dirname, 'dist/echarts')
                await mkdir(target, { recursive: true })
                await cp(path.join(source, 'dist/echarts.min.js'), path.join(target, 'echarts.min.js'))
                for (const name of ['LICENSE', 'NOTICE', 'licenses']) await cp(path.join(source, name), path.join(target, name), { recursive: true })
            },
        }],
        build: {
            emptyOutDir: false,
            lib: { entry: path.resolve(__dirname, entries[mode]), name: 'GeoEarthThematicExtension', formats: ['iife'], fileName: () => `geoearth-${mode}.js` },
            rolldownOptions: { external: ['cesium', 'echarts'], output: { globals: { cesium: 'Cesium', echarts: 'echarts' } } },
        },
    }
})
