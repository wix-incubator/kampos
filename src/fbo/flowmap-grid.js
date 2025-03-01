/**
 * @function fboFlowmapGrid
 * @param {number} [options.aspectRatio=16 / 9] Aspect ratio of the grid
 * @param {number} [options.radius=130] Radius of the effect
 * @param {number} [options.relaxation=0.93] Relaxation factor
 * @returns {fboFlowmapGridEffect}
 * @example fboFlowmapGrid()
 */
export default function ({
    aspectRatio = 16 / 9,
    radius = 130,
    relaxation = 0.93,
} = {}) {
    /**
     * @typedef {Object} fboFlowmapGridEffect
     * @property {ArrayBufferView|ImageData|ImageBitmap} u_flowMap map generated and used
     * @property {Array<number>} mouse Mouse position
     * @property {Array<number>} deltaMouse Delta mouse position
     * @property {number} movement Movement value
     * @property {number} relaxation Relaxation value
     * @property {number} radius Radius value
     * @property {Array<number>} containerResolution Container resolution
     * @property {number} aspectRatio Aspect ratio
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
                }
            `,
            uniform: {
                u_flowMap: 'sampler2D',
                uMouse: 'vec2',
                uDeltaMouse: 'vec2',
                uMovement: 'float',
                uRelaxation: 'float',
                uRadius: 'float',
                uContainerResolution: 'vec2',
                uAspectRatio: 'float',
            },
            main: `
                    vec4 colorMap = texture2D(u_flowMap, v_uv);

                    // Adjust values for square / rectangle ratio
                    float dist = getDistance(v_uv, uMouse, uContainerResolution, uAspectRatio);
                    dist = 1.0 - (smoothstep(0.0, uRadius / 1000., dist));

                    vec2 delta = uDeltaMouse;

                    colorMap.rg += delta * dist;
                    colorMap.rg *= min(uRelaxation, uMovement);

                    color = colorMap.rgb;
                    alpha = 1.0;
                `,
        },
        set mouse(pos) {
            this.uniforms[1].data[0] = pos[0];
            this.uniforms[1].data[1] = pos[1];
        },
        set deltaMouse(pos) {
            this.uniforms[2].data[0] = pos[0];
            this.uniforms[2].data[1] = pos[1];
        },
        set movement(value) {
            this.uniforms[3].data[0] = value;
        },
        set relaxation(value) {
            this.uniforms[4].data[0] = value;
        },
        set radius(value) {
            this.uniforms[5].data[0] = value;
        },
        set containerResolution(value) {
            this.uniforms[6].data[0] = value[0];
            this.uniforms[6].data[1] = value[1];
        },
        set aspectRatio(value) {
            this.uniforms[7].data[0] = value;
        },
        varying: {
            v_uv: 'vec2',
        },
        uniforms: [
            {
                name: 'u_flowMap',
                type: 'i',
                data: [0],
            },
            {
                name: 'uMouse',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'uDeltaMouse',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'uMovement',
                type: 'f',
                data: [1],
            },
            {
                name: 'uRelaxation',
                type: 'f',
                data: [relaxation],
            },
            {
                name: 'uRadius',
                type: 'f',
                data: [radius],
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
        ],
        attributes: [
            {
                name: 'a_uv',
            },
        ],
    };
}
