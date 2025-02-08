// import fragmentShader from './shape.frag';

/**
 * @function shapeTransition
 * @returns {shapeTransitionEffect}
 * @example shapeTransition()
 */
export default function () {
    /**
     * @typedef {Object} shapeTransitionEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {number} progress number between 0.0 and 1.0
     * @property {boolean} disabled
     *
     * @example
     * effect.to = document.querySelector('#video-to');
     * effect.progress = 0.5;
     */

    console.log('shnadoc');

    return {
        vertex: {
            attribute: {
                a_transitionToTexCoord: 'vec2',
            },
            main: `
    v_transitionToTexCoord = a_transitionToTexCoord;`,
        },
        fragment: {
            uniform: {
                u_transitionEnabled: 'bool',
                u_transitionProgress: 'float',
                u_transitionTo: 'sampler2D',
                u_resolution: 'vec2',
            },
            main: `if (u_transitionEnabled) {

            // Grid of circles
            vec2 st = gl_FragCoord.xy / u_resolution;
            vec2 aspect = u_resolution / min(u_resolution.x, u_resolution.y); // Calculate aspect ratio
            st.x *= aspect.x / aspect.y; // Adjust x coordinate based on aspect ratio to have square
            st *= 10.; // TODO: nbShapes      // Scale up the space by 3
            st = fract(st); // Wrap around 1.0


            vec4 targetPixel = texture2D(u_transitionTo, st);
            // color = mix(color, targetPixel.rgb, u_transitionProgress);
            color = targetPixel.rgb;
            // color = vec3(uResolution.x, uResolution.y, 0.0);
            alpha = mix(alpha, targetPixel.a, u_transitionProgress);
}`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get progress() {
            return this.uniforms[2].data[0];
        },
        set progress(p) {
            this.uniforms[2].data[0] = p;
        },
        get to() {
            return this.textures[0].data;
        },
        set to(media) {
            this.textures[0].data = media;
        },
        set resolution([width, height]) {
            this.uniforms[3].data[0] = width;
            this.uniforms[3].data[1] = height;
        },
        varying: {
            v_transitionToTexCoord: 'vec2',
        },
        uniforms: [
            {
                name: 'u_transitionEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_transitionTo',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_transitionProgress',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_resolution',
                type: 'f',
                data: [0, 0],
            },
        ],
        attributes: [
            {
                name: 'a_transitionToTexCoord',
                extends: 'a_texCoord',
            },
        ],
        textures: [
            {
                format: 'RGBA',
                update: true,
            },
        ],
    };
}
