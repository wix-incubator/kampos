import core from './core';

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
export default class Kampos {
    /**
     * @constructor
     */
    constructor (config) {
        if ( ! config || ! config.target ) {
            throw new Error('A target canvas was not provided');
        }

        if ( Kampos.preventContextCreation )
            throw new Error('Context creation is prevented');

        this._contextCreationError = function () {
            Kampos.preventContextCreation = true;

            if ( config && config.onContextCreationError ) {
                config.onContextCreationError.call(this, config);
            }
        };

        config.target.addEventListener('webglcontextcreationerror', this._contextCreationError, false);

        const success = this.init(config);

        if ( ! success )
            throw new Error('Could not create context');

        this._restoreContext = (e) => {
            e && e.preventDefault();

            this.config.target.removeEventListener('webglcontextrestored', this._restoreContext, true);

            const success = this.init();

            if ( ! success )
                return false;

            if ( this._source ) {
                this.setSource(this._source);
            }

            delete this._source;

            if ( config && config.onContextRestored ) {
                config.onContextRestored.call(this, config);
            }

            return true;
        };

        this._loseContext = (e) => {
            e.preventDefault();

            if ( this.gl && this.gl.isContextLost() ) {

                this.lostContext = true;

                this.config.target.addEventListener('webglcontextrestored', this._restoreContext, true);

                this.destroy(true);

                if ( config && config.onContextLost ) {
                    config.onContextLost.call(this, config);
                }
            }
        };

        this.config.target.addEventListener('webglcontextlost', this._loseContext, true);
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
    init (config) {
        config = config || this.config;
        let {target, effects, ticker} = config;

        if ( Kampos.preventContextCreation )
            return false;

        this.lostContext = false;

        let gl = core.getWebGLContext(target);

        if ( ! gl )
            return false;

        if ( gl.isContextLost() ) {
            const success = this.restoreContext();

            if ( ! success )
                return false;

            // get new context from the fresh clone
            gl = core.getWebGLContext(this.config.target);

            if ( ! gl )
                return false;
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

        return true;
    }

    /**
     * Set the source config.
     *
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap|kamposSource} source
     * @example
     * const media = document.querySelector('#video');
     * kampos.setSource(media);
     */
    setSource (source) {
        if ( ! source ) return;

        if ( this.lostContext ) {
            const success = this.restoreContext();

            if ( ! success ) return;
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
            const success = this.restoreContext();

            if ( ! success ) return;
        }

        core.draw(this.gl, this.media, this.data, this.dimensions);
    }

    /**
     * Starts the animation loop.
     *
     * If a {@link Ticker} is used, this instance will be added to that {@link Ticker}.
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
     * If a {@link Ticker} is used, this instance will be removed from that {@link Ticker}.
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
     * Stops the animation loop and frees all resources.
     *
     * @param {boolean} keepState for internal use.
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
            this.config.target.removeEventListener('webglcontextcreationerror', this._contextCreationError, false);

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
    restoreContext () {
        if ( Kampos.preventContextCreation )
            return false;

        const canvas = this.config.target;
        const clone = this.config.target.cloneNode(true);
        const parent = canvas.parentNode;

        if ( parent ) {
            parent.replaceChild(clone, canvas);
        }

        this.config.target = clone;

        canvas.removeEventListener('webglcontextlost', this._loseContext, true);
        canvas.removeEventListener('webglcontextrestored', this._restoreContext, true);
        canvas.removeEventListener('webglcontextcreationerror', this._contextCreationError, false);
        clone.addEventListener('webglcontextlost', this._loseContext, true);
        clone.addEventListener('webglcontextcreationerror', this._contextCreationError, false);

        if ( this.lostContext ) {
            return this._restoreContext();
        }

        return true;
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

/**
 * @typedef {Object} kamposConfig
 * @property {HTMLCanvasElement} target
 * @property {effectConfig[]} effects
 * @property {Ticker} [ticker]
 * @property {function} [onContextLost]
 * @property {function} [onContextRestored]
 * @property {function} [onContextCreationError]
 */

/**
 * @typedef {Object} kamposSource
 * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} media
 * @property {number} width
 * @property {number} height
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
 * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} [image]
 * @property {boolean} [update] defaults to `false`
 */

/**
 * @typedef {Object} Attribute
 * @property {string} name
 * @property {number} size
 * @property {string} type
 * @property {ArrayBufferView} data
 */

/**
 * @typedef {Object} Uniform
 * @property {string} name
 * @property {number} [size] defaults to `data.length`
 * @property {string} type
 * @property {Array} data
 */
