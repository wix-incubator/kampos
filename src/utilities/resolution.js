/**
 * Exposes the `u_resolution` uniform for use inside fragment shaders.
 *
 * @function resolution
 * @param {Object} [params]
 * @param {number} [params.width] initial canvas width. Defaults to `window.innerWidth`.
 * @param {number} [params.height] initial canvas height. Defaults to `window.innerHeight`.
 * @returns {resolutionUtility}
 *
 * @example
 * resolution({width: 1600, height: 900})
 */
function resolution({
    width = window.innerWidth,
    height = window.innerHeight,
} = {}) {
    /**
     * @typedef {Object} resolutionUtility
     * @property {{width: number?, height: number?}} resolution
     *
     * @example
     * mouse.resolution = {width: 854, height: 480};
     */
    return {
        fragment: {
            uniform: {
                u_resolution: 'vec2',
            },
        },
        get resolution() {
            const [x, y] = this.uniforms[0].data;
            return { x, y };
        },
        set resolution({ width: x, height: y }) {
            if (typeof x !== 'undefined') this.uniforms[0].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[0].data[1] = y;
        },
        uniforms: [
            {
                name: 'u_resolution',
                type: 'f',
                data: [width || window.innerWidth, height || window.innerHeight],
            },
        ],
    };
}

export default resolution;
