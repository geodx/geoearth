# FPS monitoring

```ts
const fps = earth.tools.fps
fps.show()
fps.hide()
console.log(fps.getFPS())
const stats = fps.getStats()
console.log(stats.fps, stats.renderTime, stats.state)
fps.reset()
```

`show()` displays Cesium's native FPS/MS panel; `hide()` hides it without discarding statistics. `visible` reports the panel switch. Configure its initial state through startup.showFps.

`getFPS()` returns the actual rendered frame rate. `getStats()` includes fps, renderTime, frames, sampleDuration, and state for the latest window. Windows last at least 1000 milliseconds; fps is zero before the first sample completes. Frames counts actual rendered frames; sampleDuration is milliseconds.

`renderTime` is average CPU-side time from preRender to postRender in milliseconds, including command submission and synchronous waits. It is not precise GPU timing. It is undefined while idle or before a complete timing sample exists.

States are sampling, rendering, idle, and hidden. When on-demand rendering stops producing frames, reading statistics returns zero FPS and idle. Background pages report hidden; sampling restarts when visible again. Reading statistics and reset() do not request a render.

Cesium's native panel uses its own statistics and may show N/A or throttled in on-demand mode. getFPS() and getStats() count actual postRender events.

Listening starts lazily on the first display/read. earth.destroy() removes frame and visibility listeners. With a standalone Viewer, use the exported FPSMonitor and call destroy() when done.

The FPS demo includes the native panel switch, continuous/on-demand rendering, automatic orbiting, resolution adjustments, and statistics reset.
