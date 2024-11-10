/**
 * @function displacement
 * @property {string} CLAMP stretch the last value to the edge. This is the default behavior.
 * @property {string} DISCARD discard values beyond the edge of the media - leaving a transparent pixel.
 * @property {string} WRAP continue rendering values from opposite direction when reaching the edge.
 * @param {Object} [params]
 * @param {string} [params.wrap] wrapping method to use. Defaults to `displacement.CLAMP`.
 * @param {{x: number, y: number}} [params.scale] initial scale to use for x and y displacement. Defaults to `{x: 0.0, y: 0.0}` which means no displacement.
 * @returns {displacementEffect}
 *
 * @example displacement({wrap: displacement.DISCARD, scale: {x: 0.5, y: -0.5}})
 */
function displacement({ wrap = WRAP_METHODS.CLAMP, scale } = {}) {
    const { x: sx, y: sy } = scale || { x: 0.0, y: 0.0 };

    /**
     * @typedef {Object} displacementEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map
     * @property {{x: number?, y: number?}} scale
     * @property {boolean} disabled
     *
     * @example
     * const img = new Image();
     * img.src = 'disp.jpg';
     * effect.map = img;
     * effect.scale = {x: 0.4};
     */
    return {
        vertex: {
            attribute: {
                a_displacementMapTexCoord: 'vec2',
            },
            main: `
    v_displacementMapTexCoord = a_displacementMapTexCoord;`,
        },
        fragment: {
            uniform: {
                u_displacementEnabled: 'bool',
                u_dispMap: 'sampler2D',
                u_dispScale: 'vec2',
            },
            source: `
    if (u_displacementEnabled) {
        vec3 dispMap = texture2D(u_dispMap, v_displacementMapTexCoord).rgb - 0.5;
        vec2 dispVec = vec2(sourceCoord.x + (u_dispScale.x + dispMap.b) * dispMap.r, sourceCoord.y + (u_dispScale.y + dispMap.b) * dispMap.g);
        ${wrap}
        sourceCoord = dispVec;
    }`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get scale() {
            const [x, y] = this.uniforms[2].data;
            return { x, y };
        },
        set scale({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },
        get map() {
            return this.textures[0].data;
        },
        set map(img) {
            this.textures[0].data = img;
        },
        varying: {
            v_displacementMapTexCoord: 'vec2',
        },
        uniforms: [
            {
                name: 'u_displacementEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_dispMap',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_dispScale',
                type: 'f',
                data: [sx, sy],
            },
        ],
        attributes: [
            {
                name: 'a_displacementMapTexCoord',
                extends: 'a_texCoord',
            },
        ],
        textures: [
            {
                format: 'RGB',
            },
        ],
    };
}

const WRAP_METHODS = {
    CLAMP: `dispVec = clamp(dispVec, 0.0, 1.0);`,
    DISCARD: `if (dispVec.x < 0.0 || dispVec.x > 1.0 || dispVec.y > 1.0 || dispVec.y < 0.0) { discard; }`,
    WRAP: `dispVec = mod(dispVec, 1.0);`,
};

displacement.CLAMP = WRAP_METHODS.CLAMP;
displacement.DISCARD = WRAP_METHODS.DISCARD;
displacement.WRAP = WRAP_METHODS.WRAP;

export default displacement;
