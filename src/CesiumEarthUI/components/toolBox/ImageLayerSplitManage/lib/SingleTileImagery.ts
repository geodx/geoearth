import { Rectangle, SingleTileImageryProvider } from "cesium";

function SingleTileImagery(url: string, param: any = {}) {
    let layerRectangle = param.properties.layerRectangle;
    if (Array.isArray(layerRectangle)) {
        layerRectangle = Rectangle.fromDegrees(...layerRectangle);
    } else {
        layerRectangle = Rectangle.MAX_VALUE;
    }
    return new SingleTileImageryProvider({ url: url, rectangle: layerRectangle });
}

export default SingleTileImagery;
