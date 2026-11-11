# FPS

```ts
const fps = earth.tools.fps
fps.show()
fps.hide()

console.log(fps.getFPS())
const stats = fps.getStats()
console.log(stats.fps, stats.renderTime, stats.state)
fps.reset()
```

show() 显示 Cesium 原生 FPS/MS 面板，hide() 隐藏面板并保留统计。visible 反映原生面板的开关状态。startup.showFps 也可以设置初始面板状态。

getFPS() 返回实际渲染帧率。getStats() 同时返回最近统计窗口的 fps、renderTime、frames、sampleDuration 和 state。窗口至少为 1000 毫秒，首次采样完成前 fps 为 0。frames 是该窗口实际渲染的帧数，sampleDuration 的单位是毫秒。

renderTime 是 preRender 到 postRender 的平均 CPU 侧耗时，单位毫秒，包含提交绘制命令及同步等待，不能用作精确 GPU 耗时。空闲或尚未获得完整耗时样本时为 undefined。

state 可为 sampling、rendering、idle、hidden。按需渲染停止出帧后，读取统计会得到 0 FPS 和 idle。后台页面返回 hidden，恢复可见时重新采样。读取统计和 reset() 都不会请求场景渲染。

原生面板使用 Cesium 自己的统计口径，按需渲染时可能显示 N/A 或 throttled；getFPS() 和 getStats() 以实际 postRender 事件计数。

工具首次显示或读取时才开始监听。earth.destroy() 会清理帧事件和页面可见性监听。独立 Viewer 可使用导出的 FPSMonitor 类，并在使用结束后调用 destroy()。

“高级 → FPS”示例支持原生面板开关、连续与按需渲染切换、自动环绕、调整分辨率和重置统计。
