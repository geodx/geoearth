import CesiumEarth from '@/lib/CesiumEarth'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

export const useEarthStore = defineStore('earth', () => {
    const earth = shallowRef<CesiumEarth.Earth>()

    const viewer = computed(() => getEarth().viewer3D)

    function setEarth(e: CesiumEarth.Earth) {
        earth.value = e
    }
    function getEarth() {
        if (!earth.value) throw new Error('Earth 未初始化')
        return earth.value
    }

    function destroy() {
        // earth.value?.destroy()
        earth.value = undefined
    }

    return { viewer, earth, getEarth, setEarth, destroy }
})
