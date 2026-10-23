# 波浪、反射与浅水成像

HTML 全局入口仍为 `GeoEarth.WaterEffect`，无需引入 Three.js。npm/ESM 使用 `import { WaterEffect } from "geoearth"` 后调用 `new WaterEffect(earth, options)`。运行 `npm run dev`，在示例菜单中打开「水面」。

```ts
const water = new GeoEarth.WaterEffect(earth, {
    hierarchy: [
        { longitude: 110, latitude: 30 }, { longitude: 110.01, latitude: 30 },
        { longitude: 110.01, latitude: 30.01 }, { longitude: 110, latitude: 30.01 },
    ],
    height: 25,
    color: new Cesium.Color(0.035, 0.25, 0.30, 0.92),
    reflection: true,
    reflectionSize: 512,
    animationSpeed: 1,
    amplitude: 0.6, // 法线强度
    meshSize: 8, // 几何网格最大边长（米），构造参数
    waveHeight: 0.35, // 最大几何振幅（米），可实时调整
    waveSteepness: 0.35,
    shoreFadeDistance: 12,
    refraction: true,
    refractionSize: 512,
    refractionStrength: 0.65,
    absorption: new Cesium.Cartesian3(0.28, 0.09, 0.045), // RGB / 米
    foam: true,
    foamWidth: 1.2, // 产生泡沫的水深范围（米）
    foamOpacity: 0.7,
    distortionScale: 12,
    skyReflection: true,
    waveLength: 80,
    waveDirection: 25,
    rippleStrength: 0.25,
    roughness: 0.18,
    scattering: 0.65,
})
water.update({ reflection: false })
water.update({ animationSpeed: 0 }) // 暂停波纹，移动相机仍会更新倒影
water.show = false
water.destroy()
```

`hierarchy` 接受坐标数组或带孔洞的 `Cesium.PolygonHierarchy`。传入 GeoEarth 时跟随地球自动销毁；仅传 Viewer 时由调用方调用 `destroy()`。重复销毁安全。

每帧使用当前相机关于水面中心切平面的镜像相机，重新收集物体颜色绘制命令，裁去水面以下内容，绘制到独立颜色纹理和 24 位深度/模板附件。天空直接绘制当前场景的 `skyBox` 和 `skyAtmosphere`，跟随场景日期与大气配置；地形复用上一主帧已就绪的绘制命令，避免两个相机在同一帧改写 Cesium 地球四叉树的选瓦状态。

水面按以下顺序成像：

1. **网格波浪**：保留 Cesium 的凹多边形和岛洞三角剖分，递归细分最长边，生成共享顶点网格。三组 Gerstner 波在顶点着色器中产生垂直及水平位移，同时计算波面法线。外岸和岛洞附近按到边界的距离平滑衰减位移，避免边缘穿岸；不模拟水位上涨或真实湿润岸线移动。
2. **水下颜色与深度**：隐藏所有水面，用主相机方向单独绘制水下物体到颜色及可采样的 24 位深度附件。按最近邻深度纹素的中心射线和该通道投影矩阵反算局部坐标，避免斜视时深度与射线错位产生横向条纹，得到实际水面到水底的垂直距离和视线光程。这里不读取主场景的多视锥对数深度，避免深度制式混用。水底缺失时退回深水散射，不生成泡沫。
3. **折射与吸收**：按空气/水折射率 1/1.333 估算折射方向，根据首个水深估计落点，再采样水下颜色。越界和高于水面的采样回退，屏幕边缘逐渐减弱偏移。RGB 透射率按 `exp(-absorption * opticalPath)` 计算，红光通常更快衰减，深水逐渐接近散射水色。
4. **岸边泡沫**：使用未折射位置的实际水深构造浅水遮罩，叠加米制空间噪声和随波纹时间变化的条带。泡沫既能出现在外岸、岛边，也能出现在浅水石块周围；仅多边形边界没有浅水底时不会凭空产生白边。

主渲染采用纯程序化法线：保留网格 Gerstner 大波的解析法线，额外叠加四组方向细浪和四组微波纹。每组细浪的高度函数使用重力波色散关系，方向围绕 waveDirection 分布；平滑值噪声轻微扰动相位，法线按包含噪声梯度的链式求导计算。噪声本身不直接作为法线。按像素覆盖范围衰减无法分辨的高频波，并随距离减弱微波纹，减少远处闪烁。细浪只改变着色法线，不改变网格轮廓。

几何波浪与程序化细波纹共同扰动反射采样，以 Fresnel 混合水色散射和反射。太阳方向直接读取 Cesium 自动计算的 `czm_sunDirectionWC`，跟随 `viewer.clock.currentTime`，不使用固定方向灯；太阳高度决定昼夜衰减和经验近似光色。GGX 微表面高光与粗糙度控制反光亮斑，远处衰减细波纹以减轻闪烁。所有水面在两个离屏通道中隐藏，避免递归反射。`show=false` 停止该水面的离屏绘制，`animationSpeed=0` 停止波纹时间更新，但仍可随相机和太阳时间重绘倒影。

参数说明：

| 参数 | 含义 | 默认值 |
| --- | --- | --- |
| meshSize | 构造时网格最大边长（米），不小于 1 | 8 |
| waveHeight | 几何最大垂直振幅（米），0—10；峰谷高度差最多为两倍 | 0.35 |
| waveSteepness | 水平位移强度，0—1 | 0.35 |
| shoreFadeDistance | 边界及岛洞附近位移的衰减距离（米） | 12 |
| refraction | 水下折射与吸收开关 | true |
| refractionSize | 构造时水下颜色、深度纹理边长，64—2048 | reflectionSize |
| refractionStrength | 折射偏移倍率，0—1；0 仍保留深度吸收 | 0.65 |
| absorption | RGB 每米吸收系数，Cartesian3，必须非负 | (0.28, 0.09, 0.045) |
| foam | 水深泡沫开关，可独立于折射启用 | true |
| foamWidth | 泡沫水深范围（米），不是岸边的水平宽度 | 1.2 |
| foamOpacity | 泡沫覆盖强度，0—1 | 0.7 |
| debugView | surface / depth / refraction / foam / normals | surface |
| depthRange | 水深观察图的满量程（米），浅黄深蓝，黑色表示缺少水底 | 10 |
| frequency | 程序化细波纹密度，非几何网格数；0 关闭细浪 | 100 |
| animationSpeed | 波纹时间倍率，0 表示暂停 | 1 |
| amplitude | 程序化细浪法线总强度，不产生几何位移，0 只保留几何法线 | 1 |
| distortionScale | 倒影纹理扰动 | 12 |
| reflectionStrength | Fresnel 反射权重倍率，0—1 | 1 |
| reflectionSize | 固定方形反射纹理边长，64—2048 | 512 |
| specularIntensity | 太阳高光强度 | 0.8 |
| waveLength | 第一组几何波长及程序化细波纹尺度基准（米） | 80 |
| waveDirection | 相对局部正东的波纹方向（度） | 0 |
| rippleStrength | 近处细波纹强度 | 0.25 |
| roughness | 微表面粗糙度，0.03—1，控制高光宽度和倒影近似模糊 | 0.18 |
| scattering | 水色散射强度 | 0.65 |
| skyReflection | 倒影中绘制当前场景天空盒与大气 | true |
| sunColor | 太阳光色调，方向仍取真实太阳 | Color.WHITE |

`waveHeight=0` 关闭几何波浪；`amplitude=0` 只关闭程序化细浪扰动。`waveLength` 对应三组几何波长的 1、0.53、0.27 倍，建议 `meshSize <= waveLength * 0.1`，短波需要更密的网格。超过 150000 顶点会拒绝构造，应增大 meshSize 或拆分水域。

启用且完成折射采集后，底色已在着色器内合成，以不透明通道合成、输出 alpha 为 1，`color.alpha` 改为控制吸收后水色与水下颜色的混合比例，避免再次透明混合导致重影。关闭折射时沿用原来的透明水色混合。`foamWidth` 以实际水深为单位，坡度决定泡沫在水平方向上的宽度。`debugView` 可切换为水深、折射原色、泡沫遮罩，便于核查场景是否真正存在水底和浅滩。

推荐保持 `frequency=100`，使用 `waveLength` 控制波浪尺度。程序细浪的尺度基准为 `waveLength * 100 / frequency`，四组细浪波长为该基准的 0.19、0.137、0.097、0.067 倍，四组微波纹为 0.035、0.024、0.016、0.011 倍。`rippleStrength` 单独控制微波纹，`amplitude` 控制全部细浪法线强度。

`normalMap` 参数已移除，WaterEffect 不加载 `waterNormals.jpg` 或其他法线图片，也不提供贴图回退模式。已有配置应移除 normalMap；法线强度的数值含义已改为程序波面坡度倍率，旧贴图参数需重新调节。反射、水下颜色和深度仍使用离屏渲染纹理。`debugView: "normals"` 显示最终局部波面法线的 RGB 编码，便于观察方向、密度和时间变化。

`update()` 可更新 `WaterStyleOptions` 中的参数；边界、高度、meshSize 和纹理尺寸需重新创建对象。保留了原 `material.uniforms.baseWaterColor` 等字段，但建议通过 `update()` 请求重绘。`animationSpeed` 现在按真实时间计算，不再使用 Cesium 默认 Water 的逐帧倍率；旧配置应重新调节。

相机与重绘：反射在每个 `scene.preRender` 中使用当前相机更新，不依赖 `camera.changed`、GeoEarth CHANGE 事件的节流或 `camera.percentageChanged`。缩放使用的深度拾取可能在主渲染开始前清空 Cesium 帧标志，反射通道因此维护独立的渲染标志和 3D Tiles RENDER 通道状态，避免滚轮缩放时倒影间歇消失。暂停波纹后，相机缩放、移动仍会更新倒影；相机实际进入水面以下时仍按当前适用边界关闭平面反射。

适用边界：

- 用于局部湖泊、池塘等平面水域。中心高度是椭球高度；大范围水域不随地球曲率弯曲，不支持海洋尺度。
- 反射仅在 3D 透视相机且视点位于水面上方时启用；其他模式退回水色、环境色与波纹。
- 反射通道支持普通不透明物体、模型、3D Tiles 与地球颜色绘制命令。透明物体采用距离排序，不复用 Cesium 的 OIT；分类、后处理、阴影、屏幕空间效果和多重水面互相反射不属于此通道。
- 天空反射来自场景自身天空盒与大气。地形倒影只覆盖主视图已就绪的瓦片，首次加载、快速转向或视锥外的山体可能延迟或缺少细节。天空和物体倒影使用普通颜色纹理，不等同于完整 HDR 环境光照管线。
- 折射是基于当前视图的单次投影近似，视锥外的水底和多次折射无法恢复；不包括焦散、水下相机视图、流体求解、翻卷破碎浪或泡沫粒子。粗糙反射仍采用邻域采样近似。水下深度主要对应不透明物体，透明材质的多层体积不参与精确求交。
- 水下采集需要深度纹理支持；不可用时回退水色与反射。反射和水下采集均只在 3D 透视相机位于水面上方时启用。
- Cesium 未提供公开的离屏场景 API，离屏渲染内部接口集中在 `ReflectionPass.ts`，顶点着色器还通过 `waterVertexShader.ts` 对接 Fabric 的 uniform 名称映射；当前基于工程安装的 Cesium 1.146 适配。升级 Cesium 后需重新验证。默认每个可见水面增加反射和水下两次离屏绘制；关闭 reflection 停止反射采集，同时关闭 refraction、foam 并选择 surface 视图可停止水下采集。纹理尺寸固定，不随窗口变化重分配。

演示位于法国安纳西湖区域（6.17°E，45.87°N），沿用工程 `addBingImagery()` 和 `addWorldTerrain()` 预设，使用 Cesium 官方默认 Token，SDK 使用方仍应通过构造配置传入自己的 `ionAccessToken`。本次在线抽样该中心地形椭球高程约 493.55 米，示意地面设为 497 米；湖岸和设施是程序化演示，不代表真实建筑或实测岸线。演示关闭地形相机碰撞修正，避免在线粗瓦片加载期间推走固定观察视角。

场景包括岸线、小岛、水底石块、窗格建筑、树木、栈道、码头和帆船，外岸及岛边增加了连续变化水深的沙质坡面。面板可实时调整水色、不透明度、反射强度、粗糙度、散射、波纹周期/方向/强度/速度，及天空反射。程序细浪密度和波面法线视图可直接在面板调节。新增几何振幅/陡峭度、靠岸衰减、折射偏移、RGB 吸收、泡沫开关/水深范围/强度、水深与泡沫观察视图。日期时间使用 UTC，太阳高度角实时显示，点击「追光视角」将视点对准太阳在水面上的反光方向。默认日期为 2026-06-21，15:00 UTC，是可复现的夏日下午场景；并非强制使用计算机当前时间。

在线资源状态独立显示，失败时保留本地底图和水体实验场。直接访问示例时添加 `?offline=1` 可跳过在线资源。新增网格 Gerstner 波、水下深度采集、吸收和泡沫是在 Cesium 侧实现；细浪法线已替换为 GeoEarth 的程序化波形及噪声导数；Fresnel 和倒影扰动仍保留 Three.js Water 改编。其代码改编范围及许可保留在 `packages/core/THIRD_PARTY_NOTICES.md`。


回归验证：`node packages/core/tests/water.geometry.mjs` 检查凹边界、岛洞、最大边长、三角形面积和网格裂缝。执行 `npm run build:example` 后，在可导入 Playwright 的环境中运行 `node packages/core/tests/water.browser.mjs`。若 Playwright 不在当前模块搜索路径，可通过 `PLAYWRIGHT_MODULE` 指定其 `index.mjs` 绝对路径；`BROWSER_EXECUTABLE` 可指定本机 Chromium/Edge 可执行文件；`WATER_SCREENSHOT` 可指定截图输出路径。

浏览器回归会拦截法线图片请求，确认 WaterEffect 不依赖图片；使用 GPU 对波形解析导数与高度数值差分进行核对，并验证程序细浪、微波纹、方向、密度及时间改变实际法线像素，密度为 0 时只保留几何法线。`WATER_NORMAL_SCREENSHOT` 可保存法线视图。

浏览器回归使用已知高度的水底盒子读取 GPU 深度，核对重建坐标及其随物体下降一米的变化，同时检查低角度平底的水深颜色均匀性；关闭程序细浪后检查几何波浪改变成像、折射移动水下图像、RGB 吸收改变颜色，以及水底上移使远离多边形边界的位置产生泡沫。还覆盖天空与大气反射、Cesium 太阳随时间变化、参数面板更新、实际反射纹理像素变化、水底裁剪、本地生成 glTF 模型与 3D Tiles、深度拾取后的反射像素一致性、连续滚轮缩放（`percentageChanged` 分别为 0.01 和 1）、三种预设、暂停继续、倒影及显隐开关、窗口变化、Viewer 与 GeoEarth 生命周期、生产站点菜单。默认回归关闭网络资源；设置 `WATER_ONLINE=1` 额外检查官方默认 Token 的 Bing/世界地形、倒影开关前后主场景一致性和追光视角。可通过 `WATER_ONLINE_SCREENSHOT`、`WATER_SUN_SCREENSHOT` 保存在线与追光截图。测试使用无界面 Edge 的软件 WebGL；大体量生产 3D Tiles 和硬件 GPU 性能仍需在目标环境验收。
