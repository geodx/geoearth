import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Small loader for isolated TypeScript unit tests, without a browser or bundler.
const cache = new Map()
export function loadTS(url) {
    const href = url.href
    if (!cache.has(href)) {
        const js = ts.transpileModule(readFileSync(url, 'utf8'), {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
        }).outputText
        const code = js.replace(/from ['"]([^'"]+)['"]/g, (_, name) => {
            const resolved = name.startsWith('.') ? loadTS(new URL(`${name}.ts`, url)) : import.meta.resolve(name)
            return `from '${resolved}'`
        })
        cache.set(href, `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
    }
    return cache.get(href)
}
