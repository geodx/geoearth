import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import sirv from "sirv";

const sdkDir = fileURLToPath(
  new URL("../../packages/core/dist/", import.meta.url),
);
const require = createRequire(import.meta.url);
const guiDir = path.dirname(require.resolve("lil-gui"));

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
      name: "demo-lil-gui",

      configureServer(server) {
        const serveGui = sirv(guiDir, { dev: true });
        server.middlewares.use("/demo-vendor/lil-gui", (req, res) => {
          serveGui(req, res, () => {
            res.statusCode = 404;
            res.end("Demo GUI resource not found");
          });
        });
      },

      async writeBundle() {
        const targetDir = fileURLToPath(
          new URL("./dist/demo-vendor/lil-gui/", import.meta.url),
        );
        await mkdir(targetDir, { recursive: true });
        await Promise.all([
          cp(
            path.join(guiDir, "lil-gui.umd.min.js"),
            path.join(targetDir, "lil-gui.umd.min.js"),
          ),
          cp(
            path.join(guiDir, "../LICENSE.md"),
            path.join(targetDir, "LICENSE.md"),
          ),
        ]);
      },
    },
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
