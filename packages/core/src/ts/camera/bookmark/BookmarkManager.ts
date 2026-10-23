import { Cartesian3, Math as CesiumMath, type Viewer } from 'cesium'
import type { CameraManager } from '../CameraManager'
import type { CameraView } from '../types'
import { readFile, saveShareContent } from '../../utils/browser/files'
import { SafeTool } from '../../utils/common/SafeTool'

export interface Bookmark {
    id: string
    name: string
    view: CameraView
    image?: string
    description?: string
}

export interface CreateBookmarkOptions {
    description?: string
    /** Capture the next rendered frame. Defaults to true. */
    thumbnail?: boolean
    /** Defaults to 320 × 180. */
    width?: number
    height?: number
}

/** View bookmarks only; layers, resources and time are not stored. */
export class BookmarkManager {
    private readonly items = new Map<string, Bookmark>()
    private readonly pendingCaptures = new Set<() => void>()
    private readonly lifetime = new AbortController()
    private destroyed = false

    constructor(private readonly viewer: Viewer, private readonly camera: CameraManager) { }

    async create(name: string, options: CreateBookmarkOptions = {}): Promise<Bookmark> {
        this.assertAlive()
        if (!name.trim()) throw new TypeError('Bookmark name must not be empty')
        if (options.description !== undefined && typeof options.description !== 'string') throw new TypeError('description must be a string')
        const width = options.width ?? 320
        const height = options.height ?? 180
        for (const size of [width, height]) {
            if (!Number.isInteger(size) || size < 1 || size > 4096) throw new RangeError('Thumbnail dimensions must be integers between 1 and 4096')
        }
        const captured = options.thumbnail === false
            ? { view: this.camera.getView(), image: undefined }
            : await this.capture(width, height)
        this.assertAlive()
        const item: Bookmark = { id: SafeTool.uuid(), name: name.trim(), ...captured }
        if (options.description !== undefined) item.description = options.description
        this.items.set(item.id, item)
        return this.copy(item)
    }

    getAll(): Bookmark[] {
        this.assertAlive()
        return [...this.items.values()].map(item => this.copy(item))
    }

    get(id: string): Bookmark | undefined {
        this.assertAlive()
        const item = this.items.get(id)
        return item && this.copy(item)
    }

    remove(id: string): boolean {
        this.assertAlive()
        return this.items.delete(id)
    }

    clear(): void {
        this.assertAlive()
        this.items.clear()
    }

    flyTo(id: string, duration = 2): Promise<boolean> {
        const item = this.get(id)
        return item ? this.camera.flyTo({ ...item.view, duration }) : Promise.resolve(false)
    }

    toJSON(): string {
        return JSON.stringify({ version: 1, bookmarks: this.getAll() }, null, 2)
    }

    /** 导入书签集合或相机视角数组；全部数据校验通过后统一写入。 */
    importJSON(json: string, replace = true): Bookmark[] {
        this.assertAlive()
        const data = JSON.parse(json.replace(/^\uFEFF/, ''))
        if (!Array.isArray(data) && data?.version !== 1) throw new TypeError('Unsupported bookmark version')
        const entries = Array.isArray(data) ? data : data.bookmarks
        if (!Array.isArray(entries)) throw new TypeError('Expected a bookmark array')
        const next = replace ? new Map<string, Bookmark>() : new Map(this.items)
        const imported = entries.map(entry => this.parseBookmark(entry))
        for (const item of imported) {
            if (next.has(item.id)) throw new TypeError(`Duplicate bookmark id: ${item.id}`)
            next.set(item.id, item)
        }
        this.items.clear()
        for (const [id, item] of next) this.items.set(id, item)
        return imported.map(item => this.copy(item))
    }

    save(fileName = 'bookmarks.json'): void {
        if (!fileName.trim()) throw new TypeError('fileName must not be empty')
        saveShareContent(this.toJSON(), /\.json$/i.test(fileName) ? fileName : `${fileName}.json`, 'application/json;charset=utf-8')
    }

    /** Invoke from a user action when no File is supplied. Picker cancel returns undefined. */
    async load(file?: File, replace = true): Promise<Bookmark[] | undefined> {
        this.assertAlive()
        const result = await readFile({ file, accept: '.json,application/json', signal: this.lifetime.signal })
        this.assertAlive()
        return result ? this.importJSON(result.fileData, replace) : undefined
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.lifetime.abort()
        for (const cancel of [...this.pendingCaptures]) cancel()
        this.items.clear()
    }

    private capture(width: number, height: number): Promise<{ view: CameraView; image: string }> {
        return new Promise((resolve, reject) => {
            let remove: (() => void) | undefined
            const cleanup = () => { remove?.(); this.pendingCaptures.delete(cancel) }
            const cancel = () => { cleanup(); reject(new Error('BookmarkManager has been destroyed')) }
            this.pendingCaptures.add(cancel)
            try {
                remove = this.viewer.scene.postRender.addEventListener(() => {
                    cleanup()
                    try {
                        // Capture camera and image together, before WebGL clears the frame.
                        const view = this.camera.getView()
                        const canvas = this.viewer.scene.canvas.ownerDocument.createElement('canvas')
                        canvas.width = width
                        canvas.height = height
                        const context = canvas.getContext('2d')
                        if (!context) throw new Error('Unable to create a thumbnail canvas')
                        context.drawImage(this.viewer.scene.canvas, 0, 0, width, height)
                        resolve({ view, image: canvas.toDataURL('image/jpeg', 0.8) })
                    } catch (error) { reject(error) }
                })
                this.viewer.scene.requestRender()
            } catch (error) { cleanup(); reject(error) }
        })
    }

    private parseBookmark(value: unknown): Bookmark {
        if (!value || typeof value !== 'object') throw new TypeError('Invalid bookmark')
        const item = value as Record<string, any>
        if (typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim()) throw new TypeError('Bookmark id and name are required')
        let source = item.view
        if (!source && item.cameraView) {
            const { destination, orientation } = item.cameraView
            if (![destination?.x, destination?.y, destination?.z, orientation?.heading, orientation?.pitch, orientation?.roll].every(Number.isFinite)) throw new TypeError('Invalid legacy camera view')
            const position = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(new Cartesian3(destination.x, destination.y, destination.z))
            if (!position) throw new TypeError('Invalid legacy camera position')
            source = {
                longitude: CesiumMath.toDegrees(position.longitude), latitude: CesiumMath.toDegrees(position.latitude), height: position.height,
                heading: CesiumMath.toDegrees(orientation.heading), pitch: CesiumMath.toDegrees(orientation.pitch), roll: CesiumMath.toDegrees(orientation.roll)
            }
        }
        if (!source || ![source.longitude, source.latitude, source.height].every(Number.isFinite) || Math.abs(source.latitude) > 90) throw new TypeError('Invalid bookmark view')
        const view: CameraView = { longitude: source.longitude, latitude: source.latitude, height: source.height }
        for (const key of ['heading', 'pitch', 'roll'] as const) {
            if (source[key] !== undefined) {
                if (!Number.isFinite(source[key])) throw new TypeError(`Invalid bookmark ${key}`)
                view[key] = source[key]
            }
        }
        const result: Bookmark = { id: item.id, name: item.name.trim(), view }
        const image = item.image ?? item.img
        if (image !== undefined) {
            if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(image)) throw new TypeError('Invalid bookmark thumbnail')
            result.image = image
        }
        if (item.description !== undefined) {
            if (typeof item.description !== 'string') throw new TypeError('Invalid bookmark description')
            result.description = item.description
        }
        return result
    }

    private copy(item: Bookmark): Bookmark { return { ...item, view: { ...item.view } } }

    private assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error('BookmarkManager has been destroyed')
    }
}
