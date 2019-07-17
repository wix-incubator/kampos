/**
 * @function alphaMask
 * @returns {alphaMaskEffect}
 * @example alphaMask()
 */
export default function () {
    /**
     * @typedef {Object} alphaMaskEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} mask
     * @property {boolean} disabled
     *
     * @example
     * const img = new Image();
     * img.src = 'picture.png';
     * effect.mask = img;
     * effect.disabled = true;
     */
    return {
        vertex: {
            attribute: {
                a_alphaMaskTexCoord: 'vec2'
            },
            main: `
    v_alphaMaskTexCoord = a_alphaMaskTexCoord;`
        },
        fragment: {
            uniform: {
                u_alphaMaskEnabled: 'bool',
                u_mask: 'sampler2D'
            },
            main: `
    if (u_alphaMaskEnabled) {
        alpha *= texture2D(u_mask, v_alphaMaskTexCoord).a;
    }`
        },
        get disabled () {
            return !this.uniforms[0].data[0];
        },
        set disabled (b) {
            this.uniforms[0].data[0] = +!b;
        },
        get mask () {
            return this.textures[0].image;
        },
        set mask (img) {
            this.textures[0].image = img;
        },
        varying: {
            v_alphaMaskTexCoord: 'vec2'
        },
        uniforms: [
            {
                name: 'u_alphaMaskEnabled',
                type: 'i',
                data: [1]
            },
            {
                name: 'u_mask',
                type: 'i',
                data: [1]
            }
        ],
        attributes: [
            {
                name: 'a_alphaMaskTexCoord',
                data: new Float32Array([
                    0.0, 0.0,
                    0.0, 1.0,
                    1.0, 0.0,
                    1.0, 1.0]),
                size: 2,
                type: 'FLOAT'
            }
        ],
        textures: [
            {
                format: 'ALPHA'
            }
        ]
    };
};
