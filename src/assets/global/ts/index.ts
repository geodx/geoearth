// 禁止页面默认右键菜单
document.oncontextmenu = (e: Event) => e.preventDefault();

// 禁止页面选择文字
document.onselectstart = function () {
    return false;
};

document.ondragstart = (e: Event) => e.preventDefault();