/**
 * @function channelSplit
 * @param {Object} [params]
 * @param {{x: number?, y: number?}} [params.offsetRed] initial offset to use for red channel offset. Defaults to `{x: 0.0, y: 0.0}` which means no offset.
 * @param {{x: number?, y: number?}} [params.offsetGreen] initial offset to use for green channel offset. Defaults to `{x: 0.0, y: 0.0}` which means no offset.
 * @param {{x: number?, y: number?}} [params.offsetBlue] initial offset to use for blue channel offset. Defaults to `{x: 0.0, y: 0.0}` which means no offset.
 * @param {string} [params.offsetInputR] code to use as input for the red offset. Defaults to `u_channelOffsetR`.
 * @param {string} [params.offsetInputG] code to use as input for the green offset. Defaults to `u_channelOffsetG`.
 * @param {string} [params.offsetInputB] code to use as input for the blue offset. Defaults to `u_channelOffsetB`.
 * @param {function} [params.boundsOffsetFactor] function that takes name of variable for channel offset and returns a float value as string. Defaults to returning `'1.0`'.
 * @returns {channelSplitEffect}
 *
 * @example channelSplit({offsetRed: {x: 0.02, y: 0.0}})
 */
export default function channelSplit({
    offsetRed = { x: 0.01, y: 0.01 },
    offsetGreen = { x: -0.01, y: -0.01 },
    offsetBlue = { x: -0.01, y: -0.01 },
    offsetInputR = 'u_channelOffsetR',
    offsetInputG = 'u_channelOffsetG',
    offsetInputB = 'u_channelOffsetB',
    boundsOffsetFactor = (boundsOffset) => '1.0',
} = {}) {
    /**
     * @typedef {Object} channelSplitEffect
     * @property {boolean} disabled
     * @property {{x: number?, y: number?}} offsetRed
     * @property {{x: number?, y: number?}} offsetGreen
     * @property {{x: number?, y: number?}} offsetBlue
     *
     * @example
     * effect.offsetRed = { x: 0.1, y: 0.0 };
     */
    return {
        fragment: {
            uniform: {
                u_channelSplitEnabled: 'bool',
                u_channelOffsetR: 'vec2',
                u_channelOffsetG: 'vec2',
                u_channelOffsetB: 'vec2',
            },
            main: `
    if (u_channelSplitEnabled) {
        vec2 _splitOffsetR = ${offsetInputR};
        vec2 _splitOffsetG = ${offsetInputG};
        vec2 _splitOffsetB = ${offsetInputB};
        vec2 redSample = sourceCoord + _splitOffsetR;
        vec2 greenSample = sourceCoord + _splitOffsetG;
        vec2 blueSample = sourceCoord + _splitOffsetB;
        float redBoundsOffset = min(0.0, min(min(redSample.x, redSample.y), min(1.0 - redSample.x, 1.0 - redSample.y)));
        float greenBoundsOffset = min(0.0, min(min(greenSample.x, greenSample.y), min(1.0 - greenSample.x, 1.0 - greenSample.y)));
        float blueBoundsOffset = min(0.0, min(min(blueSample.x, blueSample.y), min(1.0 - blueSample.x, 1.0 - blueSample.y)));
        float redSplit = texture2D(u_source, sourceCoord + _splitOffsetR).r * ${boundsOffsetFactor(
            'redBoundsOffset'
        )};
        float greenSplit = texture2D(u_source, sourceCoord + _splitOffsetG).g * ${boundsOffsetFactor(
            'greenBoundsOffset'
        )};
        float blueSplit = texture2D(u_source, sourceCoord + _splitOffsetB).b * ${boundsOffsetFactor(
            'blueBoundsOffset'
        )};
        color = vec3(redSplit, greenSplit, blueSplit);
    }`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get red() {
            const [x, y] = this.uniforms[1].data;
            return { x, y };
        },
        set red({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[1].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[1].data[1] = y;
        },
        get green() {
            const [x, y] = this.uniforms[2].data;
            return { x, y };
        },
        set green({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },
        get blue() {
            const [x, y] = this.uniforms[3].data;
            return { x, y };
        },
        set blue({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[3].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[3].data[1] = y;
        },
        uniforms: [
            {
                name: 'u_channelSplitEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_channelOffsetR',
                type: 'f',
                data: [offsetRed.x, offsetRed.y],
            },
            {
                name: 'u_channelOffsetG',
                type: 'f',
                data: [offsetGreen.x, offsetGreen.y],
            },
            {
                name: 'u_channelOffsetB',
                type: 'f',
                data: [offsetBlue.x, offsetBlue.y],
            },
        ],
    };
}
