/**
 * @function dissolveTransition
 * @param {Object} [params]
 * @param {number} [params.low=0.0] initial lower edge of intersection step
 * @param {number} [params.high=0.01] initial higher edge of intersection step
 * @returns {dissolveTransitionEffect}
 * @example dissolveTransition()
 */
export default function ({
    low = 0.0,
    high = 0.01
} = {}) {
    /**
     * @typedef {Object} dissolveTransitionEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map dissolve map to use
     * @property {number} low lower edge of intersection step, in range [0.0, 1.0]
     * @property {number} high higher edge of intersection step, in range [0.0, 1.0]
     * @property {number} progress number in range [0.0, 1.0]
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
                u_dissolveLowEdge: 'float',
                u_dissolveHighEdge: 'float',
                u_transitionTo: 'sampler2D',
                u_transitionDissolveMap: 'sampler2D'
            },
            main: `
    if (u_transitionEnabled) {
        vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
        vec4 transDissolveMap = texture2D(u_transitionDissolveMap, v_transitionDissolveMapTexCoord);

        float edgeDelta = u_dissolveHighEdge - u_dissolveLowEdge;
        float dissolveProgress = u_transitionProgress * (1.0 + edgeDelta);
        vec4 dissolveVector = smoothstep(u_dissolveLowEdge, u_dissolveHighEdge, clamp(transDissolveMap - 1.0 + dissolveProgress , 0.0, 1.0));

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
            this.uniforms[3].data[0] = Math.min(Math.max(p, 0.0), 1.0);
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
        get low () {
            return this.uniforms[4].data[0];
        },
        set low (low) {
            this.uniforms[4].data[0] = Math.min(Math.max(low, 0.0), this.high);
        },
        get high () {
            return this.uniforms[5].data[0];
        },
        set high (high) {
            this.uniforms[5].data[0] = Math.min(Math.max(high, this.low), 1.0);
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
            },
            {
                name: 'u_dissolveLowEdge',
                type: 'f',
                data: [low]
            },
            {
                name: 'u_dissolveHighEdge',
                type: 'f',
                data: [high]
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
