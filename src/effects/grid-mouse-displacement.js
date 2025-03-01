/**
 * @function gridMouseDisplacement
 * @returns {gridMouseDisplacementEffect}
 * @example gridMouseDisplacement()
 */
export default function () {
    /**
     * @typedef {Object} gridMouseDisplacementEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {number} progress number between 0.0 and 1.0
     * @property {boolean} disabled
     *
     * @example
     * effect.to = document.querySelector('#video-to');
     * effect.progress = 0.5;
     */
    return {
        vertex: {
            attribute: {
                a_uv: 'vec2',
            },
            main: `v_uv = a_uv;`,
        },
        fragment: {
            constant: `
            vec2 coverUvs(float aspectRatio, vec2 containerRes) {
                float containerAspectX = containerRes.x/containerRes.y;
                float containerAspectY = containerRes.y/containerRes.x;

                vec2 ratio = vec2(
                    min(containerAspectX / aspectRatio, 1.0),
                    min(containerAspectY * aspectRatio, 1.0)
                );

                vec2 newUvs = vec2(
                    v_uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
                    v_uv.y * ratio.y + (1.0 - ratio.y) * 0.5
                );

                return newUvs;
            }
        `,
            uniform: {
                u_image: 'sampler2D',
                u_flowMap: 'sampler2D',
                uContainerResolution: 'vec2',
                uAspectRatio: 'float',
                uDisplacementForce: 'float',
                uRGBShift: 'float',
            },
            main: `
            vec2 griUvs = coverUvs(uAspectRatio, uContainerResolution);
            vec4 displacement = texture2D(u_flowMap, griUvs);

            vec2 finalUvs = v_uv - displacement.rg * uDisplacementForce * 1.5;
            vec4 finalImage = texture2D(u_image, finalUvs);

            vec4 visualDisplacement = displacement;
            visualDisplacement *= 0.5;
            visualDisplacement += 0.5;

            vec4 final = step(0.5, 1.) * visualDisplacement + (1. - step(0.5, 1.));

            color.rgb = finalImage.rgb;
            alpha = 1.;
        `,
        },
        set containerResolution(value) {
            this.uniforms[2].data[0] = value[0];
            this.uniforms[2].data[1] = value[1];
        },
        set aspectRatio(value) {
            this.uniforms[3].data[0] = value;
        },
        set displacementForce(value) {
            this.uniforms[4].data[0] = value;
        },
        set rgbShift(value) {
            this.uniforms[5].data[0] = value;
        },
        varying: {
            v_uv: 'vec2',
        },
        uniforms: [
            {
                name: 'u_image',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_flowMap',
                type: 'i',
                data: [1],
            },
            {
                name: 'uContainerResolution',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'uAspectRatio',
                type: 'f',
                data: [1],
            },
            {
                name: 'uDisplacementForce',
                type: 'f',
                data: [0.01],
            },
            {
                name: 'uRGBShift',
                type: 'f',
                data: [0],
            },
        ],
        attributes: [
            {
                name: 'a_uv',
                extends: 'a_texCoord',
            },
        ],
    };
}
