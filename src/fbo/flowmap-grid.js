/**
 * @function fboFlowmapGrid
 * @returns {fboFlowmapGridEffect}
 * @example fboFlowmapGrid()
 */
export default function () {
    /**
     * @typedef {Object} fboFlowmapGridEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {number} progress number between 0.0 and 1.0
     * @property {boolean} disabled
     *
     * @example
     * effect.to = document.querySelector('#video-to');
     * effect.progress = 0.5;
     */
    return {
//         vertex: {
//             attribute: {
//                 a_transitionToTexCoord: 'vec2',
//             },
//             main: `
//   v_transitionToTexCoord = a_transitionToTexCoord;`,
//         },
//         fragment: {
//             uniform: {
//                 u_transitionEnabled: 'bool',
//                 u_transitionProgress: 'float',
//                 u_transitionTo: 'sampler2D',
//             },
//             main: `
//   if (u_transitionEnabled) {
//       vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
//       color = mix(color, targetPixel.rgb, u_transitionProgress);
//       alpha = mix(alpha, targetPixel.a, u_transitionProgress);
//   }`,
//         },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        set mouse(pos) {
            this.uniforms[0].data[0] = pos[0];
            this.uniforms[0].data[1] = pos[1];
        },
        set deltaMouse(pos) {
            this.uniforms[1].data[0] = pos[0];
            this.uniforms[1].data[1] = pos[1];
        },
        set movement(value) {
            this.uniforms[2].data[0] = value;
        },
        set relaxation(value) {
            this.uniforms[3].data[0] = value;
        },
        uniforms: [
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
                data: [0.93],
            },
            {
                name: 'uRadius',
                type: 'f',
                data: [130],
            },
            {
                name: 'uAspectRatio',
                type: 'f',
                data: [1],
            },
        ],
    };
}

// {
//     name: 'u_resolution',
//     type: 'f',
//     data: [0, 0],
// },
