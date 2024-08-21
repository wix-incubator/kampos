/**
 * @function kaleidoscope
 * @param {Object} [params]
 * @param {number} [params.segments=6] .
 * @param {number} [params.offset=0] .
 * @returns {kaleidoscopeEffect}
 *
 * @example kaleidoscope({segments: 12})
 */
export default function ({ segments = 6, offset = 0 } = {}) {
    /**
     * @typedef {Object} kaleidoscopeEffect
     * @property {number} segments
     * @property {number} offset
     * @property {boolean} disabled
     *
     * @example
     * effect.segments = 8;
     * effect.offset = 0.5;
     */
    return {
        fragment: {
            uniform: {
                u_kaleidoscopeEnabled: 'bool',
                u_segments: 'float',
                u_offset: 'float',
            },
            constant: `const float PI = ${Math.PI};`,
            source: `
    if (u_kaleidoscopeEnabled) {
        vec2 centered = v_texCoord - 0.5;
        float r = length(centered);
        float theta = atan(centered.y, centered.x);
        theta = mod(theta, 2.0 * PI / u_segments);
        theta = abs(theta - PI / u_segments) - PI / u_segments;
        vec2 newCoords = r * vec2(cos(theta), sin(theta)) + 0.5;
        sourceCoord = mod(newCoords - u_offset, 1.0);
    }`,
        },
        get segments() {
            return this.uniforms[1].data[0];
        },
        set segments(n) {
            this.uniforms[1].data[0] = +n;
        },
        get offset() {
            return this.uniforms[2].data[0];
        },
        set offset(o) {
            this.uniforms[2].data[0] = +o;
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        uniforms: [
            {
                name: 'u_kaleidoscopeEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_segments',
                type: 'f',
                data: [segments],
            },
            {
                name: 'u_offset',
                type: 'f',
                data: [offset],
            },
        ],
    };
}
