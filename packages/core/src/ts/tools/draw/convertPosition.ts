import { Cartesian3, Cartographic, Math as CesiumMath, type Ellipsoid } from 'cesium'
import { CoordinateType, type DegreePosition, type DrawPosition } from './types'

export function convertPosition<T extends CoordinateType>(position: Cartesian3, coordinateType: T, ellipsoid: Ellipsoid): DrawPosition<T> {
    if (coordinateType === CoordinateType.CARTOGRAPHIC) {
        const cartographic = ellipsoid.cartesianToCartographic(position)

        if (!cartographic) {
            throw new Error('Unable to convert Cartesian position to Cartographic.')
        }

        return Cartographic.clone(cartographic) as DrawPosition<T>
    }

    if (coordinateType === CoordinateType.DEGREES) {
        const cartographic = ellipsoid.cartesianToCartographic(position)

        if (!cartographic) {
            throw new Error('Unable to convert Cartesian position to degrees.')
        }

        const result: DegreePosition = {
            longitude: CesiumMath.toDegrees(cartographic.longitude),
            latitude: CesiumMath.toDegrees(cartographic.latitude),
            height: cartographic.height
        }

        return result as DrawPosition<T>
    }

    return Cartesian3.clone(position) as DrawPosition<T>
}