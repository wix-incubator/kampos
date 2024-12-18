/**
 * Exposes the `u_mouse` uniform for use inside fragment shaders.
 * Note that internally the `y` coordinate is inverted to match the WebGL coordinate system.
 *
 * @function mouse
 * @param {Object} [params]
 * @param {{x: number?, y: number?}} [params.initial] initial mouse position. Defaults to `{x: 0, y: 0}`.
 * @returns {mouseUtility}
 *
 * @example mouse({initial: {x: 0.5, y: 0.5}})
 */
function mouse({
     initial = { x: 0, y: 0 },
 } = {}) {
    /**
     * @typedef {Object} mouseUtility
     * @property {{x: number?, y: number?}} position
     *
     * @example
     * mouse.position = {x: 0.4, y: 0.2};
     */
    return {
        fragment: {
            uniform: {
                u_mouse: 'vec2',
            },
        },
        get position() {
            const [x, y] = this.uniforms[0].data;
            return { x, y: 1 - y };
        },
        set position({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[0].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[0].data[1] = 1 - y;
        },
        uniforms: [
            {
                name: 'u_mouse',
                type: 'f',
                data: [initial.x || 0, 1 - initial.y || 0],
            },
        ],
    };
}

export default mouse;
