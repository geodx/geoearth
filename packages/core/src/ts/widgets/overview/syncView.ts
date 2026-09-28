import { CesiumWidget, Color, Entity, PolygonHierarchy } from "cesium";

function createFootprint(overview: CesiumWidget, fillColor: Color, outlineColor: Color): Entity {
    return overview.entities.add({
        show: false,
        polygon: {
            hierarchy: new PolygonHierarchy(),
            material: fillColor ?? Color.RED.withAlpha(0.16),
            outline: true,
            outlineColor: outlineColor ?? Color.RED,
            outlineWidth: 1,
            height: 1
        }
    })

}



// export { createFootprint }