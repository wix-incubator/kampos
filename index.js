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
          main: "\n    v_alphaMaskTexCoord = a_alphaMaskTexCoord;"
        },
        fragment: {
          uniform: {
            u_alphaMaskEnabled: 'bool',
            u_mask: 'sampler2D'
          },
          main: "\n    if (u_alphaMaskEnabled) {\n        alpha *= texture2D(u_mask, v_alphaMaskTexCoord).a;\n    }"
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get mask() {
          return this.textures[0].image;
        },

        set mask(img) {
          this.textures[0].image = img;
        },

        varying: {
          v_alphaMaskTexCoord: 'vec2'
        },
        uniforms: [{
          name: 'u_alphaMaskEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_mask',
          type: 'i',
          data: [1]
        }],
        attributes: [{
          name: 'a_alphaMaskTexCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }],
        textures: [{
          format: 'ALPHA'
        }]
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
          main: "\n    if (u_brEnabled) {\n        color *= u_brightness;\n    }\n\n    if (u_ctEnabled) {\n        color = (color - half3) * u_contrast + half3;\n    }\n\n    color = clamp(color, 0.0, 1.0);"
        },

        get brightness() {
          return this.uniforms[2].data[0];
        },

        set brightness(value) {
          this.uniforms[2].data[0] = parseFloat(Math.max(0, value));
        },

        get contrast() {
          return this.uniforms[3].data[0];
        },

        set contrast(value) {
          this.uniforms[3].data[0] = parseFloat(Math.max(0, value));
        },

        get brightnessDisabled() {
          return !this.uniforms[0].data[0];
        },

        set brightnessDisabled(toggle) {
          this.uniforms[0].data[0] = +!toggle;
        },

        get contrastDisabled() {
          return !this.uniforms[1].data[0];
        },

        set contrastDisabled(toggle) {
          this.uniforms[1].data[0] = +!toggle;
        },

        uniforms: [{
          name: 'u_brEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_ctEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_brightness',
          type: 'f',
          data: [1.0]
        }, {
          name: 'u_contrast',
          type: 'f',
          data: [1.0]
        }]
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
          constant: "\nconst mat3 lummat = mat3(\n    lumcoeff,\n    lumcoeff,\n    lumcoeff\n);\nconst mat3 cosmat = mat3(\n    vec3(0.787, -0.715, -0.072),\n    vec3(-0.213, 0.285, -0.072),\n    vec3(-0.213, -0.715, 0.928)\n);\nconst mat3 sinmat = mat3(\n    vec3(-0.213, -0.715, 0.928),\n    vec3(0.143, 0.140, -0.283),\n    vec3(-0.787, 0.715, 0.072)\n);\nconst mat3 satmat = mat3(\n    vec3(0.787, -0.715, -0.072),\n    vec3(-0.213, 0.285, -0.072),\n    vec3(-0.213, -0.715, 0.928)\n);",
          main: "\n    float angle = (u_hue / 180.0) * 3.14159265358979323846264;\n    v_hueRotation = lummat + cos(angle) * cosmat + sin(angle) * sinmat;\n    v_saturation = lummat + satmat * u_saturation;"
        },
        fragment: {
          uniform: {
            u_hueEnabled: 'bool',
            u_satEnabled: 'bool',
            u_hue: 'float',
            u_saturation: 'float'
          },
          main: "\n    if (u_hueEnabled) {\n        color = vec3(\n            dot(color, v_hueRotation[0]),\n            dot(color, v_hueRotation[1]),\n            dot(color, v_hueRotation[2])\n        );\n    }\n\n    if (u_satEnabled) {\n        color = vec3(\n            dot(color, v_saturation[0]),\n            dot(color, v_saturation[1]),\n            dot(color, v_saturation[2])\n        );\n    }\n    \n    color = clamp(color, 0.0, 1.0);"
        },
        varying: {
          v_hueRotation: 'mat3',
          v_saturation: 'mat3'
        },

        get hue() {
          return this.uniforms[2].data[0];
        },

        set hue(h) {
          this.uniforms[2].data[0] = parseFloat(h);
        },

        get saturation() {
          return this.uniforms[3].data[0];
        },

        set saturation(s) {
          this.uniforms[3].data[0] = parseFloat(Math.max(0, s));
        },

        get hueDisabled() {
          return !this.uniforms[0].data[0];
        },

        set hueDisabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get saturationDisabled() {
          return !this.uniforms[1].data[0];
        },

        set saturationDisabled(b) {
          this.uniforms[1].data[0] = +!b;
        },

        uniforms: [{
          name: 'u_hueEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_satEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_hue',
          type: 'f',
          data: [0.0]
        }, {
          name: 'u_saturation',
          type: 'f',
          data: [1.0]
        }]
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
       * @property {number[]} light Array of 4 numbers normalized (0.0 - 1.0)
       * @property {number[]} dark Array of 4 numbers normalized (0.0 - 1.0)
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
          main: "\n    if (u_duotoneEnabled) {\n        vec3 gray = vec3(dot(lumcoeff, color));\n        color = mix(u_dark.rgb, u_light.rgb, gray);\n    }"
        },

        get light() {
          return this.uniforms[1].data.slice(0);
        },

        set light(l) {
          var _this = this;

          l.forEach(function (c, i) {
            if (!Number.isNaN(c)) {
              _this.uniforms[1].data[i] = c;
            }
          });
        },

        get dark() {
          return this.uniforms[2].data.slice(0);
        },

        set dark(d) {
          var _this2 = this;

          d.forEach(function (c, i) {
            if (!Number.isNaN(c)) {
              _this2.uniforms[2].data[i] = c;
            }
          });
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        uniforms: [{
          name: 'u_duotoneEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_light',
          type: 'f',
          data: [0.9882352941, 0.7333333333, 0.05098039216, 1]
        }, {
          name: 'u_dark',
          type: 'f',
          data: [0.7411764706, 0.0431372549, 0.568627451, 1]
        }]
      };
    }

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _objectSpread(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);

        if (typeof Object.getOwnPropertySymbols === 'function') {
          ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
            return Object.getOwnPropertyDescriptor(source, sym).enumerable;
          }));
        }

        ownKeys.forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      }

      return target;
    }

    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
    }

    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
    }

    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

        return arr2;
      }
    }

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArray(iter) {
      if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
    }

    function _iterableToArrayLimit(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance");
    }

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
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
       * @property {{x: number, y: number}} scale
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
          main: "\n    v_displacementMapTexCoord = a_displacementMapTexCoord;"
        },
        fragment: {
          uniform: {
            u_displacementEnabled: 'bool',
            u_dispMap: 'sampler2D',
            u_dispScale: 'vec2'
          },
          source: "\n    if (u_displacementEnabled) {\n        vec3 dispMap = texture2D(u_dispMap, v_displacementMapTexCoord).rgb - 0.5;\n        vec2 dispVec = vec2(v_texCoord.x + u_dispScale.x * dispMap.r, v_texCoord.y + u_dispScale.y * dispMap.g);\n        sourceCoord = clamp(dispVec, 0.0, 1.0);\n    }"
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get scale() {
          var _this$uniforms$2$data = _slicedToArray(this.uniforms[2].data, 2),
              x = _this$uniforms$2$data[0],
              y = _this$uniforms$2$data[1];

          return {
            x: x,
            y: y
          };
        },

        set scale(_ref) {
          var x = _ref.x,
              y = _ref.y;
          if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
          if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },

        get map() {
          return this.textures[0].image;
        },

        set map(img) {
          this.textures[0].image = img;
        },

        varying: {
          v_displacementMapTexCoord: 'vec2'
        },
        uniforms: [{
          name: 'u_displacementEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_dispMap',
          type: 'i',
          data: [1]
        }, {
          name: 'u_dispScale',
          type: 'f',
          data: [0.0, 0.0]
        }],
        attributes: [{
          name: 'a_displacementMapTexCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }],
        textures: [{
          format: 'RGB'
        }]
      };
    }

    /**
     * @function fadeTransition
     * @returns {fadeTransitionEffect}
     * @example fadeTransition()
     */
    function fade () {
      /**
       * @typedef {Object} fadeTransitionEffect
       * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
       * @property {number} progress number between 0.0 and 1.0
       * @property {boolean} disabled
       *
       * @example
       * effect.to = document.querySelector('#video-to');
       * effect.progress = 0.5;
       */
      return {
        vertex: {
          attribute: {
            a_transitionToTexCoord: 'vec2'
          },
          main: "\n    v_transitionToTexCoord = a_transitionToTexCoord;"
        },
        fragment: {
          uniform: {
            u_transitionEnabled: 'bool',
            u_transitionProgress: 'float',
            u_transitionTo: 'sampler2D'
          },
          main: "\n    if (u_transitionEnabled) {\n        vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);\n        color = mix(color, targetPixel.rgb, u_transitionProgress);\n        alpha = mix(alpha, targetPixel.a, u_transitionProgress);\n    }"
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get progress() {
          return this.uniforms[2].data[0];
        },

        set progress(p) {
          this.uniforms[2].data[0] = p;
        },

        get to() {
          return this.textures[0].image;
        },

        set to(media) {
          this.textures[0].image = media;
        },

        varying: {
          v_transitionToTexCoord: 'vec2'
        },
        uniforms: [{
          name: 'u_transitionEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_transitionTo',
          type: 'i',
          data: [1]
        }, {
          name: 'u_transitionProgress',
          type: 'f',
          data: [0]
        }],
        attributes: [{
          name: 'a_transitionToTexCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }],
        textures: [{
          format: 'RGBA',
          update: true
        }]
      };
    }

    /**
     * @function displacementTransition
     * @returns {displacementTransitionEffect}
     * @example displacementTransition()
     */
    function displacementTransition () {
      /**
       * @typedef {Object} displacementTransitionEffect
       * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
       * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map displacement map to use
       * @property {number} progress number between 0.0 and 1.0
       * @property {{x: number, y: number}} sourceScale
       * @property {{x: number, y: number}} toScale
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
          main: "\n    v_transitionToTexCoord = a_transitionToTexCoord;\n    v_transitionDispMapTexCoord = a_transitionDispMapTexCoord;"
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
          source: "\n    vec3 transDispMap = vec3(1.0);\n    vec2 transDispVec = vec2(0.0);\n\n    if (u_transitionEnabled) {\n        // read the displacement texture once and create the displacement map\n        transDispMap = texture2D(u_transitionDispMap, v_transitionDispMapTexCoord).rgb - 0.5;\n\n        // prepare the source coordinates for sampling\n        transDispVec = vec2(u_sourceDispScale.x * transDispMap.r, u_sourceDispScale.y * transDispMap.g);\n        sourceCoord = clamp(v_texCoord + transDispVec * u_transitionProgress, 0.0, 1.0);\n    }",
          main: "\n    if (u_transitionEnabled) {\n        // prepare the target coordinates for sampling\n        transDispVec = vec2(u_toDispScale.x * transDispMap.r, u_toDispScale.y * transDispMap.g);\n        vec2 targetCoord = clamp(v_transitionToTexCoord + transDispVec * (1.0 - u_transitionProgress), 0.0, 1.0);\n\n        // sample the target\n        vec4 targetPixel = texture2D(u_transitionTo, targetCoord);\n\n        // mix the results of source and target\n        color = mix(color, targetPixel.rgb, u_transitionProgress);\n        alpha = mix(alpha, targetPixel.a, u_transitionProgress);\n    }"
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get progress() {
          return this.uniforms[3].data[0];
        },

        set progress(p) {
          this.uniforms[3].data[0] = p;
        },

        get sourceScale() {
          var _this$uniforms$4$data = _slicedToArray(this.uniforms[4].data, 2),
              x = _this$uniforms$4$data[0],
              y = _this$uniforms$4$data[1];

          return {
            x: x,
            y: y
          };
        },

        set sourceScale(_ref) {
          var x = _ref.x,
              y = _ref.y;
          if (typeof x !== 'undefined') this.uniforms[4].data[0] = x;
          if (typeof y !== 'undefined') this.uniforms[4].data[1] = y;
        },

        get toScale() {
          var _this$uniforms$5$data = _slicedToArray(this.uniforms[5].data, 2),
              x = _this$uniforms$5$data[0],
              y = _this$uniforms$5$data[1];

          return {
            x: x,
            y: y
          };
        },

        set toScale(_ref2) {
          var x = _ref2.x,
              y = _ref2.y;
          if (typeof x !== 'undefined') this.uniforms[5].data[0] = x;
          if (typeof y !== 'undefined') this.uniforms[5].data[1] = y;
        },

        get to() {
          return this.textures[0].image;
        },

        set to(media) {
          this.textures[0].image = media;
        },

        get map() {
          return this.textures[1].image;
        },

        set map(img) {
          this.textures[1].image = img;
        },

        varying: {
          v_transitionToTexCoord: 'vec2',
          v_transitionDispMapTexCoord: 'vec2'
        },
        uniforms: [{
          name: 'u_transitionEnabled',
          type: 'i',
          data: [1]
        }, {
          name: 'u_transitionTo',
          type: 'i',
          data: [1]
        }, {
          name: 'u_transitionDispMap',
          type: 'i',
          data: [2]
        }, {
          name: 'u_transitionProgress',
          type: 'f',
          data: [0]
        }, {
          name: 'u_sourceDispScale',
          type: 'f',
          data: [0.0, 0.0]
        }, {
          name: 'u_toDispScale',
          type: 'f',
          data: [0.0, 0.0]
        }],
        attributes: [{
          name: 'a_transitionToTexCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }, {
          name: 'a_transitionDispMapTexCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }],
        textures: [{
          format: 'RGBA',
          update: true
        }, {
          format: 'RGB'
        }]
      };
    }

    var core = {
      init: init,
      draw: draw,
      destroy: destroy,
      resize: resize,
      getWebGLContext: getWebGLContext,
      createTexture: createTexture
    };

    var vertexTemplate = function vertexTemplate(_ref) {
      var _ref$uniform = _ref.uniform,
          uniform = _ref$uniform === void 0 ? '' : _ref$uniform,
          _ref$attribute = _ref.attribute,
          attribute = _ref$attribute === void 0 ? '' : _ref$attribute,
          _ref$varying = _ref.varying,
          varying = _ref$varying === void 0 ? '' : _ref$varying,
          _ref$constant = _ref.constant,
          constant = _ref$constant === void 0 ? '' : _ref$constant,
          _ref$main = _ref.main,
          main = _ref$main === void 0 ? '' : _ref$main;
      return "\nprecision mediump float;\n".concat(uniform, "\n").concat(attribute, "\nattribute vec2 a_texCoord;\nattribute vec2 a_position;\n").concat(varying, "\nvarying vec2 v_texCoord;\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    v_texCoord = a_texCoord;\n    ").concat(main, "\n    gl_Position = vec4(a_position.xy, 0.0, 1.0);\n}");
    };

    var fragmentTemplate = function fragmentTemplate(_ref2) {
      var _ref2$uniform = _ref2.uniform,
          uniform = _ref2$uniform === void 0 ? '' : _ref2$uniform,
          _ref2$varying = _ref2.varying,
          varying = _ref2$varying === void 0 ? '' : _ref2$varying,
          _ref2$constant = _ref2.constant,
          constant = _ref2$constant === void 0 ? '' : _ref2$constant,
          _ref2$main = _ref2.main,
          main = _ref2$main === void 0 ? '' : _ref2$main,
          _ref2$source = _ref2.source,
          source = _ref2$source === void 0 ? '' : _ref2$source;
      return "\nprecision mediump float;\n".concat(varying, "\nvarying vec2 v_texCoord;\n").concat(uniform, "\nuniform sampler2D u_source;\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    vec2 sourceCoord = v_texCoord;\n    ").concat(source, "\n    vec4 pixel = texture2D(u_source, sourceCoord);\n    vec3 color = pixel.rgb;\n    float alpha = pixel.a;\n    ").concat(main, "\n    gl_FragColor = vec4(color, 1.0) * alpha;\n}");
    };
    /**
     * Initialize a compiled WebGLProgram for the given canvas and effects.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param effects
     * @param dimensions
     * @return {{gl: WebGLRenderingContext, data: kamposSceneData, [dimensions]: {width: number, height: number}}}
     */


    function init(gl, effects, dimensions) {
      var programData = _initProgram(gl, effects);

      return {
        gl: gl,
        data: programData,
        dimensions: dimensions || {}
      };
    }

    var WEBGL_CONTEXT_SUPPORTED = false;
    /**
     * Get a webgl context for the given canvas element.
     *
     * Will return `null` if can not get a context.
     *
     * @private
     * @param {HTMLCanvasElement} canvas
     * @return {WebGLRenderingContext|null}
     */

    function getWebGLContext(canvas) {
      var context;
      var config = {
        preserveDrawingBuffer: false,
        // should improve performance - https://stackoverflow.com/questions/27746091/preservedrawingbuffer-false-is-it-worth-the-effort
        antialias: false,
        // should improve performance
        depth: false,
        // turn off for explicitness - and in some cases perf boost
        stencil: false // turn off for explicitness - and in some cases perf boost

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


    function resize(gl, dimensions) {
      var canvas = gl.canvas;
      var realToCSSPixels = 1; //window.devicePixelRatio;

      var _ref3 = dimensions || {},
          width = _ref3.width,
          height = _ref3.height;

      var displayWidth, displayHeight;

      if (width && height) {
        displayWidth = width;
        displayHeight = height;
      } else {
        // Lookup the size the browser is displaying the canvas.
        displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
        displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
      } // Check if the canvas is not the same size.


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
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} media
     * @param {kamposSceneData} data
     * @param {{width: number, height: number}} dimensions
     */


    function draw(gl, media, data, dimensions) {
      var program = data.program,
          source = data.source,
          attributes = data.attributes,
          uniforms = data.uniforms,
          textures = data.textures; // bind the source texture

      gl.bindTexture(gl.TEXTURE_2D, source.texture); // read source data into texture

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media); // Tell it to use our program (pair of shaders)

      gl.useProgram(program); // set attribute buffers with data

      _enableVertexAttributes(gl, attributes); // set uniforms with data


      _setUniforms(gl, uniforms);

      if (textures) {
        for (var i = -1; i < textures.length; i++) {
          gl.activeTexture(gl.TEXTURE0 + (i + 1));

          if (i === -1) {
            gl.bindTexture(gl.TEXTURE_2D, source.texture);
          } else {
            var tex = textures[i];
            gl.bindTexture(gl.TEXTURE_2D, tex.texture);

            if (tex.update) {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl[tex.format], gl[tex.format], gl.UNSIGNED_BYTE, tex.image);
            }
          }
        }
      } // Draw the rectangles


      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /**
     * Free all resources attached to a specific webgl context.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {kamposSceneData} data
     */


    function destroy(gl, data) {
      var program = data.program,
          vertexShader = data.vertexShader,
          fragmentShader = data.fragmentShader,
          source = data.source,
          attributes = data.attributes; // delete buffers

      (attributes || []).forEach(function (attr) {
        return gl.deleteBuffer(attr.buffer);
      }); // delete texture

      gl.deleteTexture(source.texture); // delete program

      gl.deleteProgram(program); // delete shaders

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    }

    function _initProgram(gl, effects) {
      var source = {
        texture: createTexture(gl).texture,
        buffer: null
      }; // flip Y axis for source texture

      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

      var data = _mergeEffectsData(effects);

      var vertexSrc = _stringifyShaderSrc(data.vertex, vertexTemplate);

      var fragmentSrc = _stringifyShaderSrc(data.fragment, fragmentTemplate); // compile the GLSL program


      var _getWebGLProgram2 = _getWebGLProgram(gl, vertexSrc, fragmentSrc),
          program = _getWebGLProgram2.program,
          vertexShader = _getWebGLProgram2.vertexShader,
          fragmentShader = _getWebGLProgram2.fragmentShader,
          error = _getWebGLProgram2.error,
          type = _getWebGLProgram2.type;

      if (error) {
        throw new Error("".concat(type, " error:: ").concat(error, "\n").concat(fragmentSrc));
      } // setup the vertex data


      var attributes = _initVertexAttributes(gl, program, data.attributes); // setup uniforms


      var uniforms = _initUniforms(gl, program, data.uniforms);

      return {
        program: program,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        source: source,
        attributes: attributes,
        uniforms: uniforms,
        textures: data.textures
      };
    }

    function _mergeEffectsData(effects) {
      return effects.reduce(function (result, config) {
        var _result$uniforms, _result$textures;

        var _config$attributes = config.attributes,
            attributes = _config$attributes === void 0 ? [] : _config$attributes,
            _config$uniforms = config.uniforms,
            uniforms = _config$uniforms === void 0 ? [] : _config$uniforms,
            _config$textures = config.textures,
            textures = _config$textures === void 0 ? [] : _config$textures,
            _config$varying = config.varying,
            varying = _config$varying === void 0 ? {} : _config$varying;

        var merge = function merge(shader) {
          return Object.keys(config[shader]).forEach(function (key) {
            if (key === 'constant' || key === 'main' || key === 'source') {
              result[shader][key] += config[shader][key] + '\n';
            } else {
              result[shader][key] = _objectSpread({}, result[shader][key], config[shader][key]);
            }
          });
        };

        merge('vertex');
        merge('fragment');
        attributes.forEach(function (attribute) {
          var found = result.attributes.some(function (attr, n) {
            if (attr.name === attribute.name) {
              Object.assign(attr, attribute);
              return true;
            }
          });

          if (!found) {
            result.attributes.push(attribute);
          }
        });

        (_result$uniforms = result.uniforms).push.apply(_result$uniforms, _toConsumableArray(uniforms));

        (_result$textures = result.textures).push.apply(_result$textures, _toConsumableArray(textures));

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
        attributes: [{
          name: 'a_position',
          data: new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }, {
          name: 'a_texCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        }],

        /*
         * Default uniforms
         */
        uniforms: [{
          name: 'u_source',
          type: 'i',
          data: [0]
        }],

        /*
         * Default textures
         */
        textures: []
      });
    }

    function _stringifyShaderSrc(data, template) {
      var templateData = Object.entries(data).reduce(function (result, _ref4) {
        var _ref5 = _slicedToArray(_ref4, 2),
            key = _ref5[0],
            value = _ref5[1];

        if (['uniform', 'attribute', 'varying'].includes(key)) {
          result[key] = Object.entries(value).reduce(function (str, _ref6) {
            var _ref7 = _slicedToArray(_ref6, 2),
                name = _ref7[0],
                type = _ref7[1];

            return str + "".concat(key, " ").concat(type, " ").concat(name, ";\n");
          }, '');
        } else {
          result[key] = value;
        }

        return result;
      }, {});
      return template(templateData);
    }

    function _getWebGLProgram(gl, vertexSrc, fragmentSrc) {
      var vertexShader = _createShader(gl, gl.VERTEX_SHADER, vertexSrc);

      var fragmentShader = _createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

      if (vertexShader.error) {
        return vertexShader;
      }

      if (fragmentShader.error) {
        return fragmentShader;
      }

      return _createProgram(gl, vertexShader, fragmentShader);
    }

    function _createProgram(gl, vertexShader, fragmentShader) {
      var program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      var success = gl.getProgramParameter(program, gl.LINK_STATUS);

      if (success) {
        return {
          program: program,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader
        };
      }

      var exception = {
        error: gl.getProgramInfoLog(program),
        type: 'program'
      };
      gl.deleteProgram(program);
      return exception;
    }

    function _createShader(gl, type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

      if (success) {
        return shader;
      }

      var exception = {
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


    function createTexture(gl) {
      var _ref8 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref8$width = _ref8.width,
          width = _ref8$width === void 0 ? 1 : _ref8$width,
          _ref8$height = _ref8.height,
          height = _ref8$height === void 0 ? 1 : _ref8$height,
          _ref8$data = _ref8.data,
          data = _ref8$data === void 0 ? null : _ref8$data,
          _ref8$format = _ref8.format,
          format = _ref8$format === void 0 ? 'RGBA' : _ref8$format;

      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture); // Set the parameters so we can render any size image

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      if (data) {
        // Upload the image into the texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], gl[format], gl.UNSIGNED_BYTE, data);
      } else {
        // Create empty texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[format], gl.UNSIGNED_BYTE, null);
      }

      return {
        texture: texture,
        width: width,
        height: height,
        format: format
      };
    }

    function _createBuffer(gl, program, name, data) {
      var location = gl.getAttribLocation(program, name);
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return {
        location: location,
        buffer: buffer
      };
    }

    function _initVertexAttributes(gl, program, data) {
      return (data || []).map(function (attr) {
        var _createBuffer2 = _createBuffer(gl, program, attr.name, attr.data),
            location = _createBuffer2.location,
            buffer = _createBuffer2.buffer;

        return {
          name: attr.name,
          location: location,
          buffer: buffer,
          type: attr.type,
          size: attr.size
        };
      });
    }

    function _initUniforms(gl, program, uniforms) {
      return (uniforms || []).map(function (uniform) {
        var location = gl.getUniformLocation(program, uniform.name);
        return {
          location: location,
          size: uniform.size || uniform.data.length,
          type: uniform.type,
          data: uniform.data
        };
      });
    }

    function _setUniforms(gl, uniformData) {
      (uniformData || []).forEach(function (uniform) {
        var size = uniform.size,
            type = uniform.type,
            location = uniform.location,
            data = uniform.data;
        gl["uniform".concat(size).concat(type, "v")](location, data);
      });
    }

    function _enableVertexAttributes(gl, attributes) {
      (attributes || []).forEach(function (attrib) {
        var location = attrib.location,
            buffer = attrib.buffer,
            size = attrib.size,
            type = attrib.type;
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
     * Initialize a webgl target with effects.
     *
     * @class Kampos
     * @param {kamposConfig} config
     * @example
     * import {Ticker, Kampos, effects} from 'kampos';
     * const ticker = new Ticker();
     * const target = document.querySelector('#canvas');
     * const hueSat = effects.hueSaturation();
     * const kampos = new Kampos({ticker, target, effects: [hueSat]});
     */

    var Kampos =
    /*#__PURE__*/
    function () {
      /**
       * @constructor
       */
      function Kampos(config) {
        var _this = this;

        _classCallCheck(this, Kampos);

        if (!config || !config.target) {
          throw new Error('A target canvas was not provided');
        }

        if (Kampos.preventContextCreation) throw new Error('Context creation is prevented');

        this._contextCreationError = function () {
          Kampos.preventContextCreation = true;

          if (config && config.onContextCreationError) {
            config.onContextCreationError.call(this, config);
          }
        };

        config.target.addEventListener('webglcontextcreationerror', this._contextCreationError, false);
        var success = this.init(config);
        if (!success) throw new Error('Could not create context');

        this._restoreContext = function (e) {
          e && e.preventDefault();

          _this.config.target.removeEventListener('webglcontextrestored', _this._restoreContext, true);

          var success = _this.init();

          if (!success) return false;

          if (_this._source) {
            _this.setSource(_this._source);
          }

          delete _this._source;

          if (config && config.onContextRestored) {
            config.onContextRestored.call(_this, config);
          }

          return true;
        };

        this._loseContext = function (e) {
          e.preventDefault();

          if (_this.gl && _this.gl.isContextLost()) {
            _this.lostContext = true;

            _this.config.target.addEventListener('webglcontextrestored', _this._restoreContext, true);

            _this.destroy(true);

            if (config && config.onContextLost) {
              config.onContextLost.call(_this, config);
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
       * @return {boolean} success whether initializing of the context and program were successful
       */


      _createClass(Kampos, [{
        key: "init",
        value: function init(config) {
          config = config || this.config;
          var _config = config,
              target = _config.target,
              effects = _config.effects,
              ticker = _config.ticker;
          if (Kampos.preventContextCreation) return false;
          this.lostContext = false;
          var gl = core.getWebGLContext(target);
          if (!gl) return false;

          if (gl.isContextLost()) {
            var success = this.restoreContext();
            if (!success) return false; // get new context from the fresh clone

            gl = core.getWebGLContext(this.config.target);
            if (!gl) return false;
          }

          var _core$init = core.init(gl, effects, this.dimensions),
              data = _core$init.data;

          this.gl = gl;
          this.data = data; // cache for restoring context

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
         * @example
         * const media = document.querySelector('#video');
         * kampos.setSource(media);
         */

      }, {
        key: "setSource",
        value: function setSource(source) {
          if (!source) return;

          if (this.lostContext) {
            var success = this.restoreContext();
            if (!success) return;
          }

          var media, width, height;

          if (Object.prototype.toString.call(source) === '[object Object]') {
            media = source.media;
            width = source.width;
            height = source.height;
          } else {
            media = source;
          }

          if (width && height) {
            this.dimensions = {
              width: width,
              height: height
            };
          } // resize the target canvas if needed


          core.resize(this.gl, this.dimensions);

          this._createTextures();

          this.media = media;
        }
        /**
         * Draw current scene.
         */

      }, {
        key: "draw",
        value: function draw() {
          if (this.lostContext) {
            var success = this.restoreContext();
            if (!success) return;
          }

          core.draw(this.gl, this.media, this.data, this.dimensions);
        }
        /**
         * Starts the animation loop.
         *
         * If using a {@see Ticker} this instance will be added to that {@see Ticker}.
         */

      }, {
        key: "play",
        value: function play() {
          var _this2 = this;

          if (this.ticker) {
            if (this.animationFrameId) {
              this.stop();
            }

            if (!this.playing) {
              this.playing = true;
              this.ticker.add(this);
            }
          } else if (!this.animationFrameId) {
            var loop = function loop() {
              _this2.animationFrameId = window.requestAnimationFrame(loop);

              _this2.draw();
            };

            this.animationFrameId = window.requestAnimationFrame(loop);
          }
        }
        /**
         * Stops the animation loop.
         *
         * If using a {@see Ticker} this instance will be removed from that {@see Ticker}.
         */

      }, {
        key: "stop",
        value: function stop() {
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
         * Stops animation loop and frees all resources.
         *
         * @param {boolean} keepState  for internal use.
         */

      }, {
        key: "destroy",
        value: function destroy(keepState) {
          this.stop();

          if (this.gl && this.data) {
            core.destroy(this.gl, this.data);
          }

          if (keepState) {
            var dims = this.dimensions || {};
            this._source = this._source || {
              media: this.media,
              width: dims.width,
              height: dims.height
            };
          } else {
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

      }, {
        key: "restoreContext",
        value: function restoreContext() {
          if (Kampos.preventContextCreation) return false;
          var canvas = this.config.target;
          var clone = this.config.target.cloneNode(true);
          var parent = canvas.parentNode;

          if (parent) {
            parent.replaceChild(clone, canvas);
          }

          this.config.target = clone;
          canvas.removeEventListener('webglcontextlost', this._loseContext, true);
          canvas.removeEventListener('webglcontextrestored', this._restoreContext, true);
          canvas.removeEventListener('webglcontextcreationerror', this._contextCreationError, false);
          clone.addEventListener('webglcontextlost', this._loseContext, true);
          clone.addEventListener('webglcontextcreationerror', this._contextCreationError, false);

          if (this.lostContext) {
            return this._restoreContext();
          }

          return true;
        }
      }, {
        key: "_createTextures",
        value: function _createTextures() {
          var _this3 = this;

          this.data && this.data.textures.forEach(function (texture, i) {
            var data = _this3.data.textures[i];
            data.texture = core.createTexture(_this3.gl, {
              width: _this3.dimensions.width,
              height: _this3.dimensions.height,
              format: texture.format,
              data: texture.image
            }).texture;
            data.format = texture.format;
            data.update = texture.update;
          });
        }
      }]);

      return Kampos;
    }();

    /**
     * Initialize a ticker instance for batching animation of multiple Kampos instances.
     *
     * @class Ticker
     */
    var Ticker =
    /*#__PURE__*/
    function () {
      function Ticker() {
        _classCallCheck(this, Ticker);

        this.pool = [];
      }
      /**
       * Starts the animation loop.
       */


      _createClass(Ticker, [{
        key: "start",
        value: function start() {
          var _this = this;

          if (!this.animationFrameId) {
            var loop = function loop() {
              _this.animationFrameId = window.requestAnimationFrame(loop);

              _this.draw();
            };

            this.animationFrameId = window.requestAnimationFrame(loop);
          }
        }
        /**
         * Stops the animation loop.
         */

      }, {
        key: "stop",
        value: function stop() {
          window.cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        /**
         * Invoke draw() on all instances in the pool.
         */

      }, {
        key: "draw",
        value: function draw() {
          this.pool.forEach(function (instance) {
            return instance.draw();
          });
        }
        /**
         * Add an instance to the pool.
         *
         * @param {Kampos} instance
         */

      }, {
        key: "add",
        value: function add(instance) {
          var index = this.pool.indexOf(instance);

          if (!~index) {
            this.pool.push(instance);
            instance.playing = true;
          }
        }
        /**
         * Remove an instance form the pool.
         *
         * @param {Kampos} instance
         */

      }, {
        key: "remove",
        value: function remove(instance) {
          var index = this.pool.indexOf(instance);

          if (~index) {
            this.pool.splice(index, 1);
            instance.playing = false;
          }
        }
      }]);

      return Ticker;
    }();

    var index = {
      effects: {
        alphaMask: alphaMask,
        brightnessContrast: brightnessContrast,
        hueSaturation: hueSaturation,
        duotone: duotone,
        displacement: displacement
      },
      transitions: {
        fade: fade,
        displacement: displacementTransition
      },
      Kampos: Kampos,
      Ticker: Ticker
    };

    return index;

}));
