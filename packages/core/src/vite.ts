import path from 'node:path'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import type { Plugin, PluginOption } from 'vite'

export interface GeoEarthViteOptions {
    /**
     * Cesium 静态资源访问路径，默认 /cesium
     */
    baseUrl?: string

    /**
     * 是否自动注入 Cesium widgets.css，默认 true
     */
    injectCss?: boolean

    /**
     * 项目根目录，默认 process.cwd()
     */
    root?: string
}

function normalizePath(filePath: string) {
    return filePath.replace(/\\/g, '/')
}

function normalizeBaseUrl(baseUrl: string) {
    const withStart = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
    return withStart.replace(/\/+$/, '')
}

function toDestBase(baseUrl: string) {
    return baseUrl.replace(/^\/+/, '').replace(/\/+$/, '')
}

function resolveCesiumSource(root: string) {
    try {
        const require = createRequire(path.join(root, 'package.json'))
        const cesiumPackageJson = require.resolve('cesium/package.json')

        return normalizePath(
            path.join(path.dirname(cesiumPackageJson), 'Build', 'Cesium')
        )
    } catch {
        throw new Error(
            [
                '[GeoEarth] Cesium is required.',
                'Please install it first:',
                '',
                '  npm install cesium',
                ''
            ].join('\n')
        )
    }
}

const CESIUM_DIRECTORIES = ['Assets', 'Workers', 'Widgets', 'ThirdParty'] as const

function isInside(parent: string, target: string) {
    const relative = path.relative(parent, target)
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function getContentType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase()

    switch (ext) {
        case '.css':
            return 'text/css'
        case '.js':
            return 'application/javascript'
        case '.json':
            return 'application/json'
        case '.wasm':
            return 'application/wasm'
        case '.png':
            return 'image/png'
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg'
        case '.svg':
            return 'image/svg+xml'
        default:
            return 'application/octet-stream'
    }
}

export function geoEarth(options: GeoEarthViteOptions = {}): PluginOption {
    const root = options.root
        ? path.resolve(options.root)
        : process.cwd()

    const publicBaseUrl = normalizeBaseUrl(options.baseUrl ?? '/cesium')
    const destBase = toDestBase(publicBaseUrl)
    const cesiumSource = resolveCesiumSource(root)
    let viteRoot = root
    let outDir = 'dist'

    const geoEarthPlugin: Plugin = {
        name: 'geoearth:vite',

        config() {
            return {
                define: {
                    CESIUM_BASE_URL: JSON.stringify(publicBaseUrl)
                }
            }
        },

        configResolved(config) {
            viteRoot = config.root
            outDir = config.build.outDir
        },

        transformIndexHtml() {
            if (options.injectCss === false) {
                return []
            }

            return [
                {
                    tag: 'link',
                    attrs: {
                        rel: 'stylesheet',
                        href: `${publicBaseUrl}/Widgets/widgets.css`
                    },
                    injectTo: 'head'
                }
            ]
        },

        configureServer(server) {
            const urlPrefix = `${publicBaseUrl}/`

            server.middlewares.use((request, response, next) => {
                const requestUrl = request.url?.split('?')[0] ?? ''

                if (!requestUrl.startsWith(urlPrefix)) {
                    next()
                    return
                }

                const relativeUrl = decodeURIComponent(requestUrl.slice(urlPrefix.length))
                const filePath = path.resolve(cesiumSource, relativeUrl)

                if (!isInside(cesiumSource, filePath)) {
                    response.statusCode = 403
                    response.end('Forbidden')
                    return
                }

                fs.stat(filePath, (error, stat) => {
                    if (error || !stat.isFile()) {
                        next()
                        return
                    }

                    response.setHeader('Content-Type', getContentType(filePath))
                    fs.createReadStream(filePath).pipe(response)
                })
            })
        },

        async writeBundle() {
            const outputRoot = path.resolve(viteRoot, outDir)
            const cesiumOutput = path.resolve(outputRoot, destBase)
            //复制前清理
            // await fsp.rm(cesiumOutput, { recursive: true, force: true })
            await fsp.mkdir(cesiumOutput, { recursive: true })

            await Promise.all(
                CESIUM_DIRECTORIES.map((directory) =>
                    fsp.cp(
                        path.join(cesiumSource, directory),
                        path.join(cesiumOutput, directory),
                        { recursive: true }
                    )
                )
            )
        }
    }

    return geoEarthPlugin
}
