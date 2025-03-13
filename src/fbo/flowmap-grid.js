/**
 * @function flowmapGrid
 * @param {Object} [options={}]
 * @param {number} [options.aspectRatio=16 / 9] Aspect ratio of the grid
 * @param {number} [options.radius=130] Radius of the effect
 * @param {number} [options.relaxation=0.93] Relaxation factor
 * @param {number} [options.width=window.innerWidth] Width of the container
 * @param {number} [options.height=window.innerHeight] Height of the container
 * @returns {flowmapGridFBO}
 *
 * @example
 * flowmapGrid()
 */
export default function flowmapGrid ({
    aspectRatio = 16 / 9,
    width = window.innerWidth,
    height = window.innerHeight,
    radius = 130,
    relaxation = 0.93,
} = {}) {
    /**
     * @typedef {Object} flowmapGridFBO
     * @property {ArrayBufferView|ImageData|ImageBitmap} u_FBOMap map generated and used
     * @property {Array<number>} mouse Mouse position
     * @property {Array<number>} deltaMouse Delta mouse position
     * @property {number} movement Movement value
     * @property {number} relaxation Relaxation value
     * @property {number} radius Radius value
     * @property {Array<number>} resolution Container resolution
     * @property {number} aspectRatio Aspect ratio
     *
     * @example
     * flowmapGrid.mouse = { x: 0.4, y: 0.2 };
     * flowmapGrid.deltaMouse = { x: 0.1, y: 0.1 };
     * flowmapGrid.movement = 0.1;
     */
    return {
        vertex: {
            attribute: {
                a_uv: 'vec2',
            },
            main: `
       v_uv = a_uv;// Convert to [0, 1] range`,
        },
        fragment: {
            constant: `
        float getDistance(vec2 uv, vec2 mouse, vec2 containerRes, float aspectRatio) {
            // adjust mouse ratio based on the grid aspectRatio wanted
            vec2 newMouse = mouse;
            newMouse -= 0.5;
            if (containerRes.x < containerRes.y) {
                newMouse.x *= (containerRes.x / containerRes.y) / aspectRatio;
            } else {
                newMouse.y *= (containerRes.y / containerRes.x) * aspectRatio;
            }
            newMouse += 0.5;

            // adjust circle based on the grid aspectRatio wanted
            vec2 diff = uv - newMouse;
            diff.y /= aspectRatio;
            return length(diff);
        }`,
            uniform: {
                u_FBOMap: 'sampler2D',
                u_mouse: 'vec2',
                u_deltaMouse: 'vec2',
                u_movement: 'float',
                u_relaxation: 'float',
                u_radius: 'float',
                u_resolution: 'vec2',
                u_aspectRatio: 'float',
            },
            main: `
        vec4 colorMap = texture2D(u_FBOMap, v_uv);

        // Adjust values for square / rectangle ratio
        float dist = getDistance(v_uv, u_mouse, u_resolution, u_aspectRatio);
        dist = 1.0 - smoothstep(0.0, u_radius / 1000., dist);

        vec2 delta = u_deltaMouse;

        colorMap.rg += delta * dist;
        colorMap.rg *= min(u_relaxation, u_movement);

        color = colorMap.rgb;
        alpha = 1.0;`,
        },
        set mouse({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[1].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[1].data[1] = y;
        },
        set deltaMouse({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },
        set movement(m) {
            this.uniforms[3].data[0] = m;
        },
        set relaxation(r) {
            this.uniforms[4].data[0] = r;
        },
        set radius(r) {
            this.uniforms[5].data[0] = r;
        },
        set resolution({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[6].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[6].data[1] = y;
        },
        set aspectRatio(ar) {
            this.uniforms[7].data[0] = ar;
        },
        varying: {
            v_uv: 'vec2',
        },
        uniforms: [
            {
                name: 'u_FBOMap',
                type: 'i',
                data: [0],
            },
            {
                name: 'u_mouse',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'u_deltaMouse',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'u_movement',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_relaxation',
                type: 'f',
                data: [relaxation],
            },
            {
                name: 'u_radius',
                type: 'f',
                data: [radius],
            },
            {
                name: 'u_resolution',
                type: 'f',
                data: [width, height],
            },
            {
                name: 'u_aspectRatio',
                type: 'f',
                data: [aspectRatio],
            },
        ],
        attributes: [
            {
                name: 'a_uv',
            },
        ],
    };
}
