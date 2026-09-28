export interface Viewpoint {
    longitude: number
    latitude: number
    height: number
    heading?: number
    pitch?: number
    roll?: number
    unit?: 'degree' | 'radian'
}