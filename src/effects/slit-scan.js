/**
 * @function slitScan
 * @requires resolution
 * @param {Object} params
 * @param {noise} params.noise 2D noise implementation to use.
 * @param {number} [params.time=0.0] initial time for controlling initial noise value.
 * @param {number} [params.intensity=0.1] initial intensity to use.
 * @param {number} [params.frequency] initial frequency to use .
 * @param {string} [params.direction='x'] direction to apply the slit scan effect.
 * @returns {slitScanEffect}
 *
 * @example slitScan({intensity: 0.5, frequency: 3.0})
 */
export default function ({
    noise,
    time = 0.0,
    intensity = 0.1,
    frequency = 2.0,
    direction = 'x',
}) {
    /**
     * @typedef {Object} slitScanEffect
     * @property {boolean} disabled
     * @property {number} intensity
     * @property {number} frequency
     * @property {number} time
     *
     * @example
     * effect.intensity = 0.5;
     * effect.frequency = 3.5;
     */
    const isHorizontal = direction === 'x';
    const noiseFragPart = `gl_FragCoord.${direction} / u_resolution.${direction} * u_frequency`;
    const noiseTimePart = 'u_time * 0.0001';

    return {
        fragment: {
            uniform: {
                u_slitScanEnabled: 'bool',
                u_intensity: 'float',
                u_frequency: 'float',
                u_time: 'float',
                u_horizontal: 'bool'
            },
            constant: noise,
            source: `
    if (u_slitScanEnabled) {
        float noiseValue = noise(vec2(${isHorizontal ? noiseFragPart : noiseTimePart}, ${isHorizontal ? noiseTimePart : noiseFragPart}));
        float source_ = sourceCoord.${direction} + noiseValue * u_intensity;
        float mirrored_ = mod(-source_, 1.0) * (mod(source_ - 1.0, 2.0) - mod(source_, 1.0)) + mod(source_, 1.0) * (mod(source_, 2.0) - mod(source_, 1.0));
        sourceCoord = ${isHorizontal ? 'vec2(mirrored_, sourceCoord.y)' : 'vec2(sourceCoord.x, mirrored_)'};
    }`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get intensity() {
            return this.uniforms[1].data[0];
        },
        set intensity(i) {
            this.uniforms[1].data[0] = i;
        },
        get frequency() {
            return this.uniforms[2].data[0];
        },
        set frequency(f) {
            this.uniforms[2].data[0] = f;
        },
        get time() {
            return this.uniforms[3].data[0];
        },
        set time(t) {
            this.uniforms[3].data[0] = t;
        },
        uniforms: [
            {
                name: 'u_slitScanEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_intensity',
                type: 'f',
                data: [intensity],
            },
            {
                name: 'u_frequency',
                type: 'f',
                data: [frequency],
            },
            {
                name: 'u_time',
                type: 'f',
                data: [time],
            },
        ],
    };
}
