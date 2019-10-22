/**
 * @function displacementTransition
 * @returns {displacementTransitionEffect}
 * @example displacementTransition()
 */
export default function () {
    /**
     * @typedef {Object} displacementTransitionEffect
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map displacement map to use
     * @property {number} progress number between 0.0 and 1.0
     * @property {{x: number?, y: number?}} sourceScale
     * @property {{x: number?, y: number?}} toScale
     * @property {boolean} disabled
     *
     * @example
     * const img = new Image();
     * img.src = 'disp.jpg';
     * effect.map = img;
     * effect.to = document.querySelector('#video-to');
     * effect.sourceScale = {x: 0.4};
     * effect.toScale = {x: 0.8};
     */
    return {
        vertex: {
            attribute: {
                a_transitionToTexCoord: 'vec2',
                a_transitionDispMapTexCoord: 'vec2'
            },
            main: `
    v_transitionToTexCoord = a_transitionToTexCoord;
    v_transitionDispMapTexCoord = a_transitionDispMapTexCoord;`
        },
        fragment: {
            uniform: {
                u_transitionEnabled: 'bool',
                u_transitionTo: 'sampler2D',
                u_transitionDispMap: 'sampler2D',
                u_transitionProgress: 'float',
                u_sourceDispScale: 'vec2',
                u_toDispScale: 'vec2'
            },
            source: `
    vec3 transDispMap = vec3(1.0);
    vec2 transDispVec = vec2(0.0);

    if (u_transitionEnabled) {
        // read the displacement texture once and create the displacement map
        transDispMap = texture2D(u_transitionDispMap, v_transitionDispMapTexCoord).rgb - 0.5;

        // prepare the source coordinates for sampling
        transDispVec = vec2(u_sourceDispScale.x * transDispMap.r, u_sourceDispScale.y * transDispMap.g);
        sourceCoord = clamp(sourceCoord + transDispVec * u_transitionProgress, 0.0, 1.0);
    }`,
            main: `
    if (u_transitionEnabled) {
        // prepare the target coordinates for sampling
        transDispVec = vec2(u_toDispScale.x * transDispMap.r, u_toDispScale.y * transDispMap.g);
        vec2 targetCoord = clamp(v_transitionToTexCoord + transDispVec * (1.0 - u_transitionProgress), 0.0, 1.0);

        // sample the target
        vec4 targetPixel = texture2D(u_transitionTo, targetCoord);

        // mix the results of source and target
        color = mix(color, targetPixel.rgb, u_transitionProgress);
        alpha = mix(alpha, targetPixel.a, u_transitionProgress);
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
        get sourceScale () {
            const [x, y] = this.uniforms[4].data;
            return {x, y};
        },
        set sourceScale ({x, y}) {
            if ( typeof x !== 'undefined' )
                this.uniforms[4].data[0] = x;
            if ( typeof y !== 'undefined' )
                this.uniforms[4].data[1] = y;
        },
        get toScale () {
            const [x, y] = this.uniforms[5].data;
            return {x, y};
        },
        set toScale ({x, y}) {
            if ( typeof x !== 'undefined' )
                this.uniforms[5].data[0] = x;
            if ( typeof y !== 'undefined' )
                this.uniforms[5].data[1] = y;
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
            v_transitionDispMapTexCoord: 'vec2'
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
                name: 'u_transitionDispMap',
                type: 'i',
                data: [2]
            },
            {
                name: 'u_transitionProgress',
                type: 'f',
                data: [0]
            },
            {
                name: 'u_sourceDispScale',
                type: 'f',
                data: [0.0, 0.0]
            },
            {
                name: 'u_toDispScale',
                type: 'f',
                data: [0.0, 0.0]
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
                name: 'a_transitionDispMapTexCoord',
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
                format: 'RGB'
            }
        ]
    };
};
