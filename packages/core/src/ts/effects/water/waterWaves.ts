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
                        float phaseOffset, vec3 phaseNoise, float waveTime) {
    vec4 wave = waterDirectionalWave(p, vec2(cos(angle), sin(angle)), wavelength, slope, phaseOffset, phaseNoise, waveTime);
    // Remove waves smaller than the pixel footprint, including at grazing viewing angles.
    return wave.yz * (1.0 - smoothstep(0.35, 1.6, fwidth(wave.w)));
}
`
