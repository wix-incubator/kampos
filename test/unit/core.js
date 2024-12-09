import { expect, test } from 'vitest';
import { createCanvas, Image } from 'node-canvas-webgl';
// import { WebGLProgram } from 'gl/src/javascript/webgl-program.js';
// import { WebGLShader } from 'gl/src/javascript/webgl-shader.js';
// import { WebGLTexture } from 'gl/src/javascript/webgl-texture.js';
import * as core from '../../src/core.js';
import { effects } from '../../index.js';

const brightnessContrast = effects.brightnessContrast();

test('core :: #getWebGLContext() :: should return a webgl context', () => {
    const canvas = createCanvas(200, 200);
    const context = core.getWebGLContext(canvas);

    expect(context).toBeTruthy();

    const attributes = context.getContextAttributes();

    expect(attributes.antialias).toBe(false);
    expect(attributes.preserveDrawingBuffer).toBe(false);
    expect(attributes.stencil).toBe(false);
    expect(attributes.depth).toBe(false);
});

test('core :: #init() :: should return an object with webgl context and scene data', () => {
    const canvas = createCanvas(200, 200);
    const { gl, data } = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });

    expect(gl).toBeTruthy();
    expect(data).toBeTruthy();

    core.destroy(gl, data);
});

test('core :: #init() :: should return scene data with complete WebGL program data', () => {
    const canvas = createCanvas(200, 200);
    const { gl, data } = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });

    expect(gl).toBeTruthy();
    expect(data).toBeTruthy();

    const {
        program,
        vertexShader,
        fragmentShader,
        source,
        attributes,
        uniforms,
    } = data;

    // expect(program instanceof WebGLProgram).toBe(true);
    // expect(vertexShader instanceof WebGLShader).toBe(true);
    // expect(fragmentShader instanceof WebGLShader).toBe(true);
    expect(source).toBeTruthy();
    // expect(source.texture instanceof WebGLTexture).toBe(true);
    expect(attributes).toBeTruthy();
    expect(uniforms).toBeTruthy();

    core.destroy(gl, data);
});

test('core :: #draw :: should draw blank image to the target canvas', () => {
    const image = new Image();
    const canvas = createCanvas(200, 200);
    const initData = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });
    const gl = initData.gl;
    const scene = initData.data;

    core.draw(gl, image, scene, {});

    core.destroy(gl, scene);
});

// This test tests DOM-specific behavior - should be run as an E2E test
test.skip('core :: #resize() :: should resize target canvas when its display dimensions change', () => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });
    const gl = initData.gl;
    const scene = initData.data;

    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(150);

    core.resize(gl);

    // default size of init texture is 1x1
    expect(gl.drawingBufferWidth).toBe(1);
    expect(gl.drawingBufferHeight).toBe(1);

    // detached from document
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);

    canvas.style.width = '250px';
    canvas.style.height = '250px';

    core.resize(gl);

    expect(canvas.width).toBe(250);
    expect(canvas.height).toBe(250);

    core.destroy(gl, scene);
});

test('core :: #resize() :: should resize target to supplied dimensions and ignore canvas CSS dimensions', () => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });
    const gl = initData.gl;
    const scene = initData.data;

    expect(canvas.height).toBe(150);

    core.resize(gl, { width: 850, height: 480 });

    expect(gl.drawingBufferWidth).toBe(850);
    expect(gl.drawingBufferHeight).toBe(480);

    core.destroy(gl, scene);
});

test('should resize target to supplied dimensions and ignore canvas CSS dimensions', () => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });
    const gl = initData.gl;
    const scene = initData.data;

    expect(canvas.height).toBe(150);

    core.resize(gl, { width: 850, height: 480 }, scene);

    expect(gl.drawingBufferWidth).toBe(850);
    expect(gl.drawingBufferHeight).toBe(480);

    //TODO: check that target texture in framebuffer is actually resized

    core.destroy(gl, scene);
});

test("core :: #destroy() :: dispose of all target canvas' resources", () => {
    const canvas = createCanvas(300, 150);
    const initData = core.init({
        gl: core.getWebGLContext(canvas),
        effects: [brightnessContrast],
    });
    const gl = initData.gl;
    const scene = initData.data;
    const { program, vertexShader, fragmentShader, source, attributes } = scene;

    expect(gl.isTexture(source.texture)).toBe(true);
    expect(gl.isBuffer(attributes[0].buffer)).toBe(true);
    expect(gl.isShader(vertexShader)).toBe(true);
    expect(gl.isShader(fragmentShader)).toBe(true);
    expect(gl.isProgram(program)).toBe(true);

    core.destroy(gl, scene);

    expect(gl.isTexture(source.texture)).toBe(false);
    expect(gl.isBuffer(attributes[0].buffer)).toBe(false);
    expect(gl.isShader(vertexShader)).toBe(false);
    expect(gl.isShader(fragmentShader)).toBe(false);
    expect(gl.isProgram(program)).toBe(false);
});
