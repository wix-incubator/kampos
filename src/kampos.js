import * as core from './core.js';

/**
 * Initialize a WebGL target with effects.
 *
 * @class Kampos
 * @param {kamposConfig} config
 * @example
 * import { Kampos, effects} from 'kampos';
 *
 * const target = document.querySelector('#canvas');
 * const hueSat = effects.hueSaturation();
 * const kampos = new Kampos({target, effects: [hueSat]});
 */
export class Kampos {
    /**
     * @constructor
     */
    constructor(config) {
        if (!config || !config.target) {
            throw new Error('A target canvas was not provided');
        }

        if (Kampos.preventContextCreation)
            throw new Error('Context creation is prevented');

        this._contextCreationError = function () {
            Kampos.preventContextCreation = true;

            if (config && config.onContextCreationError) {
                config.onContextCreationError.call(this, config);
            }
        };

        config.target.addEventListener(
            'webglcontextcreationerror',
            this._contextCreationError,
            false,
        );

        const success = this.init(config);

        if (!success) throw new Error('Could not create context');

        this._restoreContext = (e) => {
            e && e.preventDefault();

            this.config.target.removeEventListener(
                'webglcontextrestored',
                this._restoreContext,
                true,
            );

            const success = this.init();

            if (!success) return false;

            if (this._source) {
                this.setSource(this._source);
            }

            delete this._source;

            if (config && config.onContextRestored) {
                config.onContextRestored.call(this, config);
            }

            return true;
        };

        this._loseContext = (e) => {
            e.preventDefault();

            if (this.gl && this.gl.isContextLost()) {
                this.lostContext = true;

                this.config.target.addEventListener(
                    'webglcontextrestored',
                    this._restoreContext,
                    true,
                );

                this.destroy(true);

                if (config && config.onContextLost) {
                    config.onContextLost.call(this, config);
                }
            }
        };

        this.config.target.addEventListener(
            'webglcontextlost',
            this._loseContext,
            true,
        );
    }

    /**
     * Initializes a Kampos instance.
     * This is called inside the constructor,
     * but can be called again after effects have changed
     * or after {@link Kampos#destroy}.
     *
     * @param {kamposConfig} [config] defaults to `this.config`
     * @return {boolean} success whether initializing of the context and program were successful
     */
    init(config) {
        config = config || this.config;
        let { target, plane, effects, ticker, noSource, fbo } = config;

        if (Kampos.preventContextCreation) return false;

        this.lostContext = false;

        let gl = core.getWebGLContext(target);

        if (!gl) return false;

        if (gl.isContextLost()) {
            const success = this.restoreContext();

            if (!success) return false;

            // get new context from the fresh clone
            gl = core.getWebGLContext(this.config.target);

            if (!gl) return false;
        }

        const { x: xSegments = 1, y: ySegments = 1 } =
            plane && plane.segments
                ? typeof plane.segments === 'object'
                    ? plane.segments
                    : { x: plane.segments, y: plane.segments }
                : {};
        this.plane = {
            xSegments,
            ySegments,
        };

        const { data, fboData } = core.init({
            gl,
            plane: this.plane,
            effects,
            dimensions: this.dimensions,
            noSource,
            fbo
        });

        this.gl = gl;
        this.data = data;
        this.fboData = fboData;

        // cache for restoring context
        this.config = config;

        if (ticker) {
            this.ticker = ticker;
            ticker.add(this);
        }

        return true;
    }

    /**
     * Set the source config.
     *
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap|kamposSource} source
     * @param {boolean} [skipTextureCreation] defaults to `false`
     * @example
     * const media = document.querySelector('#video');
     * kampos.setSource(media);
     */
    setSource(source, skipTextureCreation) {
        if (!source) return;

        if (this.lostContext) {
            const success = this.restoreContext();

            if (!success) return;
        }

        let media, width, height, shouldUpdate;

        if (Object.prototype.toString.call(source) === '[object Object]') {
            ({ media, width, height, shouldUpdate } = source);
        } else {
            media = source;
        }

        const isVideo = media instanceof HTMLVideoElement;
        const isCanvas = media instanceof HTMLCanvasElement;

        if (width && height) {
            this.dimensions = { width, height };
        }
        else if (isVideo) {
            this.dimensions = { width: media.videoWidth, height: media.videoHeight };
        }
        else if (media.naturalWidth) {
            this.dimensions = { width: media.naturalWidth, height: media.naturalHeight };
        }

        if (source && !this.data.source) {
            this.data.source = source;
        }

        if (typeof shouldUpdate === 'boolean') {
            this.data.source.shouldUpdate = shouldUpdate;
        }
        else {
            this.data.source.shouldUpdate = isVideo || isCanvas;
        }

        // resize the target canvas if needed
        core.resize(this.gl, this.dimensions);

        if (!skipTextureCreation) {
            this._createTextures();
        }

        this.media = media || this.media;

        this.data.source._sampled = false;
    }

    /**
     * Draw current scene.
     *
     * @param {number} [time]
     */
    draw(time) {
        if (this.lostContext) {
            const success = this.restoreContext();

            if (!success) return;
        }

        const cb = this.config.beforeDraw;

        if (cb && cb(time) === false) return;

        core.draw(this.gl, this.plane, this.media, this.data, this.fboData);

        if (this.config.afterDraw) {
            this.config.afterDraw(time);
        }
    }

    /**
     * Starts the animation loop.
     *
     * If a {@link Ticker} is used, this instance will be added to that {@link Ticker}.
     *
     * @param {function} [beforeDraw] function to run before each draw call
     * @param {function} [afterDraw] function to run after each draw call
     */
    play(beforeDraw, afterDraw) {
        if (typeof beforeDraw === 'function') {
            this.config.beforeDraw = beforeDraw;
        }
        if (typeof afterDraw === 'function') {
            this.config.afterDraw = afterDraw;
        }

        if (this.ticker) {
            if (this.animationFrameId) {
                this.stop();
            }

            if (!this.playing) {
                this.playing = true;
                this.ticker.add(this);
            }
        } else if (!this.animationFrameId) {
            const loop = (time) => {
                this.animationFrameId = window.requestAnimationFrame(loop);
                this.draw(time);
            };

            this.animationFrameId = window.requestAnimationFrame(loop);
        }
    }

    /**
     * Stops the animation loop.
     *
     * If a {@link Ticker} is used, this instance will be removed from that {@link Ticker}.
     */
    stop() {
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.playing) {
            this.playing = false;
            this.ticker.remove(this);
        }
    }

    /**
     * Stops the animation loop and frees all resources.
     *
     * @param {boolean} [keepState] for internal use.
     */
    destroy(keepState) {
        this.stop();

        if (this.gl && this.data) {
            core.destroy(this.gl, this.data);

            if (this.fboData) {
                core.destroy(this.gl, this.fboData);
            }
        }

        if (keepState) {
            const dims = this.dimensions || {};

            this._source = this._source || {
                media: this.media,
                width: dims.width,
                height: dims.height,
            };
        } else {
            if (this.config) {
                this.config.target.removeEventListener(
                    'webglcontextlost',
                    this._loseContext,
                    true,
                );
                this.config.target.removeEventListener(
                    'webglcontextcreationerror',
                    this._contextCreationError,
                    false,
                );
            }

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
     *
     * @return {boolean} success whether forcing a context restore was successful
     */
    restoreContext() {
        if (Kampos.preventContextCreation) return false;

        const canvas = this.config.target;
        const clone = this.config.target.cloneNode(true);
        const parent = canvas.parentNode;

        if (parent) {
            parent.replaceChild(clone, canvas);
        }

        this.config.target = clone;

        canvas.removeEventListener('webglcontextlost', this._loseContext, true);
        canvas.removeEventListener(
            'webglcontextrestored',
            this._restoreContext,
            true,
        );
        canvas.removeEventListener(
            'webglcontextcreationerror',
            this._contextCreationError,
            false,
        );
        clone.addEventListener('webglcontextlost', this._loseContext, true);
        clone.addEventListener(
            'webglcontextcreationerror',
            this._contextCreationError,
            false,
        );

        if (this.lostContext) {
            return this._restoreContext();
        }

        return true;
    }

    _createTextures() {
        this.data &&
            this.data.textures.forEach((texture, i) => {
                const data = this.data.textures[i];

                data.texture = core.createTexture(this.gl, {
                    width: this.dimensions.width,
                    height: this.dimensions.height,
                    format: texture.format,
                    data: texture.data,
                    wrap: texture.wrap,
                }).texture;

                data.format = texture.format;
                data.update = texture.update;
            });
    }
}

/**
 * @typedef {Object} kamposConfig
 * @property {HTMLCanvasElement} target
 * @property {effectConfig[]} effects
 * @property {planeConfig} plane
 * @property {Ticker} [ticker]
 * @property {boolean} [noSource]
 * @property {function} [beforeDraw] function to run before each draw call. If it returns `false` {@link kampos#draw} will not be called.
 * @property {function} [afterDraw] function to run after each draw call.
 * @property {function} [onContextLost]
 * @property {function} [onContextRestored]
 * @property {function} [onContextCreationError]
 */

/**
 * @typedef {Object} kamposSource
 * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} media
 * @property {number} width
 * @property {number} height
 * @property {boolean} [shouldUpdate] whether to resample the source on each draw call
 */

/**
 * @typedef {Object} effectConfig
 * @property {shaderConfig} vertex
 * @property {shaderConfig} fragment
 * @property {Attribute[]} attributes
 * @property {Uniform[]} uniforms
 * @property {Object} varying
 * @property {textureConfig[]} textures
 */

/**
 * @typedef {Object} planeConfig
 * @property {number|{x: number: y: number}} segments
 */

/**
 * @typedef {Object} shaderConfig
 * @property {string} [main]
 * @property {string} [source]
 * @property {string} [constant]
 * @property {Object} [uniform] mapping variable name to type
 * @property {Object} [attribute] mapping variable name to type
 */

/**
 * @typedef {Object} textureConfig
 * @property {string} format
 * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} [data]
 * @property {boolean} [update] defaults to `false`
 * @property {string|{x: string, y: string}} [wrap] with values `'stretch'|'repeat'|'mirror'`, defaults to `'stretch'`
 */

/**
 * @typedef {Object} Attribute
 * @property {string} extends name of another attribute to extend
 * @property {string} name name of attribute to use inside the shader
 * @property {number} size attribute size - number of elements to read on each iteration
 * @property {string} type
 * @property {ArrayBufferView} data
 */

/**
 * @typedef {Object} Uniform
 * @property {string} name name of the uniform to be used in the shader
 * @property {number} [size] defaults to `data.length`
 * @property {string} type
 * @property {Array} data
 */
