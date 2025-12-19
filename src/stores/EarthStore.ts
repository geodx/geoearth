import CesiumEarth from '@/lib/CesiumEarth'
import { defineStore } from 'pinia'
import { computed, shallowRef, watch } from 'vue'

export const useEarthStore = defineStore('earth', () => {
    const earth = shallowRef<CesiumEarth.Earth>()

    function setEarth(e: CesiumEarth.Earth) {
        earth.value = e
    }
    function getEarth(): Promise<CesiumEarth.Earth> {
        return new Promise<CesiumEarth.Earth>((resolve) => {
            if (earth.value) {
                return resolve(earth.value) // 如果viewer已经存在，直接返回
            }
            const stopWatcher = watch(
                earth, // 监听viewer的变化
                e => {
                    if (e) { // 如果viewer被赋值了
                        stopWatcher() // 停止watch
                        resolve(e) // 解决Promise，返回viewer
                    }
                },
                {
                    flush: 'post' // 使用postFlush来确保在DOM更新后处理
                }
            )
        })
    }


    // function destroy() {
    //     // earth.value?.destroy()
    //     earth.value = undefined
    // }

    return { earth, getEarth, setEarth, }
})
