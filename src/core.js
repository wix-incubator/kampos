const LUMA_COEFFICIENT = 'const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);';
const MATH_PI = `const float PI = ${Math.PI};`;
const DEBUG = false;

const vertexSimpleTemplate = ({
    uniform = '',
    attribute = '',
    varying = '',
    constant = '',
    main = '',
}) => `
precision highp float;
${uniform}
${attribute}
attribute vec2 a_position;
${varying}

${LUMA_COEFFICIENT}
${MATH_PI}
${constant}
void main() {
    ${main}
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
}`;

const vertexMediaTemplate = ({
    uniform = '',
    attribute = '',
    varying = '',
    constant = '',
    main = '',
}) => `
precision highp float;
${uniform}
${attribute}
attribute vec2 a_texCoord;
attribute vec2 a_position;
${varying}
varying vec2 v_texCoord;

${LUMA_COEFFICIENT}
${MATH_PI}
${constant}
void main() {
    v_texCoord = a_texCoord;
    ${main}
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
}`;

const fragmentSimpleTemplate = ({
    uniform = '',
    varying = '',
    constant = '',
    main = '',
    source = '',
}) => `
precision highp float;
${varying}
${uniform}

${LUMA_COEFFICIENT}
${MATH_PI}
${constant}
void main() {
    ${source}
    vec3 color = vec3(0.0);
    float alpha = 1.0;
    ${main}
    gl_FragColor = vec4(color, 1.0) * alpha;
}`;

const fragmentMediaTemplate = ({
    uniform = '',
    varying = '',
    constant = '',
    main = '',
    source = '',
}) => `
precision highp float;
${varying}
varying vec2 v_texCoord;
${uniform}
uniform sampler2D u_source;

${LUMA_COEFFICIENT}
${MATH_PI}
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

const TEXTURE_WRAP = {
    stretch: 'CLAMP_TO_EDGE',
    repeat: 'REPEAT',
    mirror: 'MIRRORED_REPEAT',
};

const SHADER_ERROR_TYPES = {
    vertex: 'VERTEX',
    fragment: 'FRAGMENT',
};

/**
 * Initialize a compiled WebGLProgram for the given canvas and effects.
 *
 * @private
 * @param {Object} config
 * @param {WebGLRenderingContext} config.gl
 * @param {Object} config.plane
 * @param {Object[]} config.effects
 * @param {{width: number, heignt: number}} [config.dimensions]
 * @param {fboConfig} [config.fbo]
 * @param {boolean} [config.noSource]
 * @return {{gl: WebGLRenderingContext, data: kamposSceneData, [dimensions]: {width: number, height: number}, [fboData]: fboSceneData}}
 */
export function init({ gl, plane, effects, dimensions, noSource, fbo }) {
    const hasFBO = !!fbo;
    const programData = _initProgram(gl, plane, effects, hasFBO, noSource);

    let fboData
    if (hasFBO) {
        fboData = _initFBOProgram(gl, plane, fbo);
    }

    return { gl, data: programData, dimensions: dimensions || {}, fboData };
}

let WEBGL_CONTEXT_SUPPORTED = false;

/**
 * Get a webgl context for the given canvas element.
 *
 * Will return `null` if can not get a context.
 *
 * @private
 * @param {HTMLCanvasElement} canvas
 * @return {WebGLRenderingContext|null}
 */
export function getWebGLContext(canvas) {
    let context;

    const config = {
        preserveDrawingBuffer: false, // should improve performance - https://stackoverflow.com/questions/27746091/preservedrawingbuffer-false-is-it-worth-the-effort
        antialias: false, // should improve performance
        depth: false, // turn off for explicitness - and in some cases perf boost
        stencil: false, // turn off for explicitness - and in some cases perf boost
    };

    context = canvas.getContext('webgl', config);

    if (context) {
        WEBGL_CONTEXT_SUPPORTED = true;
    } else if (!WEBGL_CONTEXT_SUPPORTED) {
        context = canvas.getContext('experimental-webgl', config);
    } else {
        return null;
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
export function resize(gl, dimensions) {
    const canvas = gl.canvas;
    const realToCSSPixels = 1; //window.devicePixelRatio;
    const { width, height } = dimensions || {};
    let displayWidth, displayHeight;

    if (width && height) {
        displayWidth = width;
        displayHeight = height;
    } else {
        // Lookup the size the browser is displaying the canvas.
        displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
        displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
    }

    // Check if the canvas is not the same size.
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

/**
 * Draw a given scene
 *
 * @private
 * @param {WebGLRenderingContext} gl
 * @param {planeConfig} plane
 * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} media
 * @param {kamposSceneData} data
 * @param {fboSceneData} [fboData]
 */
export function draw(gl, plane = {}, media, data, fboData) {

    if (fboData) {
        drawFBO(gl, fboData);
    }

    const {
        program,
        source,
        attributes,
        uniforms,
        textures,
        extensions,
        vao
    } = data;
    const { xSegments = 1, ySegments = 1 } = plane;

    if (media && source && source.texture && (source.shouldUpdate || !source._sampled)) {
        source._sampled = true;

        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            media,
        );
    }

    gl.useProgram(program);

    // resize back to default viewport
    if (fboData) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    if (vao) {
        extensions.vao.bindVertexArrayOES(vao);
    } else {
        _enableVertexAttributes(gl, attributes);
    }

    _setUniforms(gl, uniforms);

    let startTex = gl.TEXTURE0;

    if (fboData) {
        // bind fbo texture
        gl.activeTexture(startTex);
        gl.bindTexture(gl.TEXTURE_2D, fboData.oldInfo.texture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_FBOMap'), 0);
        startTex++;
    }

    if (source) {
        gl.activeTexture(startTex);
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        startTex++;
    }

    if (textures) {
        for (let i = 0; i < textures.length; i++) {
            gl.activeTexture(startTex + i);

            const tex = textures[i];
            gl.bindTexture(gl.TEXTURE_2D, tex.texture);

            if (tex.update) {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl[tex.format],
                    gl[tex.format],
                    gl.UNSIGNED_BYTE,
                    tex.data,
                );
            }
        }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6 * xSegments * ySegments);
}

function drawFBO(gl, fboData) {
    const { size, program, uniforms } = fboData;

    gl.useProgram(program);

    gl.viewport(0, 0, size, size);
    // write in new fb
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboData.newInfo.buffer);
    // read old texture
    gl.bindTexture(gl.TEXTURE_2D, fboData.oldInfo.texture);
    // // Set uniforms
    _setUniforms(gl, uniforms);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Swap textures and framebuffers
    {
        const temp = fboData.oldInfo;
        fboData.oldInfo = fboData.newInfo;
        fboData.newInfo = temp;
    }
    // clear framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/**
 * Free all resources attached to a specific webgl context.
 *
 * @private
 * @param {WebGLRenderingContext} gl
 * @param {kamposSceneData | fboSceneData} data
 */
export function destroy(gl, data) {
    const {
        program,
        vertexShader,
        fragmentShader,
        source,
        attributes,
        extensions,
        vao,
        oldInfo,
        newInfo,
    } = data;

    // delete buffers
    (attributes || []).forEach((attr) => gl.deleteBuffer(attr.buffer));

    if (vao) extensions.vao.deleteVertexArrayOES(vao);

    // delete textures and framebuffers
    if (source && source.texture) gl.deleteTexture(source.texture);
    if (oldInfo) {
        oldInfo.texture && gl.deleteTexture(oldInfo.texture);
        oldInfo.buffer && gl.deleteFramebuffer(oldInfo.buffer);
    }
    if (newInfo) {
        newInfo.texture && gl.deleteTexture(newInfo.texture);
        newInfo.buffer && gl.deleteFramebuffer(newInfo.buffer);
    }

    // delete program
    gl.deleteProgram(program);

    // delete shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
}

function _initProgram(gl, plane, effects, hasFBO = false, noSource = false) {
    const source = noSource
        ? null
        : {
              texture: createTexture(gl).texture,
              buffer: null,
          };

    if (source) {
        // flip Y axis for source texture
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    }

    const data = _mergeEffectsData(plane, effects, hasFBO, noSource);
    const vertexSrc = _stringifyShaderSrc(
        data.vertex,
        noSource ? vertexSimpleTemplate : vertexMediaTemplate,
    );
    const fragmentSrc = _stringifyShaderSrc(
        data.fragment,
        noSource ? fragmentSimpleTemplate : fragmentMediaTemplate,
    );

    // compile the GLSL program
    const { program, vertexShader, fragmentShader, error, type } =
        _getWebGLProgram(gl, vertexSrc, fragmentSrc);

    if (error || DEBUG) {
        logShaders(type, error, vertexSrc, fragmentSrc);
    }

    let vaoExt, vao;
    try {
        vaoExt = gl.getExtension('OES_vertex_array_object');
        vao = vaoExt.createVertexArrayOES();
        vaoExt.bindVertexArrayOES(vao);
    } catch (e) {
        // ignore
    }

    // set up the vertex data
    const attributes = _initVertexAttributes(gl, program, data.attributes);

    if (vao) {
        _enableVertexAttributes(gl, attributes);
        vaoExt.bindVertexArrayOES(null);
    }

    // setup uniforms
    const uniforms = _initUniforms(gl, program, data.uniforms);

    return {
        extensions: {
            vao: vaoExt,
        },
        program,
        vertexShader,
        fragmentShader,
        source,
        attributes,
        uniforms,
        textures: data.textures,
        vao,
    };
}

function _initFBOProgram(gl, plane, fbo) {
    const data = _mergeEffectsData(plane, fbo.effects, false, true);
    const vertexSrc = _stringifyShaderSrc(
        data.vertex,
        vertexSimpleTemplate,
    );
    const fragmentSrc = _stringifyShaderSrc(
        data.fragment,
        fragmentSimpleTemplate,
    );

    const { program, vertexShader, fragmentShader, error, type } =
        _getWebGLProgram(gl, vertexSrc, fragmentSrc);

    if (error || DEBUG) {
        logShaders(type, error, vertexSrc, fragmentSrc);
    }

    const uniforms = _initUniforms(gl, program, data.uniforms);

    const tex1 = _createFloatTexture(gl, { width: fbo.size, height: fbo.size }).texture;
    const tex2 = _createFloatTexture(gl, { width: fbo.size, height: fbo.size }).texture;

    const oldInfo = {
        buffer: _createFramebuffer(gl, tex1),
        texture: tex1,
    };

    const newInfo = {
        buffer: _createFramebuffer(gl, tex2),
        texture: tex2,
    };

    return {
        program,
        vertexShader,
        fragmentShader,
        uniforms,
        oldInfo,
        newInfo,
        size: fbo.size,
    };
}

function _mergeEffectsData(plane, effects, hasFBO = false, noSource = false) {
    return effects.reduce(
        (result, config) => {
            const {
                attributes = [],
                uniforms = [],
                textures = [],
                varying = {},
            } = config;
            const merge = (shader) =>
                Object.keys(config[shader] || {}).forEach((key) => {
                    if (
                        key === 'constant' ||
                        key === 'main' ||
                        key === 'source'
                    ) {
                        result[shader][key] += config[shader][key] + '\n';
                    } else {
                        result[shader][key] = {
                            ...result[shader][key],
                            ...config[shader][key],
                        };
                    }
                });

            merge('vertex');
            merge('fragment');

            attributes.forEach((attribute) => {
                const found = result.attributes.some((attr) => {
                    if (attr.name === attribute.name) {
                        Object.assign(attr, attribute);
                        return true;
                    }
                });

                if (!found) {
                    result.attributes.push(attribute);
                }
            });

            result.attributes.forEach((attr) => {
                if (attr.extends) {
                    const found = result.attributes.some((attrToExtend) => {
                        if (attrToExtend.name === attr.extends) {
                            Object.assign(attr, attrToExtend, {
                                name: attr.name,
                            });
                            return true;
                        }
                    });

                    if (!found) {
                        throw new Error(
                            `Could not find attribute ${attr.extends} to extend`,
                        );
                    }
                }
            });

            result.uniforms.push(...uniforms);
            result.textures.push(...textures);

            Object.assign(result.vertex.varying, varying);
            Object.assign(result.fragment.varying, varying);

            return result;
        },

        getEffectDefaults(plane, hasFBO, noSource),
    );
}

function _getPlaneCoords({ xEnd, yEnd, factor }, plane = {}) {
    const { xSegments = 1, ySegments = 1 } = plane;
    const result = [];

    for (let i = 0; i < xSegments; i++) {
        for (let j = 0; j < ySegments; j++) {
            /* A */
            result.push(
                (xEnd * i) / xSegments - factor,
                (yEnd * j) / ySegments - factor,
            );
            /* B */
            result.push(
                (xEnd * i) / xSegments - factor,
                (yEnd * (j + 1)) / ySegments - factor,
            );
            /* C */
            result.push(
                (xEnd * (i + 1)) / xSegments - factor,
                (yEnd * j) / ySegments - factor,
            );
            /* D */
            result.push(
                (xEnd * (i + 1)) / xSegments - factor,
                (yEnd * j) / ySegments - factor,
            );
            /* E */
            result.push(
                (xEnd * i) / xSegments - factor,
                (yEnd * (j + 1)) / ySegments - factor,
            );
            /* F */
            result.push(
                (xEnd * (i + 1)) / xSegments - factor,
                (yEnd * (j + 1)) / ySegments - factor,
            );
        }
    }

    return result;
}

function getEffectDefaults(plane, hasFBO, noSource) {
    /*
     * Default uniforms
     */
    const uniforms = noSource
        ? []
        : [
              {
                  name: 'u_source',
                  type: 'i',
                  data: [hasFBO ? 1 : 0],
              },
          ];

    /*
     * Default attributes
     */
    const attributes = [
        {
            name: 'a_position',
            data: new Float32Array(
                _getPlaneCoords({ xEnd: 2, yEnd: 2, factor: 1 }, plane),
            ),
            size: 2,
            type: 'FLOAT',
        },
    ];

    if (!noSource) {
        attributes.push({
            name: 'a_texCoord',
            data: new Float32Array(
                _getPlaneCoords({ xEnd: 1, yEnd: 1, factor: 0 }, plane),
            ),
            size: 2,
            type: 'FLOAT',
        });
    }

    return {
        vertex: {
            uniform: {},
            attribute: {},
            varying: {},
            constant: '',
            main: '',
        },
        fragment: {
            uniform: {},
            varying: {},
            constant: '',
            main: '',
            source: '',
        },
        attributes,
        uniforms,
        /*
         * Default textures
         */
        textures: [],
    };
}

function _stringifyShaderSrc(data, template) {
    const templateData = Object.entries(data).reduce((result, [key, value]) => {
        if (['uniform', 'attribute', 'varying'].includes(key)) {
            result[key] = Object.entries(value).reduce(
                (str, [name, type]) => str + `${key} ${type} ${name};\n`,
                '',
            );
        } else {
            result[key] = value;
        }

        return result;
    }, {});

    return template(templateData);
}

function _getWebGLProgram(gl, vertexSrc, fragmentSrc) {
    const vertexShader = _createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = _createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

    if (vertexShader.error) {
        return vertexShader;
    }

    if (fragmentShader.error) {
        return fragmentShader;
    }

    return _createProgram(gl, vertexShader, fragmentShader);
}

function _createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) {
        return { program, vertexShader, fragmentShader };
    }

    const exception = {
        error: gl.getProgramInfoLog(program),
        type: 'program',
    };

    gl.deleteProgram(program);

    return exception;
}

function _createShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (success) {
        return shader;
    }

    const exception = {
        error: gl.getShaderInfoLog(shader),
        type:
            type === gl.VERTEX_SHADER
                ? SHADER_ERROR_TYPES.vertex
                : SHADER_ERROR_TYPES.fragment,
    };

    gl.deleteShader(shader);

    return exception;
}

/**
 * Create a WebGLTexture object.
 *
 * @private
 * @param {WebGLRenderingContext} gl
 * @param {Object} [config]
 * @param {number} config.width
 * @param {number} config.height
 * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} config.data
 * @param {string} config.format
 * @param {Object} config.wrap
 * @return {{texture: WebGLTexture, width: number, height: number}}
 */
export function createTexture(
    gl,
    {
        width = 1,
        height = 1,
        data = null,
        format = 'RGBA',
        wrap = 'stretch',
        filter = 'LINEAR',
        textureType = 'UNSIGNED_BYTE',
    } = {},
) {
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,
        gl[_getTextureWrap(wrap.x || wrap)],
    );
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,
        gl[_getTextureWrap(wrap.y || wrap)],
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);

    if (data) {
        // Upload the image into the texture
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl[format],
            gl[format],
            gl[textureType],
            data,
        );
    } else {
        // Create empty texture
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl[format],
            width,
            height,
            0,
            gl[format],
            gl[textureType],
            null,
        );
    }

    return { texture, width, height, format };
}

function _createBuffer(gl, program, name, data) {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    return { location, buffer };
}

function _createFramebuffer(gl, tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    );
    return fb;
}

function _initVertexAttributes(gl, program, data) {
    return (data || []).map((attr) => {
        const { location, buffer } = _createBuffer(
            gl,
            program,
            attr.name,
            attr.data,
        );

        return {
            name: attr.name,
            location,
            buffer,
            type: attr.type,
            size: attr.size,
        };
    });
}

function _initUniforms(gl, program, uniforms) {
    return (uniforms || []).map((uniform) => {
        const location = gl.getUniformLocation(program, uniform.name);

        return {
            location,
            size: uniform.size || uniform.data.length,
            type: uniform.type,
            data: uniform.data,
        };
    });
}

function _setUniforms(gl, uniformData) {
    (uniformData || []).forEach((uniform) => {
        let { size, type, location, data } = uniform;

        if (type === 'i') {
            data = new Int32Array(data);
        }

        gl[`uniform${size}${type}v`](location, data);
    });
}

function _enableVertexAttributes(gl, attributes) {
    (attributes || []).forEach((attrib) => {
        const { location, buffer, size, type } = attrib;

        gl.enableVertexAttribArray(location);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(location, size, gl[type], false, 0, 0);
    });
}

function _getTextureWrap(key) {
    return TEXTURE_WRAP[key] || TEXTURE_WRAP['stretch'];
}

function _createFloatTexture(
    gl,
    {
        width,
        height,
        data = null,
        format = 'RGBA',
        wrap = 'stretch',
        filter = 'NEAREST',
    } = {}) {
    // Enable OES_texture_float extension
    const ext = gl.getExtension('OES_texture_float');
    if (!ext) {
        throw new Error('OES_texture_float not supported');
    }

    return createTexture(gl, {
        width,
        height,
        data,
        format,
        wrap,
        filter,
        textureType: 'FLOAT',
    });
}

function logShaders(type, error, vertexSrc, fragmentSrc) {
    function addLineNumbers(str) {
        return str.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
    }

    if (error) {
        throw new Error(
            `${type} error:: ${error}\n${addLineNumbers(type === SHADER_ERROR_TYPES.fragment ? fragmentSrc : vertexSrc)}`,
        );
    }

    if (DEBUG) {
        console.log(addLineNumbers(vertexSrc));
        console.log(addLineNumbers(fragmentSrc));
    }
}

/**
 * @private
 * @typedef {Object} kamposSceneData
 * @property {WebGLProgram} program
 * @property {{vao: OES_vertex_array_object?}} extensions
 * @property {WebGLShader} vertexShader
 * @property {WebGLShader} fragmentShader
 * @property {kamposTarget} source
 * @property {kamposAttribute[]} attributes
 * @property {Uniform[]} uniforms
 * @property {Texture[]} textures
 * @property {WebGLVertexArrayObjectOES} [vao]
 *
 * @private
 * @typedef {Object} fboSceneData
 * @property {WebGLProgram} program
 * @property {WebGLShader} vertexShader
 * @property {WebGLShader} fragmentShader
 * @property {Uniform[]} uniforms
 * @property {kamposTarget} oldInfo
 * @property {kamposTarget} newInfo
 * @property {number} size
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
