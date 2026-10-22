import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

export default defineConfig({
    // 独立贴图相对发布脚本解析，支持将 SDK 部署到任意子目录。
    base: './',
    plugins: [
        dts({
            entryRoot: 'src',
            insertTypesEntry: true,
            copyDtsFiles: true,
            // 发布的 ESM 类型声明需要同时兼容 NodeNext 和 Vite/Bundler 的路径解析。
            beforeWriteFile(filePath, content) {
                // Windows 下异步并发创建同一声明目录偶发 EPERM，先同步准备目录。
                mkdirSync(path.dirname(filePath), { recursive: true })
                if (!filePath.endsWith('.d.ts')) return { filePath, content }
                const relative = path.relative(path.resolve(__dirname, 'dist'), filePath)
                const directory = path.resolve(__dirname, 'src', path.dirname(relative))
                content = content.replace(/((?:from\s*|import\s*\(\s*|import\s*)['"])(\.[^'"]+)(['"])/g, (match, prefix, specifier, suffix) => {
                    if (path.extname(specifier)) return match
                    const source = path.resolve(directory, specifier)
                    const extension = existsSync(path.join(source, 'index.ts')) || existsSync(path.join(source, 'index.d.ts')) ? '/index.js' : '.js'
                    return `${prefix}${specifier}${extension}${suffix}`
                })
                return { filePath, content }
            },
        })
    ],
    build: {
        lib: {
            entry: {
                index: path.resolve(__dirname, 'src/index.ts'),
                vite: path.resolve(__dirname, 'src/vite.ts'),
                'thematic/echarts': path.resolve(__dirname, 'src/ts/visualization/thematic/charts/echarts/index.ts'),
                'thematic/mapv': path.resolve(__dirname, 'src/ts/visualization/thematic/charts/mapv/index.ts'),
                'thematic/heatmap': path.resolve(__dirname, 'src/ts/visualization/thematic/heatmap/index.ts'),
            },
            formats: ['es'],
            cssFileName: "geoearth",
            fileName: (_format, entryName) => `${entryName}.js`
        },
        rollupOptions: {
            external: [
                'cesium',
                'echarts',
                'vite',
                'node:path',
                'node:module',
                'node:fs',
                'node:fs/promises'
            ]
        }
    }
})
