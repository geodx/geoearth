import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import viteCompression from 'vite-plugin-compression'

import { viteStaticCopy } from 'vite-plugin-static-copy'
const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesium";
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      ],
    }),
    //gzip静态资源压缩
    viteCompression({
      threshold: 10240, // >10kb 压缩
      algorithm: "gzip", // 压缩算法
      verbose: false, //false（默认）则不输出日志
      deleteOriginFile: false, //指定压缩完文件后删除源文件 默认false
    })
  ],
  // base: '/',
  define: {
    CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // server: {
  //   host: '0.0.0.0',   //表示容器内监听所有 IP，外部才能访问,解决docker发布无法访问
  //   port: 5173,
  //   cors: true,
  //   proxy: {
  //     '/imagery/': {
  //       target: 'http://localhost:8084/imagery/',
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/imagery\//, '')
  //     },
  //     '/terrain/': {
  //       target: 'http://localhost:8084/terrain/',
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/terrain\//, '')
  //     },
  //     '/scense/': {
  //       target: 'http://localhost:8084/scense/',
  //       changeOrigin: true,
  //       secure: false,
  //       rewrite: (path) => path.replace(/^\/scense\//, '')
  //     }
  //   }
  // },
  // assetsInclude: ["**/*.glb", "**/*.jpg"],
  build: {
    // outDir: 'dist',
    // assetsDir: 'assets', 
    sourcemap: false,//防止浏览器开发者工具中直接调试源码
    cssCodeSplit: true, // 启用 CSS 代码拆分
    assetsInlineLimit: 4096,
    // 控制大文件警告（Cesium 通常 >4MB）      
    chunkSizeWarningLimit: 2000, // 2MB
    minify: 'terser', // Vite 默认使用 esbuild，但 terser 有更丰富的选项
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("element-plus")) return "element-plus";
            if (id.includes("echarts")) return "echarts";
            if (id.includes("cesium")) return "cesium";
            // 其他所有 node_modules 的依赖都打包进 vendor
            return "vendor";
            // return id.toString().split('node_modules/')[1].split('/')[0].toString()
          }
          // if (id.includes('src/views')) return 'views' // 业务代码分包
        },
        // 对不同类型文件进行分类打包
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
  }
})
console.log("\x1b[33m --CesiumEarth Cesium插件-- \x1b[0m");