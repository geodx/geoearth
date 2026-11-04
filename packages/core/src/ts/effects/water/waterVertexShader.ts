import type { Material } from 'cesium'
import { waterGeometryWaves } from './waterWaves'

const source = `
in vec3 position3DHigh;
in vec3 position3DLow;
in vec2 st;
in float batchId;
out vec3 v_positionEC;
out vec3 v_waveNormal;
out vec2 v_st;
uniform float geoearth_time;
uniform float geoearth_waveHeight;
uniform float geoearth_waveLength;
uniform float geoearth_waveDirection;
uniform float geoearth_waveSteepness;
uniform float geoearth_shoreFadeDistance;

${waterGeometryWaves}
void main() {
    vec4 p = czm_computePosition();
    vec2 xy = (position3DHigh + position3DLow).xy;
    vec3 offset, normal;
    waterGeometryState(xy, st.x, vec2(cos(st.y), sin(st.y)), geoearth_shoreFadeDistance,
        geoearth_waveHeight, geoearth_waveLength, geoearth_waveDirection, geoearth_waveSteepness, geoearth_time, offset, normal);
    p.xyz += offset;
    v_waveNormal = normal;
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
    v_st = st;
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}`

/** Fabric renames uniforms per material instance; both shader stages must use the same names. */
export function waterVertexShader(material: Material): string {
    const keys = Object.keys((material as any)._uniforms)
    return source.replace(/geoearth_(\w+)/g, (_, name: string) => {
        const key = keys.find(key => key.startsWith(`${name}_`))
        if (!key) throw new Error(`Water vertex uniform ${name} is missing.`)
        return key
    })
}
