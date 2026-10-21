/** Geographic camera position. Angles are degrees; height is meters above the ellipsoid. */
export interface CameraView {
    longitude: number
    latitude: number
    height: number
    /** Defaults to 0 (north). */
    heading?: number
    /** Defaults to -90 (down). */
    pitch?: number
    /** Defaults to 0. */
    roll?: number
}

export interface CameraFlyToOptions extends CameraView {
    /** Seconds, defaults to 2. Zero applies the view immediately. */
    duration?: number
}
