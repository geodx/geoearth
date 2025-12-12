import { Cartesian3 } from 'cesium';
import { CoordinateType } from './CoordinateType';
import { CartographicArrTool, CartographicTool } from '../Utils/CoordinateTool';

const coordinateTransform = (coordinateType: CoordinateType, ps: Cartesian3[]) => {
    let result;

    if (coordinateType === CoordinateType.cartographicObj) {
        result = CartographicTool.formCartesian3S(ps);
    } else if (coordinateType === CoordinateType.cartographicPoiArr) {
        result = CartographicArrTool.formCartesian3S(ps);
    } else {
        result = ps;
    }

    return result;
};

export { coordinateTransform };