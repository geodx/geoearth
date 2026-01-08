let VGEEarth_SDK_isLoaded: boolean = false
if (!VGEEarth_SDK_isLoaded) {
    VGEEarth_SDK_isLoaded = true;

    console.log(`%c⭐ 开发工具包：%cVGEEarth%c${DefaultConfig.Version}%c，基于 Cesium ^${window.Cesium.VERSION}\n` +
        `‍💻 版权所有：虚拟地理实验室 VGELab\n` +
        `📀 帮助文档：http://8.146.208.114:8083`,
        'color:green;font-size:14px;font-weight: bold;',
        'padding: 0 5px; border-radius: 3px 0 0 3px; color: #fff; background: #e52; font-weight: bold;',
        'padding: 0 5px; border-radius: 0 3px 3px 0; color: #de3; background: #1c1c1c; font-weight: bold;',
        'color:green;font-size:14px;font-weight: bold;'
    );

    // console.log(`%c🎁 预加载第三方模块：`,
    //     'color:green;font-size:14px;font-weight: bold;', {
    //     jQuery: '版本号：^2.1.4`',
    //     // heatmap: '版本号：^2.0.5`',
    //     Ol: '版本号：^6.14.1`',
    //     Turf: '版本号：^6.5.0`',
    //     xmdom: '版本号：^0.6.0`',
    //     FileSaver: '版本号：^2.0.5`',
    //     toGeoJSON: '版本号：^5.5.0`',
    //     Tokml: '版本号：^0.4.0`',
    //     ztree: '版本号：^3.5.48`',
    //     CesiumNetworkPlug: '版本号：^1.0.7`'
    // });

} 