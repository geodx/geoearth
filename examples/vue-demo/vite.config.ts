import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { cp } from "node:fs/promises";
import sirv from "sirv";

const sdkDir = fileURLToPath(
  new URL("../../packages/core/dist/", import.meta.url),
);

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    {
      name: "geoearth-sdk",

      configureServer(server) {
        const serveSdk = sirv(sdkDir, { dev: true });

        // 开发时直接读取 SDK 构建目录，不复制文件。
        server.middlewares.use("/sdk", (req, res) => {
          serveSdk(req, res, () => {
            res.statusCode = 404;
            res.end("SDK resource not found");
          });
        });
      },

      async writeBundle() {
        // 构建时把 SDK 及其配套资源复制到示例站点。
        const targetDir = fileURLToPath(
          new URL("./dist/sdk/", import.meta.url),
        );

        await cp(sdkDir, targetDir, { recursive: true });
      },
    },
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});