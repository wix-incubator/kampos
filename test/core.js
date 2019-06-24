const core = require('./src/core');
const brightnessContrast = require('./src/brightness-contrast')();
const assert = require('assert');

describe('core', function() {
    describe('#getWebGLContext()', function() {
        it('should return a webgl context', function() {
            const canvas = document.createElement('canvas');
            const context = core.getWebGLContext(canvas);

            assert(context);

            const attributes = context.getContextAttributes();

            assert.strictEqual(attributes.antialias, false);
            assert.strictEqual(attributes.preserveDrawingBuffer, false);
            assert.strictEqual(attributes.stencil, false);
            assert.strictEqual(attributes.depth, false);
        });
    });

    describe('#init()', function() {
        it('should return an object with webgl context and scene data', function() {
            const canvas = document.createElement('canvas');
            const {gl, data} = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            assert(gl);
            assert(data);

            core.destroy(gl, data);
        });

        it('should return scene data with complete WebGL program data', function() {
            const canvas = document.createElement('canvas');
            const {gl, data} = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            assert(gl);
            assert(data);

            const {
                program,
                vertexShader,
                fragmentShader,
                source,
                attributes,
                uniforms
            } = data;

            assert(program instanceof WebGLProgram);
            assert(vertexShader instanceof WebGLShader);
            assert(fragmentShader instanceof WebGLShader);
            assert(source);
            assert(source.texture instanceof WebGLTexture);
            assert(attributes);
            assert(uniforms);

            core.destroy(gl, data);
        });
    });

    describe('#draw()', function () {
        let canvas, video, scene, gl;

        beforeEach(function () {
            video = document.createElement('video');
            canvas = document.createElement('canvas');

            const initData = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            gl = initData.gl;
            scene = initData.data;
        });

        it('should draw blank video to the target canvas', function () {
            core.draw(gl, video, scene);
        });

        afterEach(function () {
            core.destroy(gl, scene);
        });
    });

    describe('#resize()', function () {
        let canvas, scene, gl;

        beforeEach(function () {
            canvas = document.createElement('canvas');

            const initData = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            gl = initData.gl;
            scene = initData.data;
        });

        it('should resize target canvas when its display dimensions change', function () {
            assert.strictEqual(canvas.width, 300);
            assert.strictEqual(canvas.height, 150);

            core.resize(gl);

            // default size of init texture is 1x1
            assert.strictEqual(gl.drawingBufferWidth, 1);
            assert.strictEqual(gl.drawingBufferHeight, 1);

            // detached from document
            assert.strictEqual(canvas.width, 0);
            assert.strictEqual(canvas.height, 0);

            document.body.appendChild(canvas);
            canvas.style.width = '250px';
            canvas.style.height = '250px';

            core.resize(gl);

            assert.strictEqual(canvas.width, 250);
            assert.strictEqual(canvas.height, 250);
        });

        it('should resize target to supplied dimensions and ignore canvas CSS dimensions', function () {
            assert.strictEqual(canvas.height, 150);

            core.resize(gl, {width: 850, height: 480});

            assert.strictEqual(gl.drawingBufferWidth, 850);
            assert.strictEqual(gl.drawingBufferHeight, 480);
        });

        it('should resize target to supplied dimensions and ignore canvas CSS dimensions', function () {
            core.destroy(gl, scene);
            const initData2fx = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            gl = initData2fx.gl;
            scene = initData2fx.data;

            assert.strictEqual(canvas.height, 150);

            core.resize(gl, {width: 850, height: 480}, scene);

            assert.strictEqual(gl.drawingBufferWidth, 850);
            assert.strictEqual(gl.drawingBufferHeight, 480);

            //TODO: check that target texture in framebuffer is actually resized
        });

        afterEach(function () {
            core.destroy(gl, scene);
        });
    });

    describe('#destroy()', function () {
        let canvas, scene, gl;

        beforeEach(function () {
            canvas = document.createElement('canvas');

            const initData = core.init(core.getWebGLContext(canvas), [brightnessContrast]);

            gl = initData.gl;
            scene = initData.data;
        });

        it('dispose of all target canvas\' resources', function () {
            const {
                program,
                vertexShader,
                fragmentShader,
                source,
                attributes,
                uniforms
            } = scene;

            assert.strictEqual(gl.isTexture(source.texture), true);
            assert.strictEqual(gl.isBuffer(attributes[0].buffer), true);
            assert.strictEqual(gl.isShader(vertexShader), true);
            assert.strictEqual(gl.isShader(fragmentShader), true);
            assert.strictEqual(gl.isProgram(program), true);

            core.destroy(gl, scene);

            assert.strictEqual(gl.isTexture(source.texture), false);
            assert.strictEqual(gl.isBuffer(attributes[0].buffer), false);
            assert.strictEqual(gl.isShader(vertexShader), false);
            assert.strictEqual(gl.isShader(fragmentShader), false);
            assert.strictEqual(gl.isProgram(program), false);
        });
    });
});
