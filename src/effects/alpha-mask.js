/**
 * @function alphaMask
 * @param {Object} [params]
 * @param {boolean} [params.isLuminance=false] whether to use luminance when reading mask values
 * @returns {alphaMaskEffect}
 *
 * @example alphaMask()
 */
export default function ({isLuminance = false} = {}) {
    /**
     * @typedef {Object} alphaMaskEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} mask
     * @property {boolean} disabled
     * @property {boolean} isLuminance
     *
     * @description Multiplies `alpha` value with values read from `mask` media source.
     *
     *  @example
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
                u_alphaMaskIsLuminance: 'bool',
                u_mask: 'sampler2D'
            },
            main: `
    if (u_alphaMaskEnabled) {
        vec4 alphaMaskPixel = texture2D(u_mask, v_alphaMaskTexCoord);

        if (u_alphaMaskIsLuminance) {
            alpha *= dot(lumcoeff, alphaMaskPixel.rgb) * alphaMaskPixel.a;
        }
        else {
            alpha *= alphaMaskPixel.a;
        }
    }`
        },
        get disabled () {
            return !this.uniforms[0].data[0];
        },
        set disabled (b) {
            this.uniforms[0].data[0] = +!b;
        },
        get mask () {
            return this.textures[0].data;
        },
        set mask (img) {
            this.textures[0].data = img;
        },
        get isLuminance () {
            return !!this.uniforms[2].data[0];
        },
        set isLuminance (toggle) {
            this.uniforms[2].data[0] = +toggle;
            this.textures[0].format = toggle ? 'RGBA' : 'ALPHA';
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
            },
            {
                name: 'u_alphaMaskIsLuminance',
                type: 'i',
                data: [+!!isLuminance]
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
                format: isLuminance ? 'RGBA' : 'ALPHA'
            }
        ]
    };
};
