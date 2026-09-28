import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

export default defineConfig({
    plugins: [
        dts({
            entryRoot: 'src',
            insertTypesEntry: true,
        })
    ],
    build: {
        lib: {
            entry: {
                geoearth: path.resolve(__dirname, 'src/index.ts'),
                vite: path.resolve(__dirname, 'src/vite.ts')
            },
            formats: ['es'],
            // cssFileName: 'style',
            fileName: (_format, entryName) => `${entryName}.js`
        },
        rollupOptions: {
            external: [
                'cesium',
                'vite',
                'node:path',
                'node:module',
                'node:fs',
                'node:fs/promises'
            ]
        }
    }
})
