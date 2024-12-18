/**
 * @function kaleidoscope
 * @param {Object} [params]
 * @param {number} [params.segments=6] number of times the view is divided.
 * @param {number} [params.offset={x: 0.0, y: 0.0}] offset to move the source media from the center.
 * @param {number} [params.rotation=0] extra angle to rotate the view.
 * @returns {kaleidoscopeEffect}
 *
 * @example kaleidoscope({segments: 12})
 */
export default function ({ segments = 6, offset, rotation = 0 } = {}) {
    const { x: offsetX, y: offsetY } = offset || { x: 0.0, y: 0.0 };
    /**
     * @typedef {Object} kaleidoscopeEffect
     * @property {number} segments
     * @property {{x: number?, y: number?}} offset
     * @property {number} rotation
     * @property {boolean} disabled
     *
     * @example
     * effect.segments = 8;
     * effect.offset = { x: 0.5, y: 0.5 };
     * effect.rotation = 45;
     */
    return {
        fragment: {
            uniform: {
                u_kaleidoscopeEnabled: 'bool',
                u_segments: 'float',
                u_offset: 'vec2',
                u_rotation: 'float',
            },
            source: `
    if (u_kaleidoscopeEnabled && u_segments > 0.0) {
        vec2 centered = v_texCoord - 0.5;
        float r = length(centered);
        float theta = atan(centered.y, centered.x);
        theta = mod(theta, 2.0 * PI / u_segments) + radians(u_rotation);
        theta = abs(theta - PI / u_segments) - PI / u_segments;
        vec2 newCoords = r * vec2(cos(theta), sin(theta)) + 0.5;
        sourceCoord = newCoords - u_offset;
        // mirrored repeat
        sourceCoord = mod(sourceCoord, 1.0) * (mod(sourceCoord - 1.0, 2.0) - mod(sourceCoord, 1.0)) + mod(-sourceCoord, 1.0) * (mod(sourceCoord, 2.0) - mod(sourceCoord, 1.0));
    }`,
        },
        get segments() {
            return this.uniforms[1].data[0];
        },
        set segments(n) {
            this.uniforms[1].data[0] = +n;
        },
        get offset() {
            const [x, y] = this.uniforms[2].data;
            return { x, y };
        },
        set offset({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },
        get rotation() {
            return this.uniforms[3].data[0];
        },
        set rotation(r) {
            this.uniforms[3].data[0] = r;
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
                data: [offsetX, offsetY],
            },
            {
                name: 'u_rotation',
                type: 'f',
                data: [rotation],
            },
        ],
    };
}
