import {
    PolygonGeometry, EllipsoidSurfaceAppearance, GroundPrimitive,
    GeometryInstance, Material, Color, PolygonHierarchy
} from "cesium";

export type waterOptionType = {
    baseWaterColor?: Color,  // 水颜色
    specularMap?: string; // 用于指示水域的单通道纹理
    normalMap?: string,   // 图像
    frequency?: number, // 波纹频率
    animationSpeed?: number,    // 波动速度
    amplitude?: number, // 波动振幅
    specularIntensity?: number, // 反射强度
}

export default function waterEffect(hierarchy: PolygonHierarchy, options: waterOptionType = {}) {
    const polygon = new PolygonGeometry({
        polygonHierarchy: hierarchy,
        perPositionHeight: true,
        vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT
    });

    options = Object.assign(defaultOptions(), options)

    const primitive = new GroundPrimitive({
        geometryInstances: new GeometryInstance({
            geometry: polygon
        }),
        appearance: new EllipsoidSurfaceAppearance({
            material: new Material({
                fabric: {
                    type: 'Water',
                    uniforms: { ...options, }
                }
            }),
            aboveGround: true
        }),
        show: true
    });
    return { primitive, options }
}

export function defaultOptions(): waterOptionType {
    return {
        baseWaterColor: new Color(0.117647, 0.564706, 1, 0.7),
        normalMap: new URL("../../assets/img/waterEffect/waterNormals.jpg", import.meta.url).href,
        frequency: 100,
        animationSpeed: 0.05,
        amplitude: 1,
        specularIntensity: 0.5,
    }
}