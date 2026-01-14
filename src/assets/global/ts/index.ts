// 禁止页面默认右键菜单
document.oncontextmenu = (e: Event) => e.preventDefault();

// 禁止页面选择文字
document.onselectstart = function () {
    return false;
};

document.ondragstart = (e: Event) => e.preventDefault();

if (window.devicePixelRatio !== 1) {
    console.warn(
        `当前浏览器缩放或系统缩放非100%(dpr=${window.devicePixelRatio})，UI尺寸可能失真`
    )
}