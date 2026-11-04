import { waterGeometryWaves, waterWaveFunctions } from './waterWaves'

// Fresnel 和倒影扰动保留 Three.js Water 改编，许可见 THIRD_PARTY_NOTICES.md。
export const waterSource = `
in vec3 v_waveNormal;
${waterWaveFunctions}
${waterGeometryWaves}
// Captured depth uses the capture projection, not Cesium's main multi-frustum/log depth.
vec3 waterBottom(vec2 uv, float depth) {
    // Depth uses nearest filtering. Reconstruct its actual texel-center ray,
    // otherwise subpixel ray/depth mismatches become metre-scale stripes at grazing angles.
    vec2 size = vec2(textureSize(underwaterDepthMap, 0));
    vec2 center = (floor(clamp(uv, 0.002, 0.998) * size) + 0.5) / size;
    vec4 p = underwaterInverseMatrix * vec4(center * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
}
vec2 waterProject(vec3 local) {
    vec4 p = underwaterMatrix * vec4(local, 1.0);
    return p.xy / max(p.w, 0.001) * 0.5 + 0.5;
}
vec3 waterContinuousReceiver(vec2 uv, vec3 nearestBottom) {
    // Keep the nearest depth texel's reconstructed HEIGHT (no blending across banks),
    // but place it on the requested pixel ray. Lighting coordinates must not snap
    // to the depth texture's XY grid, otherwise procedural caustics become pixel blocks.
    vec4 projected = underwaterInverseMatrix * vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    vec3 camera = czm_inverseModelView[3].xyz;
    vec3 ray = projected.xyz / projected.w - camera;
    if (abs(ray.z) < 0.00001) return nearestBottom;
    vec3 receiver = camera + ray * ((nearestBottom.z - camera.z) / ray.z);
    return vec3(receiver.xy, nearestBottom.z);
}
float foamNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1, 0), vec2(127.1, 311.7)),
        dot(i + vec2(0, 1), vec2(127.1, 311.7)), dot(i + vec2(1, 1), vec2(127.1, 311.7)))) * 43758.5453);
    return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}
vec2 waterDetailGradient(vec2 position, float distanceToEye, float footprint) {
    float lengthScale = waveLength / max(frequency / 100.0, 0.001);
    // Phase variation must occur within the fine-wave band. A much larger shared
    // noise domain leaves nearly periodic interference, which resembles a pixel grid in caustics.
    float noiseScale = max(lengthScale * 0.18, 0.1);
    vec3 phaseNoise = waterPhaseNoise(position / noiseScale + vec2(time * 0.015, -time * 0.011));
    phaseNoise.yz /= noiseScale;
    phaseNoise *= 2.0;
    // Four directional wavelets fill the gap between mesh waves and the smaller ripple band.
    vec2 gradient = waterFilteredSlope(position, 0.14, lengthScale * 0.19, 0.16, 0.7, phaseNoise, time, footprint);
    gradient += waterFilteredSlope(position, -0.36, lengthScale * 0.137, 0.12, 2.1, phaseNoise, time, footprint);
    gradient += waterFilteredSlope(position, 0.62, lengthScale * 0.097, 0.09, 4.3, phaseNoise, time, footprint);
    gradient += waterFilteredSlope(position, -0.91, lengthScale * 0.067, 0.06, 5.7, phaseNoise, time, footprint);
    vec2 ripples = waterFilteredSlope(position, 0.32, lengthScale * 0.035, 0.15, 1.3, phaseNoise, time, footprint);
    ripples += waterFilteredSlope(position, -0.55, lengthScale * 0.024, 0.11, 3.6, phaseNoise, time, footprint);
    ripples += waterFilteredSlope(position, 1.07, lengthScale * 0.016, 0.08, 5.1, phaseNoise, time, footprint);
    ripples += waterFilteredSlope(position, -1.23, lengthScale * 0.011, 0.06, 0.2, phaseNoise, time, footprint);
    return (gradient + ripples * rippleStrength / (1.0 + distanceToEye / 1200.0)) * step(0.0001, frequency);
}
vec3 waterSurfaceNormal(vec2 xy, vec3 geometricNormal, float distanceToEye, float footprint) {
    float angle = radians(waveDirection);
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 gradient = transpose(rotation) * waterDetailGradient(rotation * xy, distanceToEye, footprint);
    vec3 normal = normalize(geometricNormal);
    vec3 tangent = normalize(vec3(normal.z, 0.0, -normal.x));
    vec3 bitangent = cross(normal, tangent);
    return normalize(normal - amplitude * (tangent * gradient.x + bitangent * gradient.y));
}
// Single-depth receiver projection: estimate the compression of three neighbouring solar rays.
// This is an approximation, not photon tracing or a sun-shadow visibility pass.
vec3 waterCausticHit(vec2 entry, float receiverZ, vec3 sun, float shoreDistance, vec2 shoreGradient,
                     float footprint, out vec3 surface, out float travel) {
    vec3 offset, geometricNormal;
    waterGeometryState(entry, shoreDistance, shoreGradient, shoreFadeDistance,
        waveHeight, waveLength, waveDirection, waveSteepness, time, offset, geometricNormal);
    surface = vec3(entry, 0.0) + offset;
    vec3 normal = waterSurfaceNormal(surface.xy, geometricNormal, 0.0, footprint);
    vec3 ray = refract(-sun, normal, 1.0 / 1.333);
    travel = max(surface.z - receiverZ, 0.0) / max(-ray.z, 0.05);
    return surface + ray * travel;
}
vec3 waterCausticLight(vec3 receiver, vec3 sun, vec3 solarColor, vec2 visibleSurface,
                       vec2 shoreData, float footprint) {
    float depth = max(-receiver.z, 0.0);
    if (sun.z <= 0.03 || depth >= causticsMaxDepth || depth <= 0.01) return vec3(0.0);
    float lengthScale = waveLength / max(frequency / 100.0, 0.001);
    float visibility = 1.0 - smoothstep(0.35, 1.0, footprint / max(lengthScale * 0.024, 0.1));
    if (visibility <= 0.0) return vec3(0.0);
    vec3 flatRay = refract(-sun, vec3(0, 0, 1), 1.0 / 1.333);
    vec2 entry = receiver.xy - flatRay.xy * (depth / max(-flatRay.z, 0.05));
    vec2 shoreGradient = vec2(cos(shoreData.y), sin(shoreData.y));
    // The nearest shoreline gradient is a local approximation at the solar entry point.
    float shoreDistance = shoreData.x + dot(entry - visibleSurface, shoreGradient);
    if (shoreDistance <= 0.0) return vec3(0.0);
    float delta = clamp(lengthScale * 0.00055, 0.02, 0.15);
    vec3 p0, px, py;
    float travel, unusedTravel;
    vec3 hit0 = waterCausticHit(entry, receiver.z, sun, shoreDistance, shoreGradient, footprint, p0, travel);
    vec3 hitX = waterCausticHit(entry + vec2(delta, 0), receiver.z, sun, shoreDistance + delta * shoreGradient.x,
        shoreGradient, footprint, px, unusedTravel);
    vec3 hitY = waterCausticHit(entry + vec2(0, delta), receiver.z, sun, shoreDistance + delta * shoreGradient.y,
        shoreGradient, footprint, py, unusedTravel);
    float incomingArea = abs(dot(cross(px - p0, py - p0), sun));
    vec2 dx = hitX.xy - hit0.xy, dy = hitY.xy - hit0.xy;
    float receiverArea = abs(dx.x * dy.y - dx.y * dy.x);
    float focusing = min(incomingArea / (max(receiverArea, delta * delta * 0.04) * sun.z), 8.0);
    // Keep the captured base lighting; only add concentrated light, with bounded amplification.
    float excess = max(focusing - 1.015, 0.0);
    float depthFade = smoothstep(0.02, 0.25, depth) * (1.0 - smoothstep(causticsMaxDepth * 0.5, causticsMaxDepth, depth));
    return solarColor * exp(-absorption * travel) * excess * causticsIntensity * sun.z * depthFade * visibility;
}
vec3 waterReflection(vec2 uv, float blur) {
    vec2 d = vec2(blur * reflectionTexelSize);
    vec3 c = texture(reflectionMap, uv).rgb * 0.4;
    c += texture(reflectionMap, clamp(uv + vec2(d.x, 0.0), 0.002, 0.998)).rgb * 0.15;
    c += texture(reflectionMap, clamp(uv - vec2(d.x, 0.0), 0.002, 0.998)).rgb * 0.15;
    c += texture(reflectionMap, clamp(uv + vec2(0.0, d.y), 0.002, 0.998)).rgb * 0.15;
    c += texture(reflectionMap, clamp(uv - vec2(0.0, d.y), 0.002, 0.998)).rgb * 0.15;
    return c;
}
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material m = czm_getDefaultMaterial(materialInput);
    vec3 local = (czm_inverseModelView * vec4(-materialInput.positionToEyeEC, 1.0)).xyz;
    vec3 eye = normalize(mat3(czm_inverseModelView) * materialInput.positionToEyeEC);
    // 与 scene.light 解耦，固定方向灯不会覆盖真实太阳的方位。
    vec3 sun = normalize(mat3(czm_inverseModel) * czm_sunDirectionWC);
    float daylight = smoothstep(-0.06, 0.12, sun.z);
    vec3 solarColor = sunColor.rgb * mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.97, 0.91), smoothstep(0.0, 0.4, sun.z));
    float distanceToEye = length(materialInput.positionToEyeEC);
    vec3 n = waterSurfaceNormal(local.xy, v_waveNormal, distanceToEye, -1.0);
    float surfaceFootprint = max(length(dFdx(local.xy)), length(dFdy(local.xy)));
    float nv = max(dot(n, eye), 0.001);
    float fresnel = 0.02 + 0.98 * pow(1.0 - min(nv, 1.0), 5.0);
    float r = clamp(roughness + length(fwidth(n)) * 0.4, 0.03, 1.0);
    vec4 projected = reflectionMatrix * vec4(local, 1.0);
    vec2 uv = projected.xy / max(projected.w, 0.001) * 0.5 + 0.5;
    vec2 distortion = n.xy * (0.001 + 1.0 / max(distanceToEye, 1.0)) * distortionScale;
    uv = clamp(uv + distortion, 0.002, 0.998);
    vec3 reflection = waterReflection(uv, r * r * 6.0);
    // 离屏反射尚未就绪时的环境回退；就绪后完全采样场景天空和物体。
    vec3 reflectedRay = reflect(-eye, n);
    vec3 sky = mix(vec3(0.42, 0.54, 0.63), vec3(0.08, 0.25, 0.48), sqrt(max(reflectedRay.z, 0.0)));
    sky *= mix(0.015, 1.0, daylight);
    reflection = mix(sky, reflection, reflectionReady);
    // GGX 微表面太阳反光：粗糙度控制亮斑宽度，日落和夜间自然衰减。
    vec3 halfVector = normalize(sun + eye);
    float nl = max(dot(n, sun), 0.0);
    float nh = max(dot(n, halfVector), 0.0);
    float vh = max(dot(eye, halfVector), 0.0);
    float a2 = pow(r, 4.0) + 0.000025;
    float denominator = nh * nh * (a2 - 1.0) + 1.0;
    float distribution = a2 / max(czm_pi * denominator * denominator, 0.000001);
    float k = (r + 1.0) * (r + 1.0) * 0.125;
    float visibility = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
    float fSun = 0.02 + 0.98 * pow(1.0 - vh, 5.0);
    float specular = distribution * visibility * fSun / max(4.0 * nv, 0.01);
    vec3 scatter = baseWaterColor.rgb * (0.25 + scattering * (0.4 + 0.6 * nl)) * mix(0.05, 1.0, daylight);
    scatter += baseWaterColor.rgb * solarColor * pow(max(dot(eye, -sun), 0.0), 3.0) * scattering * 0.15 * daylight;
    vec2 bottomUV = waterProject(local);
    bool inCapture = all(greaterThan(bottomUV, vec2(0.002))) && all(lessThan(bottomUV, vec2(0.998))) && underwaterReady > 0.5;
    float bottomDepth = texture(underwaterDepthMap, clamp(bottomUV, 0.002, 0.998)).r;
    vec3 bottom = waterBottom(bottomUV, bottomDepth);
    bool validBottom = inCapture && bottomDepth < 0.999999 && bottom.z <= local.z + waveHeight + 0.1;
    float waterDepth = validBottom ? max(local.z - bottom.z, 0.0) : depthRange;
    vec2 refractedUV = bottomUV;
    vec3 refractedRay = refract(-eye, n, 1.0 / 1.333);
    vec3 refractedPoint = local + refractedRay * (waterDepth / max(-refractedRay.z, 0.05));
    vec2 shiftedUV = mix(bottomUV, waterProject(refractedPoint), refractionStrength);
    // Avoid pulling foreground banks or offscreen background into the water.
    float edgeFade = smoothstep(0.0, 0.035, min(min(bottomUV.x, bottomUV.y), min(1.0 - bottomUV.x, 1.0 - bottomUV.y)));
    shiftedUV = mix(bottomUV, shiftedUV, edgeFade);
    float shiftedDepth = texture(underwaterDepthMap, clamp(shiftedUV, 0.002, 0.998)).r;
    vec3 shiftedBottom = waterBottom(shiftedUV, shiftedDepth);
    bool validShift = all(greaterThan(shiftedUV, vec2(0.002))) && all(lessThan(shiftedUV, vec2(0.998))) && shiftedDepth < 0.999999 && shiftedBottom.z <= local.z + 0.1;
    if (validBottom && validShift) { refractedUV = shiftedUV; bottom = shiftedBottom; }
    vec3 bottomColor = texture(underwaterColorMap, clamp(refractedUV, 0.002, 0.998)).rgb;
    vec3 causticLight = vec3(0.0);
    if (caustics > 0.5 && causticsIntensity > 0.0 && validBottom &&
        (debugView < 0.5 || debugView > 4.5) && (refraction > 0.5 || debugView > 4.5)) {
        vec3 receiver = waterContinuousReceiver(refractedUV, bottom);
        causticLight = waterCausticLight(receiver, sun, solarColor, local.xy, materialInput.st, surfaceFootprint);
    }
    float opticalPath = validBottom ? min(max(local.z - bottom.z, 0.0) / max(-refractedRay.z, 0.05), 1000.0) : 1000.0;
    vec3 transmittance = exp(-absorption * opticalPath);
    vec3 transmitted = bottomColor * (1.0 + causticLight) * transmittance + scatter * (1.0 - transmittance);
    // Color alpha controls water-color mixing once the captured bottom is composited.
    vec3 waterColor = validBottom ? mix(bottomColor, transmitted, baseWaterColor.a) : scatter;
    if (refraction < 0.5 || underwaterReady < 0.5) waterColor = scatter;
    float foamEdge = validBottom ? 1.0 - smoothstep(0.0, foamWidth, waterDepth) : 0.0;
    vec2 foamPosition = local.xy * 0.45 + vec2(time * 0.12, -time * 0.08);
    float foamTexture = foamNoise(foamPosition) * 0.65 + foamNoise(foamPosition * 2.7) * 0.35;
    float foamMask = foam * foamOpacity * foamEdge * smoothstep(0.28, 0.67, foamTexture + sin(waterDepth * 9.0 - time * 2.0) * 0.12);
    m.diffuse = vec3(0.0);
    m.emission = mix(waterColor, reflection, fresnel * reflectionStrength) + solarColor * min(specular, 8.0) * specularIntensity * daylight;
    m.emission = mix(m.emission, vec3(0.88, 0.94, 0.93) * mix(0.08, 1.0, daylight), foamMask);
    m.alpha = refraction > 0.5 && underwaterReady > 0.5 ? 1.0 : mix(baseWaterColor.a, 1.0, foamMask);
    if (debugView > 0.5) {
        m.alpha = 1.0;
        if (debugView < 1.5) m.emission = validBottom ? mix(vec3(0.85, 0.95, 0.65), vec3(0.015, 0.08, 0.5), clamp(waterDepth / depthRange, 0.0, 1.0)) : vec3(0.0);
        else if (debugView < 2.5) m.emission = validBottom ? bottomColor : vec3(0.0);
        else if (debugView < 3.5) m.emission = vec3(foamMask);
        else if (debugView < 4.5) m.emission = n * 0.5 + 0.5;
        else m.emission = causticLight;
    }
    return m;
}`;

export const waterFragmentShader = `
in vec3 v_positionEC;
in vec2 v_st;
void main() {
    czm_materialInput materialInput;
    materialInput.st = v_st;
    materialInput.s = v_st.s;
    materialInput.str = vec3(v_st, 0.0);
    materialInput.normalEC = normalize(czm_normal * vec3(0.0, 0.0, 1.0));
    materialInput.positionToEyeEC = -v_positionEC;
    czm_material m = czm_getMaterial(materialInput);
    out_FragColor = vec4(m.emission, m.alpha);
}`;
