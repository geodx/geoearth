/** 可取消的等待；取消会清理定时器并拒绝 Promise。 */
export function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) { reject(signal.reason); return }
        const abort = () => { clearTimeout(timer); reject(signal.reason) }
        const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, milliseconds)
        signal?.addEventListener('abort', abort, { once: true })
    })
}

export async function awaitResult<T>(promise: Promise<T>): Promise<[undefined, T] | [unknown, undefined]> {
    try { return [undefined, await promise] }
    catch (error) { return [error, undefined] }
}

/** 防抖函数提供 cancel，便于组件卸载时释放尚未触发的调用。 */
export function debounce<A extends unknown[]>(callback: (...args: A) => void, delay: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => { clearTimeout(timer); timer = undefined }
    const run = (...args: A) => {
        cancel()
        timer = setTimeout(() => { timer = undefined; callback(...args) }, delay)
    }
    return Object.assign(run, { cancel })
}

/** 首次立即执行，持续调用期间每个间隔最多执行一次，并保留最后一次参数。 */
export function throttle<A extends unknown[]>(callback: (...args: A) => void, interval: number) {
    let last = -Infinity
    let pending: A | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const invoke = () => { timer = undefined; last = performance.now(); const args = pending!; pending = undefined; callback(...args) }
    const run = (...args: A) => {
        pending = args
        const remaining = interval - (performance.now() - last)
        if (remaining <= 0) { clearTimeout(timer); invoke() }
        else if (!timer) timer = setTimeout(invoke, remaining)
    }
    return Object.assign(run, { cancel() { clearTimeout(timer); timer = undefined; pending = undefined } })
}
