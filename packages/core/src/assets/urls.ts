export const Assets = {
    earth: {
        2: new URL('./images/earth/worldimage2.png', import.meta.url).href,
    },
    marker: {
        default: new URL('../ts/visualization/markers/assets/images/bounce.png', import.meta.url).href,
        camera: new URL('../ts/visualization/markers/assets/images/camera.png', import.meta.url).href
    },
    particles: {
        fire: new URL('../ts/effects/particle/assets/fire.png', import.meta.url).href
    }
}