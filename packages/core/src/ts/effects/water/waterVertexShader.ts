import type { Material } from 'cesium'

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

void addWave(vec2 xy, vec2 d, float wavelength, float amplitude, float fade, vec2 gradient,
             inout vec3 offset, inout vec3 tx, inout vec3 ty) {
    float k = czm_twoPi / wavelength;
    float phase = k * dot(d, xy) - sqrt(9.81 * k) * geoearth_time;
    float horizontal = geoearth_waveSteepness * min(amplitude, 0.25 / k);
    vec3 wave = vec3(-horizontal * d * sin(phase), amplitude * cos(phase));
    vec3 derivative = vec3(-horizontal * d * cos(phase), -amplitude * sin(phase)) * k;
    offset += fade * wave;
    tx += fade * derivative * d.x + gradient.x * wave;
    ty += fade * derivative * d.y + gradient.y * wave;
}
void main() {
    vec4 p = czm_computePosition();
    vec2 xy = (position3DHigh + position3DLow).xy;
    float width = max(geoearth_shoreFadeDistance, 0.001);
    float t = clamp(st.x / width, 0.0, 1.0);
    float fade = t * t * (3.0 - 2.0 * t);
    vec2 gradient = 6.0 * t * (1.0 - t) / width * vec2(cos(st.y), sin(st.y));
    vec3 offset = vec3(0.0), tx = vec3(1.0, 0.0, 0.0), ty = vec3(0.0, 1.0, 0.0);
    float angle = radians(geoearth_waveDirection);
    addWave(xy, vec2(cos(angle), sin(angle)), geoearth_waveLength, geoearth_waveHeight * 0.55, fade, gradient, offset, tx, ty);
    angle += 0.9076;
    addWave(xy, vec2(cos(angle), sin(angle)), geoearth_waveLength * 0.53, geoearth_waveHeight * 0.28, fade, gradient, offset, tx, ty);
    angle -= 1.5533;
    addWave(xy, vec2(cos(angle), sin(angle)), geoearth_waveLength * 0.27, geoearth_waveHeight * 0.17, fade, gradient, offset, tx, ty);
    p.xyz += offset;
    v_waveNormal = normalize(cross(tx, ty));
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
