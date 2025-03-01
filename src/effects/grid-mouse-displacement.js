/**
 * @function gridMouseDisplacement
 * @param {number} [options.aspectRatio=16 / 9] Aspect ratio of the grid
 * @param {number} [options.displacementForce=0.01] Force of displacement
 * @param {boolean} [options.rgbShift=true] Apply RGBShift or not
 * @returns {gridMouseDisplacementEffect}
 * @example gridMouseDisplacement()
 */
export default function ({
    aspectRatio = 16 / 9,
    displacementForce = 0.01,
    rgbShift = true,
} = {}) {
    /**
     * @typedef {Object} gridMouseDisplacementEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} u_image media source to transition into
     * @property {ArrayBufferView|ImageData|ImageBitmap} u_flowMap map generated from FBO
     * @property {Array<number>} containerResolution Container resolution
     * @property {number} aspectRatio Aspect ratio
     * @property {number} displacementForce Displacement force
     * @property {boolean} rgbShift Apply RGB shift
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
                uRGBShift: 'bool',
            },
            main: `
            vec2 griUvs = coverUvs(uAspectRatio, uContainerResolution);
            vec4 displacement = texture2D(u_flowMap, griUvs);

            vec2 finalUvs = v_uv - displacement.rg * uDisplacementForce * 1.5;
            vec4 finalImage = texture2D(u_image, finalUvs);

            //rgb shift
            if (uRGBShift) {
                vec2 redUvs = finalUvs;
                vec2 blueUvs = finalUvs;
                vec2 greenUvs = finalUvs;

                vec2 shift = displacement.rg * 0.001;

                float displacementStrengh = length(displacement.rg);
                displacementStrengh = clamp(displacementStrengh, 0., 2.);

                float redStrengh = 1. + displacementStrengh * 0.25;
                redUvs += shift * redStrengh;

                float blueStrengh = 1. + displacementStrengh * 1.5;
                blueUvs += shift * blueStrengh;

                float greenStrengh = 1. + displacementStrengh * 2.;
                greenUvs += shift * greenStrengh;

                float red = texture2D(u_image, redUvs).r;
                float blue = texture2D(u_image, blueUvs).b;
                float green = texture2D(u_image, greenUvs).g;

                finalImage.r = red;
                finalImage.g = green;
                finalImage.b = blue;
            }

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
                data: [aspectRatio],
            },
            {
                name: 'uDisplacementForce',
                type: 'f',
                data: [displacementForce],
            },
            {
                name: 'uRGBShift',
                type: 'i',
                data: [+rgbShift],
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
