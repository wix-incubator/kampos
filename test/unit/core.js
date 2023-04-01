import test from 'ava';
import { createCanvas, Image } from 'node-canvas-webgl';
import { WebGLProgram } from 'gl/src/javascript/webgl-program.js';
import { WebGLShader } from 'gl/src/javascript/webgl-shader.js';
import { WebGLTexture } from 'gl/src/javascript/webgl-texture.js';
import * as core from '../../src/core.js';
import { effects } from '../../src/index.js';

const brightnessContrast = effects.brightnessContrast();

test('core :: #getWebGLContext() :: should return a webgl context', t => {
    const canvas = createCanvas(200, 200);
    const context = core.getWebGLContext(canvas);

    t.truthy(context);

    const attributes = context.getContextAttributes();

    t.is(attributes.antialias, false);
    t.is(attributes.preserveDrawingBuffer, false);
    t.is(attributes.stencil, false);
    t.is(attributes.depth, false);
});

test('core :: #init() :: should return an object with webgl context and scene data', t => {
    const canvas = createCanvas(200, 200);
    const {gl, data} = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});

    t.truthy(gl);
    t.truthy(data);

    core.destroy(gl, data);
});

test('core :: #init() :: should return scene data with complete WebGL program data', t => {
    const canvas = createCanvas(200, 200);
    const {gl, data} = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});

    t.truthy(gl);
    t.truthy(data);

    const {
        program,
        vertexShader,
        fragmentShader,
        source,
        attributes,
        uniforms
    } = data;

    t.true(program instanceof WebGLProgram);
    t.true(vertexShader instanceof WebGLShader);
    t.true(fragmentShader instanceof WebGLShader);
    t.truthy(source);
    t.true(source.texture instanceof WebGLTexture);
    t.truthy(attributes);
    t.truthy(uniforms);

    core.destroy(gl, data);
});

test('core :: #draw :: should draw blank image to the target canvas', t => {
    const image = new Image();
    const canvas = createCanvas(200, 200);
    const initData = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});
    const gl = initData.gl;
    const scene = initData.data;

    core.draw(gl, image, scene, {});

    t.pass();

    core.destroy(gl, scene);
});

// This test tests DOM-specific behavior - should be run as an E2E test
test.skip('core :: #resize() :: should resize target canvas when its display dimensions change', t => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});
    const gl = initData.gl;
    const scene = initData.data;

    t.is(canvas.width, 300);
    t.is(canvas.height, 150);

    core.resize(gl);

    // default size of init texture is 1x1
    t.is(gl.drawingBufferWidth, 1);
    t.is(gl.drawingBufferHeight, 1);

    // detached from document
    t.is(canvas.width, 0);
    t.is(canvas.height, 0);

    canvas.style.width = '250px';
    canvas.style.height = '250px';

    core.resize(gl);

    t.is(canvas.width, 250);
    t.is(canvas.height, 250);

    core.destroy(gl, scene);
});

test('core :: #resize() :: should resize target to supplied dimensions and ignore canvas CSS dimensions', t => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});
    const gl = initData.gl;
    const scene = initData.data;

    t.is(canvas.height, 150);

    core.resize(gl, {width: 850, height: 480});

    t.is(gl.drawingBufferWidth, 850);
    t.is(gl.drawingBufferHeight, 480);

    core.destroy(gl, scene);
});

test('should resize target to supplied dimensions and ignore canvas CSS dimensions', t => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});
    const gl = initData.gl;
    const scene = initData.data;

    t.is(canvas.height, 150);

    core.resize(gl, {width: 850, height: 480}, scene);

    t.is(gl.drawingBufferWidth, 850);
    t.is(gl.drawingBufferHeight, 480);

    //TODO: check that target texture in framebuffer is actually resized

    core.destroy(gl, scene);
});

test('core :: #destroy() :: dispose of all target canvas\' resources', t => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({gl: core.getWebGLContext(canvas), effects: [brightnessContrast]});
    const gl = initData.gl;
    const scene = initData.data;
    const {
        program,
        vertexShader,
        fragmentShader,
        source,
        attributes,
    } = scene;

    t.is(gl.isTexture(source.texture), true);
    t.is(gl.isBuffer(attributes[0].buffer), true);
    t.is(gl.isShader(vertexShader), true);
    t.is(gl.isShader(fragmentShader), true);
    t.is(gl.isProgram(program), true);

    core.destroy(gl, scene);

    t.is(gl.isTexture(source.texture), false);
    t.is(gl.isBuffer(attributes[0].buffer), false);
    t.is(gl.isShader(vertexShader), false);
    t.is(gl.isShader(fragmentShader), false);
    t.is(gl.isProgram(program), false);
});
