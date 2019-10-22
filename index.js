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
       * @property {boolean} isLuminance
       *
       * @description Multiplies `alpha` value with values read from `mask` media source.
       *
       *  @example
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
            u_alphaMaskIsLuminance: 'bool',
            u_mask: 'sampler2D'
          },
          main: "\n    if (u_alphaMaskEnabled) {\n        vec4 alphaMaskPixel = texture2D(u_mask, v_alphaMaskTexCoord);\n\n        if (u_alphaMaskIsLuminance) {\n            alpha *= dot(lumcoeff, alphaMaskPixel.rgb) * alphaMaskPixel.a;\n        }\n        else {\n            alpha *= alphaMaskPixel.a;\n        }\n    }"
        },

        get disabled() {
          return !this.uniforms[0].data[0];
        },

        set disabled(b) {
          this.uniforms[0].data[0] = +!b;
        },

        get mask() {
          return this.textures[0].data;
        },

        set mask(img) {
          this.textures[0].data = img;
        },

        get isLuminance() {
          return !!this.uniforms[2].data[0];
        },

        set isLuminance(toggle) {
          this.uniforms[2].data[0] = +toggle;
          this.textures[0].format = toggle ? 'RGBA' : 'ALPHA';
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
        }, {
          name: 'u_alphaMaskIsLuminance',
          type: 'i',
          data: [0]
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
       * @property {number[]} light Array of 4 numbers, normalized (0.0 - 1.0)
       * @property {number[]} dark Array of 4 numbers, normalized (0.0 - 1.0)
       * @property {boolean} disabled
       *
       * @example
       * effect.light = [1.0, 1.0, 0.8];
       * effect.dark = [0.2, 0.6, 0.33];
       */
      return {
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
     * @param {'CLAMP'|'DISCARD'|'WRAP'} [wrap='CLAMP'] wrapping method to use
     * @returns {displacementEffect}
     * @example displacement()
     */
    function displacement () {
      var wrap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'CLAMP';
      var WRAP_MAP = {
        CLAMP: "dispVec = clamp(dispVec, 0.0, 1.0);",
        DISCARD: "if (dispVec.x < 0.0 || dispVec.x > 1.0 || dispVec.y > 1.0 || dispVec.y < 0.0) {\n            discard;\n        }",
        WRAP: "dispVec = mod(dispVec, 1.0);"
      };
      /**
       * @typedef {Object} displacementEffect
       * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map
       * @property {{x: number?, y: number?}} scale
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
          source: "\n    if (u_displacementEnabled) {\n        vec3 dispMap = texture2D(u_dispMap, v_displacementMapTexCoord).rgb - 0.5;\n        vec2 dispVec = vec2(sourceCoord.x + u_dispScale.x * dispMap.r, sourceCoord.y + u_dispScale.y * dispMap.g);\n        ".concat(WRAP_MAP[wrap], "\n        sourceCoord = dispVec;\n    }")
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
          return this.textures[0].data;
        },

        set map(img) {
          this.textures[0].data = img;
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

    /*!
     * GLSL textureless classic 3D noise "cnoise",
     * with an RSL-style periodic variant "pnoise".
     * Author:  Stefan Gustavson (stefan.gustavson@liu.se)
     * Version: 2011-10-11
     *
     * Many thanks to Ian McEwan of Ashima Arts for the
     * ideas for permutation and gradient selection.
     *
     * Copyright (c) 2011 Stefan Gustavson. All rights reserved.
     * Distributed under the MIT license. See LICENSE file.
     * https://github.com/ashima/webgl-noise
     */

    /**
     * Implementation of a 3D classic Perlin noise. Exposes a `noise(vec3 P)` function for use inside fragment shaders.
     */
    var perlinNoise = "\nvec3 mod289 (vec3 x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289 (vec4 x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute (vec4 x) {\n    return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt (vec4 r) {\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec3 fade (vec3 t) {\n    return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\n// Classic Perlin noise\nfloat noise (vec3 P) {\n    vec3 Pi0 = floor(P); // Integer part for indexing\n    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n    Pi0 = mod289(Pi0);\n    Pi1 = mod289(Pi1);\n    vec3 Pf0 = fract(P); // Fractional part for interpolation\n    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n    vec4 iy = vec4(Pi0.yy, Pi1.yy);\n    vec4 iz0 = Pi0.zzzz;\n    vec4 iz1 = Pi1.zzzz;\n\n    vec4 ixy = permute(permute(ix) + iy);\n    vec4 ixy0 = permute(ixy + iz0);\n    vec4 ixy1 = permute(ixy + iz1);\n\n    vec4 gx0 = ixy0 * (1.0 / 7.0);\n    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;\n    gx0 = fract(gx0);\n    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n    vec4 sz0 = step(gz0, vec4(0.0));\n    gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n    gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n    vec4 gx1 = ixy1 * (1.0 / 7.0);\n    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;\n    gx1 = fract(gx1);\n    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n    vec4 sz1 = step(gz1, vec4(0.0));\n    gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n    gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n    g000 *= norm0.x;\n    g010 *= norm0.y;\n    g100 *= norm0.z;\n    g110 *= norm0.w;\n    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n    g001 *= norm1.x;\n    g011 *= norm1.y;\n    g101 *= norm1.z;\n    g111 *= norm1.w;\n\n    float n000 = dot(g000, Pf0);\n    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n    float n111 = dot(g111, Pf1);\n\n    vec3 fade_xyz = fade(Pf0);\n    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); \n    return 2.2 * n_xyz;\n}";

    /*!
     * Description : Array and textureless GLSL 2D/3D/4D simplex
     *               noise functions.
     *      Author : Ian McEwan, Ashima Arts.
     *  Maintainer : stegu
     *     Lastmod : 20110822 (ijm)
     *     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
     *               Distributed under the MIT License. See LICENSE file.
     *               https://github.com/ashima/webgl-noise
     *               https://github.com/stegu/webgl-noise
     */

    /**
     * Implementation of a 3D Simplex noise. Exposes a `noise(vec3 v)` function for use inside fragment shaders.
     */
    var simplex = "\nvec3 mod289 (vec3 x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289 (vec4 x) {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute (vec4 x) {\n    return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt (vec4 r) {\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat noise (vec3 v) { \n    const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\n    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\n\n    // First corner\n    vec3 i  = floor(v + dot(v, C.yyy) );\n    vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n    // Other corners\n    vec3 g = step(x0.yzx, x0.xyz);\n    vec3 l = 1.0 - g;\n    vec3 i1 = min( g.xyz, l.zxy );\n    vec3 i2 = max( g.xyz, l.zxy );\n\n    //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n    //   x1 = x0 - i1  + 1.0 * C.xxx;\n    //   x2 = x0 - i2  + 2.0 * C.xxx;\n    //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n    vec3 x1 = x0 - i1 + C.xxx;\n    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n    // Permutations\n    i = mod289(i); \n    vec4 p = permute( permute( permute( \n                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) \n               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n    // Gradients: 7x7 points over a square, mapped onto an octahedron.\n    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n    float n_ = 0.142857142857; // 1.0/7.0\n    vec3  ns = n_ * D.wyz - D.xzx;\n\n    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n    vec4 x_ = floor(j * ns.z);\n    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n    vec4 x = x_ *ns.x + ns.yyyy;\n    vec4 y = y_ *ns.x + ns.yyyy;\n    vec4 h = 1.0 - abs(x) - abs(y);\n\n    vec4 b0 = vec4( x.xy, y.xy );\n    vec4 b1 = vec4( x.zw, y.zw );\n\n    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n    vec4 s0 = floor(b0)*2.0 + 1.0;\n    vec4 s1 = floor(b1)*2.0 + 1.0;\n    vec4 sh = -step(h, vec4(0.0));\n\n    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n    vec3 p0 = vec3(a0.xy,h.x);\n    vec3 p1 = vec3(a0.zw,h.y);\n    vec3 p2 = vec3(a1.xy,h.z);\n    vec3 p3 = vec3(a1.zw,h.w);\n\n    //Normalise gradients\n    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n    p0 *= norm.x;\n    p1 *= norm.y;\n    p2 *= norm.z;\n    p3 *= norm.w;\n\n    // Mix final noise value\n    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n    m = m * m;\n    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), \n                                    dot(p2,x2), dot(p3,x3) ) );\n}";

    /**
     * @function turbulence
     * @param {string} noise 3D noise implementation to use
     * @returns {turbulenceEffect}
     *
     * @example turbulence(noise)
     */
    function turbulence (noise) {
      /**
       * @typedef {Object} turbulenceEffect
       * @property {{x: number?, y: number?}} frequency
       * @property {number} octaves
       * @property {boolean} isFractal
       *
       * @description Generates a turbulence/fractal noise value stored into `turbulenceValue`.
       * Depends on a `noise(vec3 P)` function to be declared. Currently it's possible to simply use it after {@link perlinNoiseEffect}.
       *
       * @example
       * effect.frequency = {x: 0.0065};
       * effect.octaves = 4;
       * effect.isFractal = true;
       */
      return {
        fragment: {
          uniform: {
            u_turbulenceEnabled: 'bool',
            u_turbulenceFrequency: 'vec2',
            u_turbulenceOctaves: 'int',
            u_isFractal: 'bool',
            u_time: 'float'
          },
          constant: "\n".concat(noise, "\n\nconst int MAX_OCTAVES = 9;\n\nfloat turbulence (vec3 seed, vec2 frequency, int numOctaves, bool isFractal) {\n    float sum = 0.0;\n    vec3 position = vec3(0.0);\n    position.x = seed.x * frequency.x;\n    position.y = seed.y * frequency.y;\n    position.z = seed.z;\n    float ratio = 1.0;\n\n    for (int octave = 0; octave <= MAX_OCTAVES; octave++) {\n        if (octave > numOctaves) {\n            break;\n        }\n\n        if (isFractal) {\n            sum += noise(position) / ratio;\n        }\n        else {\n            sum += abs(noise(position)) / ratio;\n        }\n        position.x *= 2.0;\n        position.y *= 2.0;\n        ratio *= 2.0;\n    }\n    \n    if (isFractal) {\n        sum = (sum + 1.0) / 2.0;\n    }\n    \n    return clamp(sum, 0.0, 1.0);\n}"),
          main: "\n    vec3 turbulenceSeed = vec3(gl_FragCoord.xy, u_time * 0.0001);\n    float turbulenceValue = turbulence(turbulenceSeed, u_turbulenceFrequency, u_turbulenceOctaves, u_isFractal);"
        },

        get frequency() {
          var _this$uniforms$0$data = _slicedToArray(this.uniforms[0].data, 2),
              x = _this$uniforms$0$data[0],
              y = _this$uniforms$0$data[1];

          return {
            x: x,
            y: y
          };
        },

        set frequency(_ref) {
          var x = _ref.x,
              y = _ref.y;
          if (typeof x !== 'undefined') this.uniforms[0].data[0] = x;
          if (typeof y !== 'undefined') this.uniforms[0].data[1] = y;
        },

        get octaves() {
          return this.uniforms[1].data[0];
        },

        set octaves(value) {
          this.uniforms[1].data[0] = Math.max(0, parseInt(value));
        },

        get isFractal() {
          return !!this.uniforms[2].data[0];
        },

        set isFractal(toggle) {
          this.uniforms[2].data[0] = +toggle;
        },

        get time() {
          return this.uniforms[3].data[0];
        },

        set time(value) {
          this.uniforms[3].data[0] = Math.max(0, parseFloat(value));
        },

        uniforms: [{
          name: 'u_turbulenceFrequency',
          type: 'f',
          data: [0.0, 0.0]
        }, {
          name: 'u_turbulenceOctaves',
          type: 'i',
          data: [1]
        }, {
          name: 'u_isFractal',
          type: 'i',
          data: [0]
        }, {
          name: 'u_time',
          type: 'f',
          data: [0.0]
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
          return this.textures[0].data;
        },

        set to(media) {
          this.textures[0].data = media;
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
       * @property {{x: number?, y: number?}} sourceScale
       * @property {{x: number?, y: number?}} toScale
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
          source: "\n    vec3 transDispMap = vec3(1.0);\n    vec2 transDispVec = vec2(0.0);\n\n    if (u_transitionEnabled) {\n        // read the displacement texture once and create the displacement map\n        transDispMap = texture2D(u_transitionDispMap, v_transitionDispMapTexCoord).rgb - 0.5;\n\n        // prepare the source coordinates for sampling\n        transDispVec = vec2(u_sourceDispScale.x * transDispMap.r, u_sourceDispScale.y * transDispMap.g);\n        sourceCoord = clamp(sourceCoord + transDispVec * u_transitionProgress, 0.0, 1.0);\n    }",
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
          return this.textures[0].data;
        },

        set to(media) {
          this.textures[0].data = media;
        },

        get map() {
          return this.textures[1].data;
        },

        set map(img) {
          this.textures[1].data = img;
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

    var vertexSimpleTemplate = function vertexSimpleTemplate(_ref) {
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
      return "\nprecision mediump float;\n".concat(uniform, "\n").concat(attribute, "\nattribute vec2 a_position;\n").concat(varying, "\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    ").concat(main, "\n    gl_Position = vec4(a_position.xy, 0.0, 1.0);\n}");
    };

    var vertexMediaTemplate = function vertexMediaTemplate(_ref2) {
      var _ref2$uniform = _ref2.uniform,
          uniform = _ref2$uniform === void 0 ? '' : _ref2$uniform,
          _ref2$attribute = _ref2.attribute,
          attribute = _ref2$attribute === void 0 ? '' : _ref2$attribute,
          _ref2$varying = _ref2.varying,
          varying = _ref2$varying === void 0 ? '' : _ref2$varying,
          _ref2$constant = _ref2.constant,
          constant = _ref2$constant === void 0 ? '' : _ref2$constant,
          _ref2$main = _ref2.main,
          main = _ref2$main === void 0 ? '' : _ref2$main;
      return "\nprecision mediump float;\n".concat(uniform, "\n").concat(attribute, "\nattribute vec2 a_texCoord;\nattribute vec2 a_position;\n").concat(varying, "\nvarying vec2 v_texCoord;\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    v_texCoord = a_texCoord;\n    ").concat(main, "\n    gl_Position = vec4(a_position.xy, 0.0, 1.0);\n}");
    };

    var fragmentSimpleTemplate = function fragmentSimpleTemplate(_ref3) {
      var _ref3$uniform = _ref3.uniform,
          uniform = _ref3$uniform === void 0 ? '' : _ref3$uniform,
          _ref3$varying = _ref3.varying,
          varying = _ref3$varying === void 0 ? '' : _ref3$varying,
          _ref3$constant = _ref3.constant,
          constant = _ref3$constant === void 0 ? '' : _ref3$constant,
          _ref3$main = _ref3.main,
          main = _ref3$main === void 0 ? '' : _ref3$main,
          _ref3$source = _ref3.source,
          source = _ref3$source === void 0 ? '' : _ref3$source;
      return "\nprecision mediump float;\n".concat(varying, "\n").concat(uniform, "\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    ").concat(source, "\n    vec3 color = vec3(0.0);\n    float alpha = 1.0;\n    ").concat(main, "\n    gl_FragColor = vec4(color, 1.0) * alpha;\n}");
    };

    var fragmentMediaTemplate = function fragmentMediaTemplate(_ref4) {
      var _ref4$uniform = _ref4.uniform,
          uniform = _ref4$uniform === void 0 ? '' : _ref4$uniform,
          _ref4$varying = _ref4.varying,
          varying = _ref4$varying === void 0 ? '' : _ref4$varying,
          _ref4$constant = _ref4.constant,
          constant = _ref4$constant === void 0 ? '' : _ref4$constant,
          _ref4$main = _ref4.main,
          main = _ref4$main === void 0 ? '' : _ref4$main,
          _ref4$source = _ref4.source,
          source = _ref4$source === void 0 ? '' : _ref4$source;
      return "\nprecision mediump float;\n".concat(varying, "\nvarying vec2 v_texCoord;\n").concat(uniform, "\nuniform sampler2D u_source;\n\nconst vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);\n").concat(constant, "\nvoid main() {\n    vec2 sourceCoord = v_texCoord;\n    ").concat(source, "\n    vec4 pixel = texture2D(u_source, sourceCoord);\n    vec3 color = pixel.rgb;\n    float alpha = pixel.a;\n    ").concat(main, "\n    gl_FragColor = vec4(color, 1.0) * alpha;\n}");
    };

    var TEXTURE_WRAP = {
      stretch: 'CLAMP_TO_EDGE',
      repeat: 'REPEAT',
      mirror: 'MIRRORED_REPEAT'
    };
    /**
     * Initialize a compiled WebGLProgram for the given canvas and effects.
     *
     * @private
     * @param {Object} config
     * @param {WebGLRenderingContext} config.gl
     * @param {Object[]} config.effects
     * @param {{width: number, heignt: number}} [config.dimensions]
     * @param {boolean} [config.noSource]
     * @return {{gl: WebGLRenderingContext, data: kamposSceneData, [dimensions]: {width: number, height: number}}}
     */

    function init(_ref5) {
      var gl = _ref5.gl,
          effects = _ref5.effects,
          dimensions = _ref5.dimensions,
          noSource = _ref5.noSource;

      var programData = _initProgram(gl, effects, noSource);

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

      var _ref6 = dimensions || {},
          width = _ref6.width,
          height = _ref6.height;

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
          textures = data.textures;

      if (media && source && source.texture) {
        // bind the source texture
        gl.bindTexture(gl.TEXTURE_2D, source.texture); // read source data into texture

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
      } // Tell it to use our program (pair of shaders)


      gl.useProgram(program); // set attribute buffers with data

      _enableVertexAttributes(gl, attributes); // set uniforms with data


      _setUniforms(gl, uniforms);

      var startTex = gl.TEXTURE0;

      if (source) {
        gl.activeTexture(startTex);
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        startTex = gl.TEXTURE1;
      }

      if (textures) {
        for (var i = 0; i < textures.length; i++) {
          gl.activeTexture(startTex + i);
          var tex = textures[i];
          gl.bindTexture(gl.TEXTURE_2D, tex.texture);

          if (tex.update) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[tex.format], gl[tex.format], gl.UNSIGNED_BYTE, tex.data);
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

      if (source && source.texture) gl.deleteTexture(source.texture); // delete program

      gl.deleteProgram(program); // delete shaders

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    }

    function _initProgram(gl, effects) {
      var noSource = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var source = noSource ? null : {
        texture: createTexture(gl).texture,
        buffer: null
      };

      if (source) {
        // flip Y axis for source texture
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      }

      var data = _mergeEffectsData(effects, noSource);

      var vertexSrc = _stringifyShaderSrc(data.vertex, noSource ? vertexSimpleTemplate : vertexMediaTemplate);

      var fragmentSrc = _stringifyShaderSrc(data.fragment, noSource ? fragmentSimpleTemplate : fragmentMediaTemplate); // compile the GLSL program


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
      var noSource = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
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
          return Object.keys(config[shader] || {}).forEach(function (key) {
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
      }, getEffectDefaults(noSource));
    }

    function getEffectDefaults(noSource) {
      /*
       * Default uniforms
       */
      var uniforms = noSource ? [] : [{
        name: 'u_source',
        type: 'i',
        data: [0]
      }];
      /*
       * Default attributes
       */

      var attributes = [{
        name: 'a_position',
        data: new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
        size: 2,
        type: 'FLOAT'
      }];

      if (!noSource) {
        attributes.push({
          name: 'a_texCoord',
          data: new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
          size: 2,
          type: 'FLOAT'
        });
      }

      return {
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
        attributes: attributes,
        uniforms: uniforms,

        /*
         * Default textures
         */
        textures: []
      };
    }

    function _stringifyShaderSrc(data, template) {
      var templateData = Object.entries(data).reduce(function (result, _ref7) {
        var _ref8 = _slicedToArray(_ref7, 2),
            key = _ref8[0],
            value = _ref8[1];

        if (['uniform', 'attribute', 'varying'].includes(key)) {
          result[key] = Object.entries(value).reduce(function (str, _ref9) {
            var _ref10 = _slicedToArray(_ref9, 2),
                name = _ref10[0],
                type = _ref10[1];

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
     * @param {Object} [config]
     * @param {number} config.width
     * @param {number} config.height
     * @param {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} config.data
     * @param {string} config.format
     * @param {Object} config.wrap
     * @return {{texture: WebGLTexture, width: number, height: number}}
     */


    function createTexture(gl) {
      var _ref11 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref11$width = _ref11.width,
          width = _ref11$width === void 0 ? 1 : _ref11$width,
          _ref11$height = _ref11.height,
          height = _ref11$height === void 0 ? 1 : _ref11$height,
          _ref11$data = _ref11.data,
          data = _ref11$data === void 0 ? null : _ref11$data,
          _ref11$format = _ref11.format,
          format = _ref11$format === void 0 ? 'RGBA' : _ref11$format,
          _ref11$wrap = _ref11.wrap,
          wrap = _ref11$wrap === void 0 ? 'stretch' : _ref11$wrap;

      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture); // Set the parameters so we can render any size image

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[_getTextureWrap(wrap.x || wrap)]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[_getTextureWrap(wrap.y || wrap)]);
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

        if (type === 'i') {
          data = new Int32Array(data);
        }

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

    function _getTextureWrap(key) {
      return TEXTURE_WRAP[key] || TEXTURE_WRAP['stretch'];
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
       * Initializes a Kampos instance.
       * This is called inside the constructor,
       * but can be called again after effects have changed
       * or after {@link Kampos#destroy}.
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
              ticker = _config.ticker,
              noSource = _config.noSource;
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

          var _core$init = core.init({
            gl: gl,
            effects: effects,
            dimensions: this.dimensions,
            noSource: noSource
          }),
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

          var cb = this.config.beforeDraw;
          if (cb && cb() === false) return;
          core.draw(this.gl, this.media, this.data, this.dimensions);
        }
        /**
         * Starts the animation loop.
         *
         * If a {@link Ticker} is used, this instance will be added to that {@link Ticker}.
         *
         * @param {function} beforeDraw function to run before each draw call
         */

      }, {
        key: "play",
        value: function play(beforeDraw) {
          var _this2 = this;

          this.config.beforeDraw = beforeDraw;

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
         * If a {@link Ticker} is used, this instance will be removed from that {@link Ticker}.
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
         * Stops the animation loop and frees all resources.
         *
         * @param {boolean} keepState for internal use.
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
              data: texture.data,
              wrap: texture.wrap
            }).texture;
            data.format = texture.format;
            data.update = texture.update;
          });
        }
      }]);

      return Kampos;
    }();

    /**
     * Initialize a ticker instance for batching animation of multiple {@link Kampos} instances.
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
         * Invoke `.draw()` on all instances in the pool.
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
        displacement: displacement,
        turbulence: turbulence
      },
      transitions: {
        fade: fade,
        displacement: displacementTransition
      },
      noise: {
        perlinNoise: perlinNoise,
        simplex: simplex
      },
      Kampos: Kampos,
      Ticker: Ticker
    };

    return index;

}));
