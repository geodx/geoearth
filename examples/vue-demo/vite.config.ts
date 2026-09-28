import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

import vue from '@vitejs/plugin-vue'

// import { geoEarth } from 'geoearth/vite'
//临时，热更新调试
import { geoEarth } from '../../packages/core/src/vite.ts'
export default defineConfig({
  plugins: [
    vue(),
    geoEarth()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      //临时，热更新调试
      geoearth: path.resolve(__dirname, '../../packages/core/src/index.ts')
    },
  }
})
