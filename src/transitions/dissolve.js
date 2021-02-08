/**
 * @function dissolveTransition
 * @returns {dissolveTransitionEffect}
 * @example dissolveTransition()
 */
export default function () {
    /**
     * @typedef {Object} dissolveTransitionEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map dissolve map to use
     * @property {number} progress number between 0.0 and 1.0
     * @property {boolean} disabled
     *
     * @example
     * const img = new Image();
     * img.src = 'dissolve.jpg';
     * effect.map = img;
     * effect.to = document.querySelector('#video-to');
     * effect.progress = 0.5;
     */
    return {
        vertex: {
            attribute: {
                a_transitionToTexCoord: 'vec2',
                a_transitionDissolveMapTexCoord: 'vec2'
            },
            main: `
    v_transitionToTexCoord = a_transitionToTexCoord;
    v_transitionDissolveMapTexCoord = a_transitionDissolveMapTexCoord;`
        },
        fragment: {
            uniform: {
                u_transitionEnabled: 'bool',
                u_transitionProgress: 'float',
                u_transitionTo: 'sampler2D',
                u_transitionDissolveMap: 'sampler2D'
            },
            main: `
    if (u_transitionEnabled) {
        vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
        vec4 transDissolveMap = texture2D(u_transitionDissolveMap, v_transitionDissolveMapTexCoord);

        float dissolveProgress = u_transitionProgress;
        vec4 dissolveVector = smoothstep(0.49, 0.5, clamp(transDissolveMap + dissolveProgress, 0.0, 1.0));

        // color = dissolveVector.rgb; // debug
        color = mix(color, targetPixel.rgb, dissolveVector.rgb);
        alpha = mix(alpha, targetPixel.a, dissolveVector.a);
    }`
        },
        get disabled () {
            return !this.uniforms[0].data[0];
        },
        set disabled (b) {
            this.uniforms[0].data[0] = +!b;
        },
        get progress () {
            return this.uniforms[3].data[0];
        },
        set progress (p) {
            this.uniforms[3].data[0] = p;
        },
        get to () {
            return this.textures[0].data;
        },
        set to (media) {
            this.textures[0].data = media;
        },
        get map () {
            return this.textures[1].data;
        },
        set map (img) {
            this.textures[1].data = img;
        },
        varying: {
            v_transitionToTexCoord: 'vec2',
            v_transitionDissolveMapTexCoord: 'vec2'
        },
        uniforms: [
            {
                name: 'u_transitionEnabled',
                type: 'i',
                data: [1]
            },
            {
                name: 'u_transitionTo',
                type: 'i',
                data: [1]
            },
            {
                name: 'u_transitionDissolveMap',
                type: 'i',
                data: [2]
            },
            {
                name: 'u_transitionProgress',
                type: 'f',
                data: [0]
            }
        ],
        attributes: [
            {
                name: 'a_transitionToTexCoord',
                data: new Float32Array([
                    0.0, 0.0,
                    0.0, 1.0,
                    1.0, 0.0,
                    1.0, 1.0]),
                size: 2,
                type: 'FLOAT'
            },
            {
                name: 'a_transitionDissolveMapTexCoord',
                data: new Float32Array([
                    0.0, 0.0,
                    0.0, 1.0,
                    1.0, 0.0,
                    1.0, 1.0]),
                size: 2,
                type: 'FLOAT'
            }
        ],
        textures: [
            {
                format: 'RGBA',
                update: true
            },
            {
                format: 'RGBA',
                update: false
            }
        ]
    };
};
