
import { useEarthStore } from './EarthStore';

// 获取 Earth
function getEarth() {
    const earthStore = useEarthStore()
    let earth = earthStore.getEarth();
    if (!earth) {
        throw new Error('请先初始化 Earth');
    }
    return earth;
}

export { getEarth };
