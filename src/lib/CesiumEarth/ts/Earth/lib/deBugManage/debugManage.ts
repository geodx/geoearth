/****************************************************************************
 名称：调试模式控制器

 最后修改日期：2022-03-10
 ****************************************************************************/

import { framesPerSecond } from './framesPerSecond';

let debugManage = {
    state: false,
    open() {
        this.state = true;
        framesPerSecond.open();
    },
    close() {
        this.state = false;
        framesPerSecond.close();
    },
    getFPS() {
        const performanceDisplay = framesPerSecond.getDom()
        const fpsText = performanceDisplay?.querySelector(".cesium-performanceDisplay-fps")?.innerHTML
        return Number(fpsText?.replace(' FPS', ''));
    }
};

export { debugManage };
