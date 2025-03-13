/**
 * @function flowmapGridDisplacement
 * @param {Object} [params]
 * @param {number} [params.aspectRatio=16 / 9] Aspect ratio of the grid
 * @param {number} [params.intensity=0.01] Intensity of displacement
 * @param {boolean} [params.enableChannelSplit=true] Apply RGBShift or not
 * @returns {flowmapGridDisplacementEffect}
 * @example flowmapGridDisplacement()
 */
export default function flowmapGridDisplacement ({
    aspectRatio = 16 / 9,
    intensity = 0.01,
    enableChannelSplit = true,
} = {}) {
    /**
     * @typedef {Object} flowmapGridDisplacementEffect
     * @property {ArrayBufferView|ImageData|ImageBitmap} u_FBOMap map generated from FBO
     * @property {number} aspectRatio Aspect ratio
     * @property {number} intensity Displacement intensity
     * @property {boolean} enableChannelSplit Whether to apply RGB channel split
     *
     * @example
     * const flowmapGrid = fbo.flowmapGrid();
     * const flowmapDisp = effects.flowmapGridDisplacement({ intenisity: 0.1 });
     * const instance = new Kampos({
     *      target,
     *      effects: [flowmapDisp],
     *      fbo: {
     *          size: 64,
     *          effects: [flowmapGrid]
     *      }
     *  });
     */
    return {
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
                v_texCoord.x * ratio.x + (1.0 - ratio.x) * 0.5,
                v_texCoord.y * ratio.y + (1.0 - ratio.y) * 0.5
            );

            return newUvs;
        }`,
            uniform: {
                u_FBOMap: 'sampler2D',
                u_aspectRatio: 'float',
                u_displacementIntensity: 'float',
                u_enableChannelSplit: 'bool',
            },
            source: `
        vec2 griUvs = coverUvs(u_aspectRatio, u_resolution);
        vec4 displacement = texture2D(u_FBOMap, griUvs);

        sourceCoord -= displacement.rg * u_displacementIntensity * 1.5;`,
            main: `
        if (u_enableChannelSplit) {
            vec2 redUvs = sourceCoord;
            vec2 blueUvs = sourceCoord;
            vec2 greenUvs = sourceCoord;

            vec2 shift = displacement.rg * 0.001;

            float displacementScale = length(displacement.rg);
            displacementScale = clamp(displacementScale, 0., 2.);

            float redScale = 1. + displacementScale * 0.25;
            redUvs += shift * redScale;

            float greenScale = 1. + displacementScale * 2.;
            greenUvs += shift * greenScale;

            float blueScale = 1. + displacementScale * 1.5;
            blueUvs += shift * blueScale;

            float red = texture2D(u_source, redUvs).r;
            float blue = texture2D(u_source, blueUvs).b;
            float green = texture2D(u_source, greenUvs).g;

            color = vec3(red, green, blue);
        }`,
        },
        set aspectRatio(ar) {
            this.uniforms[1].data[0] = ar;
        },
        set intensity(i) {
            this.uniforms[2].data[0] = i;
        },
        set enableChannelSplit(b) {
            this.uniforms[3].data[0] = b;
        },
        uniforms: [
            {
                name: 'u_FBOMap',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_aspectRatio',
                type: 'f',
                data: [aspectRatio],
            },
            {
                name: 'u_displacementIntensity',
                type: 'f',
                data: [intensity],
            },
            {
                name: 'u_enableChannelSplit',
                type: 'i',
                data: [+enableChannelSplit],
            },
        ],
    };
}
