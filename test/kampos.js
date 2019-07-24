const {Kampos, Ticker} = require('./src/kampos');
const brightnessContrast = require('./src/brightness-contrast')();
const assert = require('assert');

describe('kampos', function() {
    describe('new Kampos()', function () {
        let canvas, instance;

        beforeEach(function () {
            canvas = document.createElement('canvas');

            instance = new Kampos({target: canvas, effects: [brightnessContrast]});
        });

        it('should instantiate a Kampos instance with a target canvas', function () {
            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);
        });

        afterEach(function () {
            instance.destroy();
            canvas = null;
        });
    });

    describe('Kampos webglcontextlost', function () {
        it('should destroy the instance on webglcontextlost event', function (done) {
            const canvas = document.createElement('canvas');

            const instance = new Kampos({target: canvas, effects: [brightnessContrast]});
            let calledTimes = 0;

            assert(instance);

            const _des = instance.destroy.bind(instance);

            instance.destroy = function () {
                calledTimes += 1;
                _des();
                assert.strictEqual(calledTimes, 1);
                done();
            };

            instance.gl.getExtension('WEBGL_lose_context').loseContext();
        });

        it('should restore the context and resources after webglcontextlost event and call to setSource', function (done) {
            const canvas = document.createElement('canvas');

            const instance = new Kampos({target: canvas, effects: [brightnessContrast]});

            assert(instance);

            instance.gl.getExtension('WEBGL_lose_context').loseContext();

            setTimeout(() => {
                instance.setSource({type: 'video'});
                done();
            }, 0);
        });

        it('should NOT trigger webglcontextlost event if destroy()\'ed', function (done) {
            const canvas = document.createElement('canvas');

            const instance = new Kampos({target: canvas, effects: [brightnessContrast]});
            let calledTimes = 0;

            assert(instance);

            const ext = instance.gl.getExtension('WEBGL_lose_context');

            instance.destroy();

            const _des = instance.destroy.bind(instance);

            instance.destroy = function () {
                calledTimes += 1;
                _des();
                assert.strictEqual(calledTimes, 0);
                done();
            };

            ext.loseContext();

            setTimeout(() => {
                assert.strictEqual(calledTimes, 0);
                done();
            }, 10);
        });
    });

    describe('Kampos webglcontextrestored', function () {
        it('should restore a destroyed instance on webglcontextrestored event', function (done) {
            const canvas = document.createElement('canvas');

            const instance = new Kampos({target: canvas, effects: [brightnessContrast]});
            let calledTimes = 0;

            assert(instance);

            const _des = instance.destroy.bind(instance);
            const _ini = instance.init.bind(instance);
            const gl = instance.gl;
            const ext = gl.getExtension('WEBGL_lose_context');

            instance.destroy = function (arg) {
                calledTimes += 1;
                _des(arg);
                assert.strictEqual(calledTimes, 1);
            };

            instance.init = function (arg) {
                calledTimes += 1;
                _ini(arg);
                assert.strictEqual(calledTimes, 2);

                // check we restored instance' state
                assert(instance);
                assert(instance.gl instanceof WebGLRenderingContext);
                assert(instance.data);

                done();
            };

            ext.loseContext();
            setTimeout(() => ext.restoreContext(), 10);
        });
    });

    describe('Kampos#setSource', function () {
        let canvas, instance, video;

        beforeEach(function () {
            canvas = document.createElement('canvas');
            video = document.createElement('video');

            instance = new Kampos({target: canvas, effects: [brightnessContrast]});
        });

        it('should set media to given HTMLVideoElement and start animation loop', function () {
            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource(video);
            assert(instance.media instanceof HTMLVideoElement);
        });

        it('should set media to given object with media:HTMLVideoElement', function () {
            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource({media: video});
            assert(instance.media instanceof HTMLVideoElement);
        });

        afterEach(function () {
            instance.destroy();
            canvas = null;
            video = null;
        });
    });

    describe('Kampos#play', function () {
        let canvas, instance, video;

        beforeEach(function () {
            canvas = document.createElement('canvas');
            video = document.createElement('video');
        });

        it('should start animation loop', function () {
            instance = new Kampos({target: canvas, effects: [brightnessContrast]});

            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource(video);
            assert(instance.media instanceof HTMLVideoElement);

            instance.play();

            assert(instance.animationFrameId);
        });

        it('should start animation loop with a ticker', function () {
            const ticker = new Ticker();
            instance = new Kampos({target: canvas, effects: [brightnessContrast], ticker});

            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource({media: video});
            assert(instance.media instanceof HTMLVideoElement);

            instance.play();

            assert(!instance.animationFrameId);
            assert.strictEqual(instance.playing, true);

            assert.strictEqual(instance.ticker, ticker);
            assert.strictEqual(ticker.pool[0], instance);
        });

        afterEach(function () {
            instance.destroy();
            canvas = null;
            video = null;
        });
    });

    describe('Kampos#stop', function () {
        let canvas, instance, video;

        beforeEach(function () {
            canvas = document.createElement('canvas');
            video = document.createElement('video');
        });

        it('should stop a started animation loop', function () {
            instance = new Kampos({target: canvas, effects: [brightnessContrast]});

            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource(video);
            assert(instance.media instanceof HTMLVideoElement);

            instance.play();

            assert(instance.animationFrameId);

            instance.stop();

            assert(!instance.animationFrameId);
        });

        it('should stop a started animation loop with a ticker', function () {
            const ticker = new Ticker();
            instance = new Kampos({target: canvas, effects: [brightnessContrast], ticker});

            assert(instance);
            assert(instance.gl instanceof WebGLRenderingContext);
            assert(instance.data);

            instance.setSource({media: video});
            assert(instance.media instanceof HTMLVideoElement);

            instance.play();

            assert(!instance.animationFrameId);

            assert.strictEqual(instance.ticker, ticker);
            assert.strictEqual(ticker.pool[0], instance);

            instance.stop();

            assert.strictEqual(ticker.pool.length, 0);
            assert.strictEqual(instance.playing, false);
            assert(!instance.animationFrameId);
        });

        afterEach(function () {
            instance.destroy();
            canvas = null;
            video = null;
        });
    });

    describe('Kampos#restoreContext', function () {
        let canvas, instance, video;

        beforeEach(function () {
            canvas = document.createElement('canvas');
            video = document.createElement('video');

            instance = new Kampos({target: canvas, effects: [brightnessContrast]});
        });

        it('should restore a lost context', function (done) {
            const gl = instance.gl;
            const ext = gl.getExtension('WEBGL_lose_context');
            const origSetSource = instance.setSource;
            let calledTimes = 0;

            instance.setSource(video);
            assert(instance.media instanceof HTMLVideoElement);

            instance.play();

            ext.loseContext();

            instance.setSource = function (...args) {
                assert(instance.media === null);

                calledTimes += 1;
                assert.strictEqual(calledTimes, 1);

                origSetSource.call(this, ...args);

                // check we restored instance' state
                assert(instance);
                assert(instance.gl instanceof WebGLRenderingContext);
                assert(instance.data);
                assert(instance.media === video);

                done();
            };

            setTimeout(() => instance.restoreContext(), 10);
        });

        afterEach(function () {
            instance.destroy();
            canvas = null;
            video = null;
        });
    });

    describe('Kampos#_contextCreationError', function () {
        let canvas, video;

        beforeEach(function () {
            canvas = {
                getContext() {
                    return null;
                },
                addEventListener() {}
            };
            video = document.createElement('video');
        });

        it('should bail out when getContext() fails', function () {
            assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
        });

        it('should bail out when preventContextCreation is true', function () {
            canvas = document.createElement('canvas');

            Kampos.preventContextCreation = true;

            assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
        });

        it('should bail out after context creation error event was fired', function () {
            canvas = document.createElement('canvas');

            const instance = new Kampos({target: canvas, effects: [brightnessContrast]});

            instance._contextCreationError();

            assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
        });

        afterEach(function () {
            Kampos.preventContextCreation = false;
            canvas = null;
            video = null;
        });
    });
});
