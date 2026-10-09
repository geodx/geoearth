import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = path.join(root, "dist");

const require = createRequire(import.meta.url);
const cesiumRoot = path.dirname(require.resolve("cesium/package.json"));
const cesiumBuild = path.join(cesiumRoot, "Build/Cesium");

// 仅为 IIFE 设置浏览器资源路径、样式和全局导出。
function wrapIife(code: string) {
    return `
(() => {
  const __geoearthScriptUrl = document.currentScript.src;
  const baseUrl = new URL(".", __geoearthScriptUrl);

  // 必须在 Cesium 代码执行前设置资源目录。
  window.CESIUM_BASE_URL = new URL("cesium/", baseUrl).href;

  for (const file of ["cesium/Widgets/widgets.css", "geoearth.css"]) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(file, baseUrl).href;
    document.head.append(link);
  }

  ${code}

  const { GeoEarth: Constructor, ...api } = GeoEarth;
  window.GeoEarth = Object.assign(Constructor, api);
})();
`;
}

function iifeResources(): Plugin {
    return {
        name: "geoearth-iife-resources",

        generateBundle: {
            order: "post",

            handler(_options, bundle) {
                const sdk = bundle["geoearth.js"];

                if (!sdk || sdk.type !== "chunk") {
                    this.error("未生成 geoearth.js，请检查 IIFE 构建配置。");
                }

                sdk.code = wrapIife(sdk.code);
            },
        },

        async writeBundle() {
            const destination = path.join(outDir, "cesium");
            await mkdir(destination, { recursive: true });

            const resources = [
                "Assets",
                "Workers",
                "Widgets",
                "ThirdParty",
            ];

            const notices = [
                "LICENSE.md",
                "ThirdParty.json",
                "ThirdParty.extra.json",
            ];

            await Promise.all([
                ...resources.map((name) =>
                    cp(
                        path.join(cesiumBuild, name),
                        path.join(destination, name),
                        { recursive: true },
                    ),
                ),
                ...notices.map((name) =>
                    cp(
                        path.join(cesiumRoot, name),
                        path.join(destination, name),
                    ),
                ),
            ]);
        },
    };
}

export default defineConfig({
    plugins: [iifeResources()],

    build: {
        outDir,

        // 保留前一步生成的 ESM、类型声明和样式。
        emptyOutDir: false,

        // 包装发生在生成阶段，暂不输出未经修正的 source map。
        sourcemap: false,

        lib: {
            entry: path.join(root, "src/index.ts"),
            name: "GeoEarth",
            formats: ["iife"],
            fileName: () => "geoearth.js",
            cssFileName: "geoearth",
        },

        rolldownOptions: {
            // IIFE 中使用入口脚本地址解析资源 URL。
            transform: {
                define: {
                    "import.meta.url": "__geoearthScriptUrl",
                },
            },
        },
    },
});