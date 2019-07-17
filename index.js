(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.kampos = factory());
}(this, function () { 'use strict';

    /**
     * @function alphaMask
     * @returns {alphaMaskEffect}
     * @example alphaMask()
     */
    function alphaMask () {
        /**
         * @typedef {Object} alphaMaskEffect
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} mask
         * @property {boolean} disabled
         *
         * @example
         * const img = new Image();
         * img.src = 'picture.png';
         * effect.mask = img;
         * effect.disabled = true;
         */
        return {
            vertex: {
                attribute: {
                    a_alphaMaskTexCoord: 'vec2'
                },
                main: `
    v_alphaMaskTexCoord = a_alphaMaskTexCoord;`
            },
            fragment: {
                uniform: {
                    u_alphaMaskEnabled: 'bool',
                    u_mask: 'sampler2D'
                },
                main: `
    if (u_alphaMaskEnabled) {
        alpha *= texture2D(u_mask, v_alphaMaskTexCoord).a;
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get mask () {
                return this.textures[0].image;
            },
            set mask (img) {
                this.textures[0].image = img;
            },
            varying: {
                v_alphaMaskTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_alphaMaskEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_mask',
                    type: 'i',
                    data: [1]
                }
            ],
            attributes: [
                {
                    name: 'a_alphaMaskTexCoord',
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
                    format: 'ALPHA'
                }
            ]
        };
    }

    /**
     * @function brightnessContrast
     * @returns {brightnessContrastEffect}
     * @example brightnessContrast()
     */
    function brightnessContrast () {
        /**
         * @typedef {Object} brightnessContrastEffect
         * @property {number} brightness
         * @property {number} contrast
         * @property {boolean} brightnessDisabled
         * @property {boolean} contrastDisabled
         *
         * @example
         * effect.brightness = 1.5;
         * effect.contrast = 0.9;
         * effect.contrastDisabled = true;
         */
        return {
            vertex: {},
            fragment: {
                uniform: {
                    u_brEnabled: 'bool',
                    u_ctEnabled: 'bool',
                    u_contrast: 'float',
                    u_brightness: 'float'
                },
                constant: 'const vec3 half3 = vec3(0.5);',
                main: `
    if (u_brEnabled) {
        color *= u_brightness;
    }

    if (u_ctEnabled) {
        color = (color - half3) * u_contrast + half3;
    }

    color = clamp(color, 0.0, 1.0);`
            },
            get brightness () {
                return this.uniforms[2].data[0];
            },
            set brightness (value) {
                this.uniforms[2].data[0] = parseFloat(Math.max(0, value));
            },
            get contrast () {
                return this.uniforms[3].data[0];
            },
            set contrast (value) {
                this.uniforms[3].data[0] = parseFloat(Math.max(0, value));
            },
            get brightnessDisabled () {
                return !this.uniforms[0].data[0];
            },
            set brightnessDisabled (toggle) {
                this.uniforms[0].data[0] = +!toggle;
            },
            get contrastDisabled () {
                return !this.uniforms[1].data[0];
            },
            set contrastDisabled (toggle) {
                this.uniforms[1].data[0] = +!toggle;
            },
            uniforms: [
                {
                    name: 'u_brEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_ctEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_brightness',
                    type: 'f',
                    data: [1.0]
                },
                {
                    name: 'u_contrast',
                    type: 'f',
                    data: [1.0]
                }
            ]
        };
    }

    /**
     * @function hueSaturation
     * @returns {hueSaturationEffect}
     * @example hueSaturation()
     */
    function hueSaturation () {
        /**
         * @typedef {Object} hueSaturationEffect
         * @property {number} hue
         * @property {number} saturation
         * @property {boolean} hueDisabled
         * @property {boolean} saturationDisabled
         *
         * @example
         * effect.hue = 45;
         * effect.saturation = 0.8;
         */
        return {
            vertex: {
                uniform: {
                    u_hue: 'float',
                    u_saturation: 'float'
                },
                // for implementation see: https://www.w3.org/TR/SVG11/filters.html#feColorMatrixElement
                constant: `
const mat3 lummat = mat3(
    lumcoeff,
    lumcoeff,
    lumcoeff
);
const mat3 cosmat = mat3(
    vec3(0.787, -0.715, -0.072),
    vec3(-0.213, 0.285, -0.072),
    vec3(-0.213, -0.715, 0.928)
);
const mat3 sinmat = mat3(
    vec3(-0.213, -0.715, 0.928),
    vec3(0.143, 0.140, -0.283),
    vec3(-0.787, 0.715, 0.072)
);
const mat3 satmat = mat3(
    vec3(0.787, -0.715, -0.072),
    vec3(-0.213, 0.285, -0.072),
    vec3(-0.213, -0.715, 0.928)
);`,
                main: `
    float angle = (u_hue / 180.0) * 3.14159265358979323846264;
    v_hueRotation = lummat + cos(angle) * cosmat + sin(angle) * sinmat;
    v_saturation = lummat + satmat * u_saturation;`
            },
            fragment: {
                uniform: {
                    u_hueEnabled: 'bool',
                    u_satEnabled: 'bool',
                    u_hue: 'float',
                    u_saturation: 'float'
                },
                main: `
    if (u_hueEnabled) {
        color = vec3(
            dot(color, v_hueRotation[0]),
            dot(color, v_hueRotation[1]),
            dot(color, v_hueRotation[2])
        );
    }

    if (u_satEnabled) {
        color = vec3(
            dot(color, v_saturation[0]),
            dot(color, v_saturation[1]),
            dot(color, v_saturation[2])
        );
    }
    
    color = clamp(color, 0.0, 1.0);`
            },
            varying: {
                v_hueRotation: 'mat3',
                v_saturation: 'mat3'
            },

            get hue () {
                return this.uniforms[2].data[0];
            },
            set hue (h) {
                this.uniforms[2].data[0] = parseFloat(h);
            },
            get saturation () {
                return this.uniforms[3].data[0];
            },
            set saturation (s) {
                this.uniforms[3].data[0] = parseFloat(Math.max(0, s));
            },
            get hueDisabled () {
                return !this.uniforms[0].data[0];
            },
            set hueDisabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get saturationDisabled () {
                return !this.uniforms[1].data[0];
            },
            set saturationDisabled (b) {
                this.uniforms[1].data[0] = +!b;
            },
            uniforms: [
                {
                    name: 'u_hueEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_satEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_hue',
                    type: 'f',
                    data: [0.0]
                },
                {
                    name: 'u_saturation',
                    type: 'f',
                    data: [1.0]
                }
            ]
        };
    }

    /**
     * @function duotone
     * @returns {duotoneEffect}
     * @example duotone()
     */
    function duotone () {
        /**
         * @typedef {Object} duotoneEffect
         * @property {number} light
         * @property {number} dark
         * @property {boolean} disabled
         *
         * @example
         * effect.light = [1.0, 1.0, 0.8];
         * effect.dark = [0.2, 0.6, 0.33];
         */
        return {
            vertex: {},
            fragment: {
                uniform: {
                    u_duotoneEnabled: 'bool',
                    u_light: 'vec4',
                    u_dark: 'vec4'
                },
                main: `
    if (u_duotoneEnabled) {
        vec3 gray = vec3(dot(lumcoeff, color));
        color = mix(u_dark.rgb, u_light.rgb, gray);
    }`
            },
            get light () {
                return this.uniforms[1].data.slice(0);
            },
            set light (l) {
                l.forEach((c, i) => {
                    if ( ! Number.isNaN(c) ) {
                        this.uniforms[1].data[i] = c;
                    }
                });
            },
            get dark () {
                return this.uniforms[2].data.slice(0);
            },
            set dark (d) {
                d.forEach((c, i) => {
                    if ( ! Number.isNaN(c) ) {
                        this.uniforms[2].data[i] = c;
                    }
                });
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            uniforms: [
                {
                    name: 'u_duotoneEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_light',
                    type: 'f',
                    data: [0.9882352941, 0.7333333333, 0.05098039216, 1]
                },
                {
                    name: 'u_dark',
                    type: 'f',
                    data: [0.7411764706, 0.0431372549, 0.568627451, 1]
                }
            ]
        };
    }

    /**
     * @function displacement
     * @returns {displacementEffect}
     * @example displacement()
     */
    function displacement () {
        /**
         * @typedef {Object} displacementEffect
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map
         * @property {{x: {number}, y: {number}} scale
         * @property {boolean} disabled
         *
         * @example
         * const img = new Image();
         * img.src = 'disp.jpg';
         * effect.map = img;
         * effect.scale = {x: 0.4};
         */
        return {
            vertex: {
                attribute: {
                    a_displacementMapTexCoord: 'vec2'
                },
                main: `
    v_displacementMapTexCoord = a_displacementMapTexCoord;`
            },
            fragment: {
                uniform: {
                    u_displacementEnabled: 'bool',
                    u_dispMap: 'sampler2D',
                    u_dispScale: 'vec2'
                },
                source: `
    if (u_displacementEnabled) {
        vec3 dispMap = texture2D(u_dispMap, v_displacementMapTexCoord).rgb - 0.5;
        vec2 dispVec = vec2(v_texCoord.x + u_dispScale.x * dispMap.r, v_texCoord.y + u_dispScale.y * dispMap.g);
        sourceCoord = clamp(dispVec, 0.0, 1.0);
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                return this.uniforms[0].data[0] = +!b;
            },
            get scale () {
                const [x, y] = this.uniforms[2].data;
                return {x, y};
            },
            set scale ({x, y}) {
                if (typeof x !== 'undefined')
                    this.uniforms[2].data[0] = x;
                if (typeof y !== 'undefined')
                    this.uniforms[2].data[1] = y;
            },
            get map () {
                return this.textures[0].image;
            },
            set map (img) {
                this.textures[0].image = img;
            },
            varying: {
                v_displacementMapTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_displacementEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_dispMap',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_dispScale',
                    type: 'f',
                    data: [0.0, 0.0]
                }
            ],
            attributes: [
                {
                    name: 'a_displacementMapTexCoord',
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
                    format: 'RGB'
                }
            ]
        };
    }

    function fade () {
        return {
            vertex: {
                attribute: {
                    a_transitionToTexCoord: 'vec2'
                },
                main: `
    v_transitionToTexCoord = a_transitionToTexCoord;`
            },
            fragment: {
                uniform: {
                    u_transitionEnabled: 'bool',
                    u_transitionTo: 'sampler2D'
                },
                main: `
    if (u_transitionEnabled) {
        vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
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
            varying: {
                v_transitionToTexCoord: 'vec2'
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
                }
            ],
            textures: [
                {
                    format: 'RGBA',
                    update: true
                }
            ]
        };
    }

    function displacementTransition () {
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
        sourceCoord = clamp(v_texCoord + transDispVec * u_transitionProgress, 0.0, 1.0);
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
                if (typeof x !== 'undefined')
                    this.uniforms[4].data[0] = x;
                if (typeof y !== 'undefined')
                    this.uniforms[4].data[1] = y;
            },
            get toScale () {
                const [x, y] = this.uniforms[5].data;
                return {x, y};
            },
            set toScale ({x, y}) {
                if (typeof x !== 'undefined')
                    this.uniforms[5].data[0] = x;
                if (typeof y !== 'undefined')
                    this.uniforms[5].data[1] = y;
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
    }

    var core = {
        init,
        draw,
        destroy,
        resize,
        getWebGLContext,
        createTexture
    };

    const vertexTemplate = ({
        uniform = '',
        attribute = '',
        varying = '',
        constant = '',
        main = ''
    }) => `
precision mediump float;
${uniform}
${attribute}
attribute vec2 a_texCoord;
attribute vec2 a_position;
${varying}
varying vec2 v_texCoord;

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
${constant}
void main() {
    v_texCoord = a_texCoord;
    ${main}
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
}`;

    const fragmentTemplate = ({
        uniform = '',
        varying = '',
        constant = '',
        main = '',
        source = ''
    }) => `
precision mediump float;
${varying}
varying vec2 v_texCoord;
${uniform}
uniform sampler2D u_source;

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
${constant}
void main() {
    vec2 sourceCoord = v_texCoord;
    ${source}
    vec4 pixel = texture2D(u_source, sourceCoord);
    vec3 color = pixel.rgb;
    float alpha = pixel.a;
    ${main}
    gl_FragColor = vec4(color, 1.0) * alpha;
}`;

    /**
     * Initialize a compiled WebGLProgram for the given canvas and effects.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param effects
     * @param dimensions
     * @return {{gl: WebGLRenderingContext, data: kamposSceneData, [dimensions]: {width: number, height: number}}}
     */
    function init (gl, effects, dimensions) {

        const programData = _initProgram(gl, effects);

        return {gl, data: programData, dimensions: dimensions || {}};
    }

    /**
     * Get a webgl context for the given canvas element.
     *
     * @private
     * @param {HTMLCanvasElement} canvas
     * @return {WebGLRenderingContext}
     */
    function getWebGLContext (canvas) {
        let context;

        const config = {
            preserveDrawingBuffer: false, // should improve performance - https://stackoverflow.com/questions/27746091/preservedrawingbuffer-false-is-it-worth-the-effort
            antialias: false, // should improve performance
            depth: false, // turn off for explicitness - and in some cases perf boost
            stencil: false // turn off for explicitness - and in some cases perf boost
        };

        context = canvas.getContext('webgl', config);

        if ( ! context ) {
            context = canvas.getContext('experimental-webgl', config);
        }

        return context;
    }

    /**
     * Resize the target canvas.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {{width: number, height: number}} [dimensions]
     * @return {boolean}
     */
    function resize (gl, dimensions) {
        const canvas = gl.canvas;
        const realToCSSPixels = 1; //window.devicePixelRatio;
        const {width, height} = dimensions || {};
        let displayWidth, displayHeight;

        if ( width && height ) {
            displayWidth = width;
            displayHeight = height;
        }
        else {
            // Lookup the size the browser is displaying the canvas.
            displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
            displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
        }

        // Check if the canvas is not the same size.
        if ( canvas.width !== displayWidth ||
             canvas.height !== displayHeight ) {

            // Make the canvas the same size
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
        }

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    /**
     * Draw a given scene
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} media
     * @param {kamposSceneData} data
     * @param {{width: number, height: number}} dimensions
     */
    function draw (gl, media, data, dimensions) {
        const {program, source, attributes, uniforms, textures} = data;

        // bind the source texture
        gl.bindTexture(gl.TEXTURE_2D, source.texture);

        // read source data into texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // set attribute buffers with data
        _enableVertexAttributes(gl, attributes);

        // set uniforms with data
        _setUniforms(gl, uniforms);

        if ( textures ) {
            for ( let i = -1; i < textures.length; i++ ) {
                gl.activeTexture(gl.TEXTURE0 + (i + 1));

                if (i === -1) {
                    gl.bindTexture(gl.TEXTURE_2D, source.texture);
                }
                else {
                    const tex = textures[i];
                    gl.bindTexture(gl.TEXTURE_2D, tex.texture);

                    if (tex.update) {
                        gl.texImage2D(gl.TEXTURE_2D, 0,gl[tex.format], gl[tex.format], gl.UNSIGNED_BYTE, tex.image);
                    }
                }
            }
        }

        // Draw the rectangles
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Free all resources attached to a specific webgl context.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {kamposSceneData} data
     */
    function destroy (gl, data) {
        const {program, vertexShader, fragmentShader, source, attributes} = data;

        // delete buffers
        (attributes || []).forEach(attr => gl.deleteBuffer(attr.buffer));

        // delete texture
        gl.deleteTexture(source.texture);

        // delete program
        gl.deleteProgram(program);

        // delete shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }

    function _initProgram (gl, effects) {
        const source = {
            texture: createTexture(gl).texture,
            buffer: null
        };

        // flip Y axis for source texture
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const data = _mergeEffectsData(effects);
        const vertexSrc = _stringifyShaderSrc(data.vertex, vertexTemplate);
        const fragmentSrc = _stringifyShaderSrc(data.fragment, fragmentTemplate);

        // compile the GLSL program
        const {program, vertexShader, fragmentShader, error, type} = _getWebGLProgram(gl, vertexSrc, fragmentSrc);

        if ( error ) {
            throw new Error(`${type} error:: ${error}\n${fragmentSrc}`);
        }

        // setup the vertex data
        const attributes = _initVertexAttributes(gl, program, data.attributes);

        // setup uniforms
        const uniforms = _initUniforms(gl, program, data.uniforms);

        return {
            program,
            vertexShader,
            fragmentShader,
            source,
            attributes,
            uniforms,
            textures: data.textures
        };
    }

    function _mergeEffectsData (effects) {
        return effects.reduce((result, config) => {
            const {attributes = [], uniforms = [], textures = [], varying = {}} = config;
            const merge = shader => Object.keys(config[shader]).forEach(key => {
                if ( key === 'constant' || key === 'main' || key === 'source' ) {
                    result[shader][key] += config[shader][key] + '\n';
                }
                else {
                    result[shader][key] = {...result[shader][key], ...config[shader][key]};
                }
            });

            merge('vertex');
            merge('fragment');

            attributes.forEach(attribute => {
                const found = result.attributes.some((attr, n) => {
                    if ( attr.name === attribute.name ) {
                        Object.assign(attr, attribute);
                        return  true;
                    }
                });

                if ( ! found ) {
                    result.attributes.push(attribute);
                }
            });

            result.uniforms.push(...uniforms);
            result.textures.push(...textures);

            Object.assign(result.vertex.varying, varying);
            Object.assign(result.fragment.varying, varying);

            return result;
        }, {
            vertex: {
                uniform: {},
                attribute: {},
                varying: {},
                constant: '',
                main: ''
            },
            fragment: {
                uniform: {},
                varying: {},
                constant: '',
                main: '',
                source: ''
            },
            /*
             * Default attributes
             */
            attributes: [
                {
                    name: 'a_position',
                    data: new Float32Array([
                        -1.0, -1.0,
                        -1.0, 1.0,
                        1.0, -1.0,
                        1.0, 1.0]),
                    size: 2,
                    type: 'FLOAT'
                },
                {
                    name: 'a_texCoord',
                    data: new Float32Array([
                        0.0, 0.0,
                        0.0, 1.0,
                        1.0, 0.0,
                        1.0, 1.0]),
                    size: 2,
                    type: 'FLOAT'
                }
            ],
            /*
             * Default uniforms
             */
            uniforms: [
                {
                    name: 'u_source',
                    type: 'i',
                    data: [0]
                }
            ],
            /*
             * Default textures
             */
            textures: []
        });
    }

    function _stringifyShaderSrc (data, template) {
        const templateData = Object.entries(data)
            .reduce((result, [key, value]) => {
                if ( ['uniform', 'attribute', 'varying'].includes(key) ) {
                    result[key] = Object.entries(value)
                        .reduce((str, [name, type]) =>
                            str + `${key} ${type} ${name};\n`,
                            ''
                        );
                }
                else {
                    result[key] = value;
                }

                return result;
            }, {});

        return template(templateData);
    }

    function _getWebGLProgram (gl, vertexSrc, fragmentSrc) {
        const vertexShader = _createShader(gl, gl.VERTEX_SHADER, vertexSrc);
        const fragmentShader = _createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

        if ( vertexShader.error ) {
            return vertexShader;
        }

        if ( fragmentShader.error ) {
            return fragmentShader;
        }

        return _createProgram(gl, vertexShader, fragmentShader);
    }

    function _createProgram (gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if ( success ) {
            return {program, vertexShader, fragmentShader};
        }

        const exception = {
            error: gl.getProgramInfoLog(program),
            type: 'program'
        };

        gl.deleteProgram(program);

        return exception;
    }

    function _createShader (gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if ( success ) {
            return shader;
        }

        const exception = {
            error: gl.getShaderInfoLog(shader),
            type: type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'
        };

        gl.deleteShader(shader);

        return exception;
    }

    /**
     * Create a WebGLTexture object.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {number} width
     * @param {number} height
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} data
     * @param {string} format
     * @return {{texture: WebGLTexture, width: number, height: number}}
     */
    function createTexture (gl, {width=1, height=1, data=null, format='RGBA'}={}) {
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the parameters so we can render any size image
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        if ( data ) {
            // Upload the image into the texture
            gl.texImage2D(gl.TEXTURE_2D, 0,gl[format], gl[format], gl.UNSIGNED_BYTE, data);
        }
        else {
            // Create empty texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[format], gl.UNSIGNED_BYTE, null);
        }

        return {texture, width, height, format};
    }

    function _createBuffer (gl, program, name, data) {
        const location = gl.getAttribLocation(program, name);
        const buffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        return {location, buffer};
    }

    function _initVertexAttributes (gl, program, data) {
        return (data || []).map(attr => {
            const {location, buffer} = _createBuffer(gl, program, attr.name, attr.data);

            return {
                name: attr.name,
                location,
                buffer,
                type: attr.type,
                size: attr.size
            };
        });
    }

    function _initUniforms (gl, program, uniforms) {
        return (uniforms || []).map(uniform => {
            const location = gl.getUniformLocation(program, uniform.name);

            return {
                location,
                size: uniform.size || uniform.data.length,
                type: uniform.type,
                data: uniform.data
            };
        });
    }

    function _setUniforms (gl, uniformData) {
        (uniformData || []).forEach(uniform => {
            const {size, type, location, data} = uniform;

            gl[`uniform${size}${type}v`](location, data);
        });
    }

    function _enableVertexAttributes (gl, attributes) {
        (attributes || []).forEach(attrib => {
            const {location, buffer, size, type} = attrib;

            gl.enableVertexAttribArray(location);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(location, size, gl[type], false, 0, 0);
        });
    }

    /**
     * @private
     * @typedef {Object} kamposSceneData
     * @property {WebGLProgram} program
     * @property {WebGLShader} vertexShader
     * @property {WebGLShader} fragmentShader
     * @property {kamposTarget} source
     * @property {kamposAttribute[]} attributes
     *
     * @typedef {Object} kamposTarget
     * @property {WebGLTexture} texture
     * @property {WebGLFramebuffer|null} buffer
     * @property {number} [width]
     * @property {number} [height]
     *
     * @typedef {Object} kamposAttribute
     * @property {string} name
     * @property {GLint} location
     * @property {WebGLBuffer} buffer
     * @property {string} type
       @property {number} size
     */

    /**
     * Initialize a ticker instance for batching animation of multiple Kampos instances.
     *
     * @class Ticker
     */
    class Ticker {
        constructor () {
            this.pool = [];
        }

        /**
         * Starts the animation loop.
         */
        start () {
            if ( ! this.animationFrameId ) {
                const loop = () => {
                    this.animationFrameId = window.requestAnimationFrame(loop);
                    this.draw();
                };

                this.animationFrameId = window.requestAnimationFrame(loop);
            }
        }

        /**
         * Stops the animation loop.
         */
        stop () {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        /**
         * Invoke draw() on all instances in the pool.
         */
        draw () {
            this.pool.forEach(instance => instance.draw());
        }

        /**
         * Add an instance to the pool.
         *
         * @param {Kampos} instance
         */
        add (instance) {
            const index = this.pool.indexOf(instance);

            if ( ! ~ index ) {
                this.pool.push(instance);
                instance.playing = true;
            }
        }

        /**
         * Remove an instance form the pool.
         *
         * @param {Kampos} instance
         */
        remove (instance) {
            const index = this.pool.indexOf(instance);

            if ( ~ index ) {
                this.pool.splice(index, 1);
                instance.playing = false;
            }
        }
    }

    /**
     * Initialize a webgl target with effects.
     *
     * @class Kampos
     * @param {kamposConfig} config
     */
    class Kampos {
        /**
         * @constructor
         */
        constructor (config) {
            this.init(config);

            this._restoreContext = (e) => {
                e && e.preventDefault();
                this.config.target.removeEventListener('webglcontextrestored', this._restoreContext, true);

                this.init();

                if ( this._source ) {
                    this.setSource(this._source);
                }

                delete this._source;

                if (config && config.onContextRestored) {
                    config.onContextRestored.call(this, config);
                }
            };

            this._loseContext = (e) => {
                e.preventDefault();

                if (this.gl && this.gl.isContextLost()) {

                    this.lostContext = true;

                    this.config.target.addEventListener('webglcontextrestored', this._restoreContext, true);

                    this.destroy(true);

                    if (config && config.onContextLost) {
                        config.onContextLost.call(this, config);
                    }
                }
            };

            this.config.target.addEventListener('webglcontextlost', this._loseContext, true);
        }

        /**
         * Initializes an Kampos instance.
         * This is called inside the constructor,
         * but can be called again after effects have changed
         * or after {@link Kampos#desotry()}.
         *
         * @param {kamposConfig} [config] defaults to `this.config`
         */
        init (config) {
            config = config || this.config;
            let {target, effects, ticker} = config;

            this.lostContext = false;

            let gl = core.getWebGLContext(target);

            if (gl.isContextLost()) {
                this.restoreContext();
                // get new context from the fresh clone
                gl = core.getWebGLContext(this.config.target);
            }

            const {data} = core.init(gl, effects, this.dimensions);

            this.gl = gl;
            this.data = data;

            // cache for restoring context
            this.config = config;

            if ( ticker ) {
                this.ticker = ticker;
                ticker.add(this);
            }
        }

        /**
         * Set the source config.
         *
         * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap|kamposSource} source
         */
        setSource (source) {
            if ( ! source ) return;

            if ( this.lostContext ) {
                this.restoreContext();
            }

            let media, width, height;

            if ( Object.prototype.toString.call(source) === '[object Object]' ) {
                ({media, width, height} = source);
            }
            else {
                media = source;
            }

            if ( width && height ) {
                this.dimensions = { width, height };
            }

            // resize the target canvas if needed
            core.resize(this.gl, this.dimensions);

            this._createTextures();

            this.media = media;
        }

        /**
         * Draw current scene.
         */
        draw () {
            if ( this.lostContext ) {
                this.restoreContext();
            }

            core.draw(this.gl, this.media, this.data, this.dimensions);
        }

        /**
         * Starts the animation loop.
         *
         * If using a {@see Ticker} this instance will be added to that {@see Ticker}.
         */
        play () {
            if ( this.ticker ) {
                if ( this.animationFrameId ) {
                    this.stop();
                }

                if ( ! this.playing ) {
                    this.playing = true;
                    this.ticker.add(this);
                }
            }
            else if ( ! this.animationFrameId ) {
                const loop = () => {
                    this.animationFrameId = window.requestAnimationFrame(loop);
                    this.draw();
                };

                this.animationFrameId = window.requestAnimationFrame(loop);
            }

        }

        /**
         * Stops the animation loop.
         *
         * If using a {@see Ticker} this instance will be removed from that {@see Ticker}.
         */
        stop () {
            if ( this.animationFrameId ) {
                window.cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            if ( this.playing ) {
                this.playing = false;
                this.ticker.remove(this);
            }
        }

        /**
         * Stops animation loop and frees all resources.
         *
         * @param {boolean} keepState  for internal use.
         */
        destroy (keepState) {
            this.stop();

            if ( this.gl && this.data ) {
                core.destroy(this.gl, this.data);
            }

            if ( keepState ) {
                const dims = this.dimensions || {};

                this._source = this._source || {
                    media: this.media,
                    width: dims.width,
                    height: dims.height
                };
            }
            else {
                this.config.target.removeEventListener('webglcontextlost', this._loseContext, true);

                this.config = null;
                this.dimensions = null;

            }

            this.gl = null;
            this.data = null;
            this.media = null;
        }

        /**
         * Restore a lost WebGL context fot the given target.
         * This will replace canvas DOM element with a fresh clone.
         */
        restoreContext () {
            const canvas = this.config.target;
            const clone = this.config.target.cloneNode(true);
            const parent = canvas.parentNode;

            if ( parent ) {
                parent.replaceChild(clone, canvas);
            }

            this.config.target = clone;

            canvas.removeEventListener('webglcontextlost', this._loseContext, true);
            canvas.removeEventListener('webglcontextrestored', this._restoreContext, true);
            clone.addEventListener('webglcontextlost', this._loseContext, true);

            if (this.lostContext) {
                this._restoreContext();
            }
        }

        _createTextures () {
            this.data && this.data.textures.forEach((texture, i) => {
                const data = this.data.textures[i];
                data.texture = core.createTexture(this.gl, {
                    width: this.dimensions.width,
                    height: this.dimensions.height,
                    format: texture.format,
                    data: texture.image
                }).texture;

                data.format = texture.format;
                data.update = texture.update;
            });
        }
    }

    var index = {
        effects: {
            alphaMask,
            brightnessContrast,
            hueSaturation,
            duotone,
            displacement
        },
        transitions: {
            fade,
            displacement: displacementTransition
        },
        Kampos,
        Ticker
    };

    return index;

}));
