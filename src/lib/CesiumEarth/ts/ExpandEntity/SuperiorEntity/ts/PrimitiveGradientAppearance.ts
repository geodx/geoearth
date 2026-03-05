import type { Appearance } from "cesium";
import { Color, MaterialAppearance, Material } from "cesium";

export class PrimitiveGradientAppearance {
    constructor(color: Color) {
        return new MaterialAppearance({
            material: new Material({
                fabric: {
                    uniforms: { color },
                    source: `
                    uniform vec4 color; 
                    czm_material czm_getMaterial(czm_materialInput materialInput)
                    {
                        czm_material material = czm_getDefaultMaterial(materialInput); 
                        vec2 st = materialInput.st;                        
                        float alpha = distance(st,vec2(0.5, 0.5)); 
                        material.alpha = color.a  * alpha  * 1.5; 
                        material.diffuse = color.rgb * 1.3;                            
                        return material;
                    }
                    `,
                },
                translucent: true,
            }),
            faceForward: false,
            closed: false,
        }) as Appearance;
    }

}