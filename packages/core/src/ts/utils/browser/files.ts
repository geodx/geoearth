export interface ReadFileOptions {
    /** Supply an existing file to skip the picker. */
    file?: File
    accept?: string
    signal?: AbortSignal
}

export interface ReadFileResult {
    fileName: string
    /** MIME type, possibly empty. Real local paths are not exposed by browsers. */
    fileType: string
    fileData: string
}

/** Download a file; this does not create a remote share link. */
export function saveShareContent(content: string | Blob, fileName: string, mimeType = 'text/plain;charset=utf-8'): void {
    if (!fileName.trim()) throw new TypeError('fileName must not be empty')
    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    try {
        link.href = url
        link.download = fileName
        link.hidden = true
        document.body.appendChild(link)
        link.click()
    } finally {
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}

/** UTF-8 text. Picker cancellation resolves undefined; read errors and abort reject. */
export function readFile(options: ReadFileOptions = {}): Promise<ReadFileResult | undefined> {
    return new Promise((resolve, reject) => {
        const { signal } = options
        let input: HTMLInputElement | undefined
        let finished = false
        let reading = false
        let focusTimer: ReturnType<typeof setTimeout> | undefined
        const cleanup = () => {
            input?.remove()
            signal?.removeEventListener('abort', abort)
            if (typeof window !== 'undefined') window.removeEventListener('focus', focus)
            clearTimeout(focusTimer)
        }
        const finish = (result?: ReadFileResult, error?: unknown) => {
            if (finished) return
            finished = true
            cleanup()
            if (error !== undefined) reject(error)
            else resolve(result)
        }
        const abort = () => finish(undefined, signal?.reason ?? new DOMException('File reading aborted', 'AbortError'))
        const read = async (file?: File) => {
            if (!file) { finish(); return }
            reading = true
            try {
                const fileData = await file.text()
                finish({ fileName: file.name, fileType: file.type, fileData })
            } catch (error) { finish(undefined, error) }
        }
        const focus = () => {
            clearTimeout(focusTimer)
            focusTimer = setTimeout(() => {
                if (!reading && !input?.files?.length) finish()
            }, 300)
        }
        if (signal?.aborted) { abort(); return }
        signal?.addEventListener('abort', abort, { once: true })
        if (options.file) { void read(options.file); return }
        try {
            input = document.createElement('input')
            input.type = 'file'
            input.accept = options.accept ?? ''
            input.hidden = true
            input.onchange = () => { void read(input?.files?.[0]) }
            input.addEventListener('cancel', () => { if (!reading) finish() }, { once: true })
            window.addEventListener('focus', focus)
            document.body.appendChild(input)
            input.click()
        } catch (error) { finish(undefined, error) }
    })
}
