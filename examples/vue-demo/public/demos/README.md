# 示例目录

按功能逐个完善对应 HTML。标为占位的页面目前只创建初始地球，TODO 注释标明待补充的功能。

创建地球、初始化配置、初始视角、生命周期页面已有示例。菜单和中英文标题已在工作台注册。

```text
demos/
  basic/  # 基础入门
    create-earth.html  # 创建地球（已有）
    config.html  # 初始化配置（已有）
    initial-view.html  # 初始视角（已有）
    start-animation.html  # 开场动画（占位）
    lifecycle.html  # 生命周期：销毁与重新创建（已有）
  events/  # 事件交互
    mouse-events.html  # 鼠标事件（占位）
    camera-events.html  # 相机事件（占位）
    resource-events.html  # 资源事件（占位）
    picking-highlight.html  # 对象拾取与高亮（占位）
  imagery/  # 影像图层
    single-image.html  # 单张影像（占位）
    xyz.html  # XYZ 影像（占位）
    wms.html  # WMS 影像（占位）
    wmts.html  # WMTS 影像（占位）
    tms.html  # TMS 影像（占位）
    arcgis.html  # ArcGIS 影像（占位）
    visibility-opacity.html  # 图层显隐与透明度（占位）
    ordering.html  # 图层排序（占位）
    basemap-switch.html  # 底图切换（占位）
  terrain/  # 地形
    load-switch.html  # 地形加载与切换（占位）
    visibility.html  # 地形显隐（占位）
    exaggeration.html  # 地形夸张（占位）
    sampling.html  # 地形采样（占位）
  data/  # 数据加载
    geojson.html  # GeoJSON（占位）
    gltf-model.html  # GLB / glTF 模型（占位）
    tileset.html  # 3D Tiles（占位）
    poi.html  # POI（占位）
    locate-unload.html  # 数据定位与卸载（占位）
  draw/  # 绘制工具
    point.html  # 绘制点（占位）
    polyline.html  # 绘制折线（占位）
    polygon.html  # 绘制多边形（占位）
    rectangle.html  # 绘制矩形（占位）
    circle.html  # 绘制圆（占位）
    result-management.html  # 绘制结果管理（占位）
    editing.html  # 图形编辑（占位）
    import-export.html  # 绘制导入导出（占位）
  measure/  # 量测工具
    point-height.html  # 点高程（占位）
    space-distance.html  # 空间距离（占位）
    ground-distance.html  # 贴地距离（占位）
    area.html  # 面积量测（占位）
    height-difference.html  # 高差量测（占位）
    triangle.html  # 三角量测（占位）
    result-management.html  # 量测结果管理（占位）
  camera/  # 相机控制
    set-view.html  # 视角定位（占位）
    fly-to.html  # 飞行定位（占位）
    bookmarks.html  # 视角书签（占位）
    orbit.html  # 环绕观察（占位）
    roaming.html  # 路径漫游（占位）
  widgets/  # 地图组件
    overview.html  # 鹰眼（占位）
    coordinate-status.html  # 坐标状态栏（占位）
    scale.html  # 比例尺（占位）
    compass.html  # 指南针（占位）
    layer-control.html  # 图层控制（占位）
    multi-view.html  # 多视图联动（占位）
  visualization/  # 可视化
    point-line-polygon.html  # 点线面样式（占位）
    labels-icons.html  # 文字与图标（占位）
    dynamic-line.html  # 动态线材质（占位）
    trajectory.html  # 轨迹动画（占位）
    clustering.html  # 聚合（占位）
    heatmap.html  # 热力图（占位）
  analysis/  # 空间分析
    imagery-swipe.html  # 影像卷帘（占位）
    profile.html  # 剖面（占位）
    line-of-sight.html  # 通视（占位）
    height-limit.html  # 限高（占位）
    terrain-excavation.html  # 地形开挖（占位）
  advanced/  # 性能与集成
    fps.html  # FPS（占位）
    request-render.html  # 按需渲染（占位）
    many-objects.html  # 大量对象（占位）
    multi-instance.html  # 多实例（占位）
    container-resize.html  # 容器尺寸变化（占位）
```

新增示例或把占位页改为完整示例时，同步更新 `../../src/demos/registry.ts` 的路径或 description。
中英文菜单标题位于 `../../src/locales/langs/zh-CN/ui.json` 和 `../../src/locales/langs/en-US/ui.json`。
