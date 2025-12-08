import { defineStore } from "pinia"
import type { Earth } from ".."


export const useEarthStore = defineStore('earth', () => {

    let earth: Earth

    function getEarth() {
        return earth
    }
    function setEarth(e: Earth) {
        earth = e
    }
    return { getEarth, setEarth }
})