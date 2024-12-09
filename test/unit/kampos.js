import { expect, test } from 'vitest';
import { Kampos, Ticker, effects } from '../../index.js';
// import { WebGLRenderingContext } from 'gl/src/javascript/webgl-rendering-context.js';
import { createCanvas, Image } from 'node-canvas-webgl';

const brightnessContrast = effects.brightnessContrast();

test('kampos :: new Kampos() :: should instantiate a Kampos instance with a target canvas', () => {
    const canvas = createCanvas(300, 150);
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });

    expect(instance).toBeTruthy();
    // expect(instance.gl instanceof WebGLRenderingContext).toBe(true);
    expect(instance.data).toBeTruthy();

    instance.destroy();
});

test.skip('kampos :: Kampos webglcontextlost :: should destroy the instance on webglcontextlost event', () => {
    expect.assertions(2);
    const canvas = createCanvas(300, 150);
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });
    let calledTimes = 0;

    expect(instance).toBeTruthy();

    const _des = instance.destroy.bind(instance);

    instance.destroy = function () {
        calledTimes += 1;
        _des();
        expect(calledTimes).toBe(1);
    };

    instance.gl.getExtension('WEBGL_lose_context').loseContext();
});

test.skip('kampos :: Kampos webglcontextlost :: should restore the context and resources after webglcontextlost event and call to setSource', () => {
    expect.assertions(2);
    const canvas = createCanvas(300, 150);
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });

    expect(instance).toBeTruthy();

    instance.gl.getExtension('WEBGL_lose_context').loseContext();

    setTimeout(() => {
        instance.setSource({ type: 'video' });
        expect(instance).toBeTruthy();
    }, 0);
});

test.skip("should NOT trigger webglcontextlost event if destroy()'ed", () => {
    expect.assertions(3);

    const canvas = createCanvas(300, 150);
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });
    let calledTimes = 0;

    expect(instance).toBeTruthy();

    const ext = instance.gl.getExtension('WEBGL_lose_context');

    instance.destroy();

    const _des = instance.destroy.bind(instance);

    instance.destroy = function () {
        calledTimes += 1;
        _des();
        // TODO: ?? chceck if this is correct
        expect(calledTimes).toBe(0);
    };

    ext.loseContext();

    setTimeout(() => {
        expect(calledTimes).toBe(0);
    }, 10);
});

test.skip('kampos :: Kampos webglcontextrestored ::  should restore a destroyed instance on webglcontextrestored event', () => {
    const canvas = createCanvas(300, 150);
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });
    let calledTimes = 0;

    expect(instance).toBeTruthy();

    const _des = instance.destroy.bind(instance);
    const _ini = instance.init.bind(instance);
    const gl = instance.gl;
    const ext = gl.getExtension('WEBGL_lose_context');

    instance.destroy = function (arg) {
        calledTimes += 1;
        _des(arg);
        expect(calledTimes).toBe(1);
    };

    instance.init = function (arg) {
        calledTimes += 1;
        _ini(arg);
        expect(calledTimes).toBe(2);

        // check we restored instance' state
        expect(instance).toBeTruthy();
        // expect(instance.gl instanceof WebGLRenderingContext).toBe(true);
        expect(instance.data).toBeTruthy();
    };

    ext.loseContext();
    setTimeout(() => ext.restoreContext(), 10);
});

test('kampos :: Kampos#setSource :: should set media to given Image and start animation loop', () => {
    const canvas = createCanvas(300, 150);
    const image = new Image();
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });

    expect(instance).toBeTruthy();
    // expect(instance.gl instanceof WebGLRenderingContext).toBe(true);
    expect(instance.data).toBeTruthy();

    instance.setSource({ media: image });
    expect(instance.media instanceof Image).toBe(true);

    instance.destroy();
});

test('kampos :: Kampos#play :: should start animation loop', () => {
    global.window = {
        requestAnimationFrame(callback) {
            return 1;
        },
    };

    const canvas = createCanvas(300, 150);
    const image = new Image();
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
    });

    expect(instance).toBeTruthy();
    // expect(instance.gl instanceof WebGLRenderingContext).toBe(true);
    expect(instance.data).toBeTruthy();

    instance.setSource({ media: image });
    expect(instance.media instanceof Image).toBe(true);

    instance.play();

    expect(instance.animationFrameId).toBeTruthy();
});

test('kampos :: Kampos#play :: should start animation loop with a ticker', () => {
    global.window = {
        requestAnimationFrame(callback) {
            return 1;
        },
    };

    const canvas = createCanvas(300, 150);
    const image = new Image();
    const ticker = new Ticker();
    const instance = new Kampos({
        target: canvas,
        effects: [brightnessContrast],
        ticker,
    });

    expect(instance).toBeTruthy();
    // expect(instance.gl instanceof WebGLRenderingContext).toBe(true);
    expect(instance.data).toBeTruthy();

    instance.setSource({ media: image });
    expect(instance.media instanceof Image).toBe(true);

    instance.play();

    expect(!instance.animationFrameId).toBeTruthy();
    expect(instance.playing).toBe(true);

    expect(instance.ticker).toBe(ticker);
    expect(ticker.pool[0]).toBe(instance);

    instance.destroy();
});
//
//     describe('Kampos#stop', function () {
//         let canvas, instance, video;
//
//         beforeEach(function () {
//             canvas = document.createElement('canvas');
//             video = document.createElement('video');
//         });
//
//         it('should stop a started animation loop', function () {
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource(video);
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             assert(instance.animationFrameId);
//
//             instance.stop();
//
//             assert(!instance.animationFrameId);
//         });
//
//         it('should stop a started animation loop with a ticker', function () {
//             const ticker = new Ticker();
//             instance = new Kampos({target: canvas, effects: [brightnessContrast], ticker});
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource({media: video});
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             assert(!instance.animationFrameId);
//
//             assert.strictEqual(instance.ticker, ticker);
//             assert.strictEqual(ticker.pool[0], instance);
//
//             instance.stop();
//
//             assert.strictEqual(ticker.pool.length, 0);
//             assert.strictEqual(instance.playing, false);
//             assert(!instance.animationFrameId);
//         });
//
//         afterEach(function () {
//             instance.destroy();
//             canvas = null;
//             video = null;
//         });
//     });
//
//     describe('Kampos#destroy', function () {
//         let canvas, instance, video;
//
//         beforeEach(function () {
//             canvas = document.createElement('canvas');
//             video = document.createElement('video');
//         });
//
//         it('should stop a started animation loop', function () {
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//             const stop = instance.stop;
//             let stopCalls = 0;
//
//             instance.stop = () => {
//                 stopCalls++;
//                 stop.call(instance);
//             }
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource(video);
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             assert(instance.animationFrameId);
//
//             instance.destroy();
//
//             assert(stopCalls === 1);
//         });
//
//         it('keepState=false :: should delete all cached objects on the instance', function () {
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource(video);
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             assert(instance.animationFrameId);
//
//             instance.destroy(false);
//
//             assert(instance._source == null);
//             assert(instance.dimensions === null);
//             assert(instance.data === null);
//             assert(instance.config === null);
//             assert(instance.gl === null);
//             assert(instance.media === null);
//         });
//
//         it('keepState=true :: should delete all BUT keep _source, dimensions, & config', function () {
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//             const config = instance.config;
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource({media: video, width: 640, height: 480});
//             assert(instance.media instanceof HTMLVideoElement);
//
//             const dimensions = instance.dimensions;
//
//             instance.play();
//
//             assert(instance.animationFrameId);
//
//             instance.destroy(true);
//
//             assert(instance.data === null);
//             assert(instance.gl === null);
//             assert(instance.media === null);
//             assert(instance.config === config);
//             assert(instance.dimensions === dimensions);
//             assert(instance._source.media);
//             assert(instance._source.width);
//             assert(instance._source.height);
//         });
//
//         it('should not throw if called more than once', function () {
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//             const config = instance.config;
//             const dimensions = instance.dimensions;
//
//             assert(instance);
//             assert(instance.gl instanceof WebGLRenderingContext);
//             assert(instance.data);
//
//             instance.setSource(video);
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             assert(instance.animationFrameId);
//
//             instance.destroy(false);
//             instance.destroy(false);
//         });
//
//         afterEach(function () {
//             canvas = null;
//             video = null;
//         });
//     });
//
//     describe('Kampos#restoreContext', function () {
//         let canvas, instance, video;
//
//         beforeEach(function () {
//             canvas = document.createElement('canvas');
//             video = document.createElement('video');
//
//             instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//         });
//
//         it('should restore a lost context', function (done) {
//             const gl = instance.gl;
//             const ext = gl.getExtension('WEBGL_lose_context');
//             const origSetSource = instance.setSource;
//             let calledTimes = 0;
//
//             instance.setSource(video);
//             assert(instance.media instanceof HTMLVideoElement);
//
//             instance.play();
//
//             ext.loseContext();
//
//             instance.setSource = function (...args) {
//                 assert(instance.media === null);
//
//                 calledTimes += 1;
//                 assert.strictEqual(calledTimes, 1);
//
//                 origSetSource.call(this, ...args);
//
//                 // check we restored instance' state
//                 assert(instance);
//                 assert(instance.gl instanceof WebGLRenderingContext);
//                 assert(instance.data);
//                 assert(instance.media === video);
//
//                 done();
//             };
//
//             setTimeout(() => instance.restoreContext(), 10);
//         });
//
//         afterEach(function () {
//             instance.destroy();
//             canvas = null;
//             video = null;
//         });
//     });
//
//     describe('Kampos#_contextCreationError', function () {
//         let canvas, video;
//
//         beforeEach(function () {
//             canvas = {
//                 getContext() {
//                     return null;
//                 },
//                 addEventListener() {}
//             };
//             video = document.createElement('video');
//         });
//
//         it('should bail out when getContext() fails', function () {
//             assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
//         });
//
//         it('should bail out when preventContextCreation is true', function () {
//             canvas = document.createElement('canvas');
//
//             Kampos.preventContextCreation = true;
//
//             assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
//         });
//
//         it('should bail out after context creation error event was fired', function () {
//             canvas = document.createElement('canvas');
//
//             const instance = new Kampos({target: canvas, effects: [brightnessContrast]});
//
//             instance._contextCreationError();
//
//             assert.throws(() => new Kampos({target: canvas, effects: [brightnessContrast]}));
//         });
//
//         afterEach(function () {
//             Kampos.preventContextCreation = false;
//             canvas = null;
//             video = null;
//         });
//     });
// });
