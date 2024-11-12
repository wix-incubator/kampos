/*!
 * Adopted from https://www.shadertoy.com/view/tlcBRl
 */
/**
 * Implementation of white noise with 3 seeds. Exposes a `noise(vec3 seed)` function for use inside fragment shaders.
 */
export default `
float noise1 (vec2 seed) {
    return fract(
        seed.x + 12.34567 * fract(
            100. * (abs(seed.x * 0.91) + seed.y + 94.68) * fract(
                (abs(seed.y * 0.41) + 45.46) * fract(
                    (abs(seed.y) + 757.21) * fract(
                        seed.x * 0.0171
                    )
                )
            )
        )
    ) * 1.0038 - 0.00185;
}

//2 seeds
float noise2 (vec2 seed) {
    float buff1 = abs(seed.x + 100.94) + 1000.;
    float buff2 = abs(seed.y + 100.73) + 1000.;
    buff1 = buff1 * fract(buff2 * fract(buff1 * fract(buff2 * 0.63)));
    buff2 = buff2 * fract(buff2 * fract(buff1 + buff2 * fract(seed.x * 0.79)));
    buff1 = noise1(vec2(buff1, buff2));

    return buff1 * 1.0038 - 0.00185;
}

//3 seeds
float noise3 (vec3 seed) {
    float buff1 = abs(seed.x + 100.81) + 1000.3;
    float buff2 = abs(seed.y + 100.45) + 1000.2;
    float buff3 = abs(noise1(seed.xy) + seed.z) + 1000.1;
    buff1 = buff3 * fract(buff2 * fract(buff1 * fract(buff2 * 0.146)));
    buff2 = buff2 * fract(buff2 * fract(buff1 + buff2 * fract(buff3 * 0.52)));
    buff1 = noise1(vec2(buff1, buff2));

    return buff1;
}

float noise (vec3 seed) {
    float buff1 = abs(seed.x + 100.813) + 1000.314;
    float buff2 = abs(seed.y + 100.453) + 1000.213;
    float buff3 = abs(noise1(vec2(buff2, buff1)) + seed.z) + 1000.17;
    buff1 = buff3 * fract(buff2 * fract(buff1 * fract(buff2 * 0.14619)));
    buff2 = buff2 * fract(buff2 * fract(buff1 + buff2 * fract(buff3 * 0.5215)));
    buff1 = noise3(
        vec3(
            noise1(vec2(seed.y, buff1)),
            noise1(vec2(seed.x, buff2)),
            noise1(vec2(seed.z, buff3))
        )
    );

    return buff1;
}`;
