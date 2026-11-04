/** Texture-free height functions and their analytic derivatives, in metres. */
export const waterWaveFunctions = `
// Value, d/dx, d/dy. Quintic interpolation keeps derivatives continuous at cell edges.
vec3 waterPhaseNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f - 1.0) * (f - 1.0);
    vec4 h = fract(sin(vec4(dot(cell, vec2(127.1, 311.7)), dot(cell + vec2(1, 0), vec2(127.1, 311.7)),
        dot(cell + vec2(0, 1), vec2(127.1, 311.7)), dot(cell + vec2(1, 1), vec2(127.1, 311.7)))) * 43758.5453);
    float crossTerm = h.x - h.y - h.z + h.w;
    return vec3(h.x + (h.y - h.x) * u.x + (h.z - h.x) * u.y + crossTerm * u.x * u.y,
        du.x * (h.y - h.x + crossTerm * u.y), du.y * (h.z - h.x + crossTerm * u.x));
}

// Height, d/dx, d/dy, phase. The noise gradient participates in the chain rule.
vec4 waterDirectionalWave(vec2 p, vec2 direction, float wavelength, float slope,
                          float phaseOffset, vec3 phaseNoise, float waveTime) {
    float k = czm_twoPi / max(wavelength, 0.03);
    float phase = k * dot(direction, p) - sqrt(9.81 * k) * waveTime + phaseOffset + phaseNoise.x * 0.8;
    float heightAmplitude = slope / k;
    vec2 gradient = heightAmplitude * cos(phase) * (k * direction + phaseNoise.yz * 0.8);
    return vec4(heightAmplitude * sin(phase), gradient, phase);
}

vec2 waterFilteredSlope(vec2 p, float angle, float wavelength, float slope,
                        float phaseOffset, vec3 phaseNoise, float waveTime, float footprint) {
    vec4 wave = waterDirectionalWave(p, vec2(cos(angle), sin(angle)), wavelength, slope, phaseOffset, phaseNoise, waveTime);
    // Remove waves smaller than the pixel footprint, including at grazing viewing angles.
    float width;
    if (footprint < 0.0) width = fwidth(wave.w);
    else width = czm_twoPi / max(wavelength, 0.03) * footprint;
    return wave.yz * (1.0 - smoothstep(0.35, 1.6, width));
}
`

/** Shared by mesh displacement and the solar-ray queries used for caustics. */
export const waterGeometryWaves = `
void waterAddGeometryWave(vec2 xy, vec2 d, float wavelength, float a, float fade, vec2 gradient,
                          float steepness, float waveTime, inout vec3 offset, inout vec3 tx, inout vec3 ty) {
    float k = czm_twoPi / wavelength;
    float phase = k * dot(d, xy) - sqrt(9.81 * k) * waveTime;
    float horizontal = steepness * min(a, 0.25 / k);
    vec3 wave = vec3(-horizontal * d * sin(phase), a * cos(phase));
    vec3 derivative = vec3(-horizontal * d * cos(phase), -a * sin(phase)) * k;
    offset += fade * wave;
    tx += fade * derivative * d.x + gradient.x * wave;
    ty += fade * derivative * d.y + gradient.y * wave;
}
void waterGeometryState(vec2 xy, float shoreDistance, vec2 shoreGradient, float fadeDistance,
                        float height, float wavelength, float directionDegrees, float steepness,
                        float waveTime, out vec3 offset, out vec3 normal) {
    float width = max(fadeDistance, 0.001);
    float t = clamp(shoreDistance / width, 0.0, 1.0);
    float fade = t * t * (3.0 - 2.0 * t);
    vec2 gradient = 6.0 * t * (1.0 - t) / width * shoreGradient;
    offset = vec3(0.0);
    vec3 tx = vec3(1, 0, 0), ty = vec3(0, 1, 0);
    float angle = radians(directionDegrees);
    waterAddGeometryWave(xy, vec2(cos(angle), sin(angle)), wavelength, height * 0.55, fade, gradient, steepness, waveTime, offset, tx, ty);
    angle += 0.9076;
    waterAddGeometryWave(xy, vec2(cos(angle), sin(angle)), wavelength * 0.53, height * 0.28, fade, gradient, steepness, waveTime, offset, tx, ty);
    angle -= 1.5533;
    waterAddGeometryWave(xy, vec2(cos(angle), sin(angle)), wavelength * 0.27, height * 0.17, fade, gradient, steepness, waveTime, offset, tx, ty);
    normal = normalize(cross(tx, ty));
}
`
