(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.kampos = factory());
})(this, (function () { 'use strict';

    /**
     * @function alphaMask
     * @param {Object} [params]
     * @param {boolean} [params.isLuminance=false] whether to use luminance when reading mask values
     * @returns {alphaMaskEffect}
     *
     * @example alphaMask()
     */
    function alphaMask ({isLuminance = false} = {}) {
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
                main: `
    v_alphaMaskTexCoord = a_alphaMaskTexCoord;`
            },
            fragment: {
                uniform: {
                    u_alphaMaskEnabled: 'bool',
                    u_alphaMaskIsLuminance: 'bool',
                    u_mask: 'sampler2D'
                },
                main: `
    if (u_alphaMaskEnabled) {
        vec4 alphaMaskPixel = texture2D(u_mask, v_alphaMaskTexCoord);

        if (u_alphaMaskIsLuminance) {
            alpha *= dot(lumcoeff, alphaMaskPixel.rgb) * alphaMaskPixel.a;
        }
        else {
            alpha *= alphaMaskPixel.a;
        }
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get mask () {
                return this.textures[0].data;
            },
            set mask (img) {
                this.textures[0].data = img;
            },
            get isLuminance () {
                return !!this.uniforms[2].data[0];
            },
            set isLuminance (toggle) {
                this.uniforms[2].data[0] = +toggle;
                this.textures[0].format = toggle ? 'RGBA' : 'ALPHA';
            },
            varying: {
                v_alphaMaskTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_alphaMaskEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_mask',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_alphaMaskIsLuminance',
                    type: 'i',
                    data: [+!!isLuminance]
                }
            ],
            attributes: [
                {
                    name: 'a_alphaMaskTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: isLuminance ? 'RGBA' : 'ALPHA'
                }
            ]
        };
    }

    const MODES_AUX = {
        blend_luminosity: `float blend_luminosity (vec3 c) {
    return dot(c, blendLum);
}`,
        blend_saturation: `float blend_saturation (vec3 c) {
    return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
}`,
        blend_set_luminosity: `vec3 blend_clip_color (vec3 c) {
    float l = blend_luminosity(c);
    float cMin = min(min(c.r, c.g), c.b);
    float cMax = max(max(c.r, c.g), c.b);

    if (cMin < 0.0)
        return l + (((c - l) * l) / (l - cMin));
    if (cMax > 1.0)
        return l + (((c - l) * (1.0 - l)) / (cMax - l));

    return c;
}

vec3 blend_set_luminosity (vec3 c, float l) {
    vec3 delta = vec3(l - blend_luminosity(c));

    return blend_clip_color(vec3(c.rgb + delta.rgb));
}`,
        blend_set_saturation: `
float getBlendMid (vec3 c) {
    float bigger = max(c.r, c.g);

    if (bigger < c.b) {
        return bigger;
    }

    float smaller = min(c.r, c.g);

    if (c.b < smaller) {
        return smaller;
    }

    return c.b;
}

vec3 blend_set_saturation (vec3 c, float s) {
    if (s == 0.0) return vec3(0.0);

    float cMax = max(max(c.r, c.g), c.b);
    float cMid = getBlendMid(c);
    float cMin = min(min(c.r, c.g), c.b);
    float r, g, b;

    cMid = (((cMid - cMin) * s) / (cMax - cMin));
    cMax = s;
    cMin = 0.0;

    if (c.r > c.g) {
        // r > g
        if (c.b > c.r) {
            // g < r < b
            g = cMin;
            r = cMid;
            b = cMax;
        }
        else if (c.g > c.b) {
            // b < g < r
            b = cMin;
            g = cMid;
            r = cMax;
        }
        else {
            // g < b < r
            g = cMin;
            b = cMid;
            r = cMax;
        }
    }
    // g > r
    else if (c.g > c.b) {
        // g > b
        if (c.b > c.r) {
            // r < b < g
            r = cMin;
            b = cMid;
            g = cMax;
        }
        else {
            // b < r < g
            b = cMin;
            r = cMid;
            g = cMax;
        }
    }
    else {
        // r < g < b
        r = cMin;
        g = cMid;
        b = cMax;
    }

    return vec3(r, g, b);
}`
    };

    const MODES_CONSTANT = {
        normal: '',
        multiply: '',
        screen: '',
        overlay: `float blend_overlay (float b, float c) {
    if (b <= 0.5)
        return 2.0 * b * c;
    else
        return 1.0 - 2.0 * ((1.0 - b) * (1.0 - c));
}`,
        darken: '',
        lighten: '',
        colorDodge: `float blend_colorDodge (float b, float c) {
    if (b == 0.0)
        return 0.0;
    else if (c == 1.0)
        return 1.0;
    else
        return min(1.0, b / (1.0 - c));
}`,
        colorBurn: `float blend_colorBurn (float b, float c) {
    if (b == 1.0) {
        return 1.0;
    }
    else if (c == 0.0) {
        return 0.0;
    }
    else {
        return 1.0 - min(1.0, (1.0 - b) / c);
    }
}`,
        hardLight: `float blend_hardLight (float b, float c) {
    if (c <= 0.5) {
        return 2.0 * b * c;
    }
    else {
        return 1.0 - 2.0 * ((1.0 - b) * (1.0 - c));
    }
}`,
        softLight: `float blend_softLight (float b, float c) {
    if (c <= 0.5) {
        return b - (1.0 - 2.0 * c) * b * (1.0 - b);
    }
    else {
        float d;

        if (b <= 0.25) {
            d = ((16.0 * b - 12.0) * b + 4.0) * b;
        }
        else {
            d = sqrt(b);
        }

        return b + (2.0 * c - 1.0) * (d - b);
    }
}`,
        difference: `float blend_difference (float b, float c) {
    return abs(b - c);
}`,
        exclusion: `float blend_exclusion (float b, float c) {
    return b + c - 2.0 * b * c;
}`,
        hue: `${MODES_AUX.blend_luminosity}
${MODES_AUX.blend_saturation}
${MODES_AUX.blend_set_saturation}
${MODES_AUX.blend_set_luminosity}`,
        saturation: `${MODES_AUX.blend_luminosity}
${MODES_AUX.blend_saturation}
${MODES_AUX.blend_set_saturation}
${MODES_AUX.blend_set_luminosity}`,
        color: `${MODES_AUX.blend_luminosity}
${MODES_AUX.blend_set_luminosity}`,
        luminosity: `${MODES_AUX.blend_luminosity}
${MODES_AUX.blend_set_luminosity}`,
    };

    function generateBlendVector (name) {
        return `vec3(${name}(backdrop.r, source.r), ${name}(backdrop.g, source.g), ${name}(backdrop.b, source.b))`
    }

    const MODES_MAIN = {
        normal: 'source',
        multiply: 'source * backdrop',
        screen: 'backdrop + source - backdrop * source',
        overlay: generateBlendVector('blend_overlay'),
        darken: generateBlendVector('min'),
        lighten: generateBlendVector('max'),
        colorDodge: generateBlendVector('blend_colorDodge'),
        colorBurn: generateBlendVector('blend_colorBurn'),
        hardLight: generateBlendVector('blend_hardLight'),
        softLight: generateBlendVector('blend_softLight'),
        difference: generateBlendVector('blend_difference'),
        exclusion: generateBlendVector('blend_exclusion'),
        hue: 'blend_set_luminosity(blend_set_saturation(source, blend_saturation(backdrop)), blend_luminosity(backdrop))',
        saturation: 'blend_set_luminosity(blend_set_saturation(backdrop, blend_saturation(source)), blend_luminosity(backdrop))',
        color: 'blend_set_luminosity(source, blend_luminosity(backdrop))',
        luminosity: 'blend_set_luminosity(backdrop, blend_luminosity(source))'
    };

    /**
     * @function blend
     * @param {Object} [params]
     * @param {'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten'|'color-dodge'|'color-burn'|'hard-light'|'soft-light'|'difference'|'exclusion'|'hue'|'saturation'|'color'|'luminosity'} [params.mode='normal'] blend mode to use
     * @param {number[]} [params.color=[0, 0, 0, 1]] Initial color to use when blending to a solid color
     * @returns {blendEffect}
     * @example blend('colorBurn')
     */
    function blend ({
        mode = 'normal',
        color = [0.0, 0.0, 0.0, 1.0]
    } = {}) {
        /**
         * @typedef {Object} blendEffect
         * @property {number[]} color backdrop solid color as Array of 4 numbers, normalized (0.0 - 1.0)
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} image to use as backdrop
         * @property {boolean} disabled
         *
         * @example
         * const img = new Image();
         * img.src = 'picture.png';
         * effect.color = [0.3, 0.55, 0.8, 1.0];
         * effect.image = img;
         */
        return {
            vertex: {
                attribute: {
                    a_blendImageTexCoord: 'vec2'
                },
                main: `
    v_blendImageTexCoord = a_blendImageTexCoord;`
            },
            fragment: {
                uniform: {
                    u_blendEnabled: 'bool',
                    u_blendColorEnabled: 'bool',
                    u_blendImageEnabled: 'bool',
                    u_blendColor: 'vec4',
                    u_blendImage: 'sampler2D',
                },
                constant: `const vec3 blendLum = vec3(0.3, 0.59, 0.11);
${MODES_CONSTANT[mode]}`,
                main: `
    if (u_blendEnabled) {
        vec3 backdrop = vec3(0.0);
        float backdropAlpha = 1.0;

        if (u_blendColorEnabled) {
            backdrop = u_blendColor.rgb;
            backdropAlpha = u_blendColor.a;
        }
        if (u_blendImageEnabled) {
            vec4 blendBackdropPixel = texture2D(u_blendImage, v_blendImageTexCoord);
            if (u_blendColorEnabled) {
                vec3 source = blendBackdropPixel.rgb;
                float sourceAlpha = blendBackdropPixel.a;
                backdrop = (1.0 - backdropAlpha) * source + backdropAlpha * clamp(${MODES_MAIN[mode]}, 0.0, 1.0);
                backdropAlpha = sourceAlpha + backdropAlpha * (1.0 - sourceAlpha);
            }
            else {
                backdrop = blendBackdropPixel.rgb;
                backdropAlpha = blendBackdropPixel.a;
            }
        }
        vec3 source = vec3(color.rgb);
        color = (1.0 - backdropAlpha) * source + backdropAlpha * clamp(${MODES_MAIN[mode]}, 0.0, 1.0);
        alpha = alpha + backdropAlpha * (1.0 - alpha);
    }`
            },
            get color () {
                return this.uniforms[1].data.slice(0);
            },
            set color (l) {
                if (!l || !l.length) {
                    this.uniforms[2].data[0] = 0;
                }
                else {
                    this.uniforms[2].data[0] = 1;
                    l.forEach((c, i) => {
                        if (!Number.isNaN(c)) {
                            this.uniforms[1].data[i] = c;
                        }
                    });
                }
            },
            get image () {
                return this.textures[0].data;
            },
            set image (img) {
                if (img) {
                    this.uniforms[4].data[0] = 1;
                    this.textures[0].data = img;
                }
                else {
                    this.uniforms[4].data[0] = 0;
                }
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            varying: {
                v_blendImageTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_blendEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_blendColor',
                    type: 'f',
                    data: color
                },
                {
                    name: 'u_blendColorEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_blendImage',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_blendImageEnabled',
                    type: 'i',
                    data: [0]
                }
            ],
            attributes: [
                {
                    name: 'a_blendImageTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: 'RGBA'
                }
            ]
        };
    }

    /**
     * @function brightnessContrast
     * @property {number} brightness
     * @property {number} contrast
     * @param {Object} [params]
     * @param {number} [params.brightness=1.0] initial brightness to use.
     * @param {number} [params.contrast=1.0] initial contrast to use.
     * @returns {brightnessContrastEffect}
     *
     * @example brightnessContrast({brightness: 1.5, contrast: 0.8})
     */
    function brightnessContrast ({brightness = 1.0, contrast = 1.0} = {}) {
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
                main: `
    if (u_brEnabled) {
        color *= u_brightness;
    }

    if (u_ctEnabled) {
        color = (color - half3) * u_contrast + half3;
    }

    color = clamp(color, 0.0, 1.0);`
            },
            get brightness () {
                return this.uniforms[2].data[0];
            },
            set brightness (value) {
                this.uniforms[2].data[0] = parseFloat(Math.max(0, value));
            },
            get contrast () {
                return this.uniforms[3].data[0];
            },
            set contrast (value) {
                this.uniforms[3].data[0] = parseFloat(Math.max(0, value));
            },
            get brightnessDisabled () {
                return !this.uniforms[0].data[0];
            },
            set brightnessDisabled (toggle) {
                this.uniforms[0].data[0] = +!toggle;
            },
            get contrastDisabled () {
                return !this.uniforms[1].data[0];
            },
            set contrastDisabled (toggle) {
                this.uniforms[1].data[0] = +!toggle;
            },
            uniforms: [
                {
                    name: 'u_brEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_ctEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_brightness',
                    type: 'f',
                    data: [brightness]
                },
                {
                    name: 'u_contrast',
                    type: 'f',
                    data: [contrast]
                }
            ]
        };
    }

    /**
     * @function hueSaturation
     * @property {number} hue rotation in degrees
     * @property {number} saturation
     * @param {Object} [params]
     * @param {number} [params.hue=0.0] initial hue value
     * @param {number} [params.saturation=1.0] initial saturation value
     * @returns {hueSaturationEffect}
     * @example hueSaturation({hue: 45, saturation: 1.3})
     */
    function hueSaturation ({hue = 0.0, saturation = 1.0} = {}) {
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
                constant: `
const mat3 lummat = mat3(
    lumcoeff,
    lumcoeff,
    lumcoeff
);
const mat3 cosmat = mat3(
    vec3(0.787, -0.715, -0.072),
    vec3(-0.213, 0.285, -0.072),
    vec3(-0.213, -0.715, 0.928)
);
const mat3 sinmat = mat3(
    vec3(-0.213, -0.715, 0.928),
    vec3(0.143, 0.140, -0.283),
    vec3(-0.787, 0.715, 0.072)
);
const mat3 satmat = mat3(
    vec3(0.787, -0.715, -0.072),
    vec3(-0.213, 0.285, -0.072),
    vec3(-0.213, -0.715, 0.928)
);`,
                main: `
    float angle = (u_hue / 180.0) * 3.14159265358979323846264;
    v_hueRotation = lummat + cos(angle) * cosmat + sin(angle) * sinmat;
    v_saturation = lummat + satmat * u_saturation;`
            },
            fragment: {
                uniform: {
                    u_hueEnabled: 'bool',
                    u_satEnabled: 'bool',
                    u_hue: 'float',
                    u_saturation: 'float'
                },
                main: `
    if (u_hueEnabled) {
        color = vec3(
            dot(color, v_hueRotation[0]),
            dot(color, v_hueRotation[1]),
            dot(color, v_hueRotation[2])
        );
    }

    if (u_satEnabled) {
        color = vec3(
            dot(color, v_saturation[0]),
            dot(color, v_saturation[1]),
            dot(color, v_saturation[2])
        );
    }

    color = clamp(color, 0.0, 1.0);`
            },
            varying: {
                v_hueRotation: 'mat3',
                v_saturation: 'mat3'
            },

            get hue () {
                return this.uniforms[2].data[0];
            },
            set hue (h) {
                this.uniforms[2].data[0] = parseFloat(h);
            },
            get saturation () {
                return this.uniforms[3].data[0];
            },
            set saturation (s) {
                this.uniforms[3].data[0] = parseFloat(Math.max(0, s));
            },
            get hueDisabled () {
                return !this.uniforms[0].data[0];
            },
            set hueDisabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get saturationDisabled () {
                return !this.uniforms[1].data[0];
            },
            set saturationDisabled (b) {
                this.uniforms[1].data[0] = +!b;
            },
            uniforms: [
                {
                    name: 'u_hueEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_satEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_hue',
                    type: 'f',
                    data: [hue]
                },
                {
                    name: 'u_saturation',
                    type: 'f',
                    data: [saturation]
                }
            ]
        };
    }

    /**
     * @function duotone
     * @param {Object} [params]
     * @param {number[]} [params.dark=[0.741, 0.0431, 0.568, 1]] initial dark color to use.
     * @param {number[]} [params.light=[0.988, 0.733, 0.051, 1]] initial light color to use.
     * @returns {duotoneEffect}
     *
     * @example duotone({dark: [0.2, 0.11, 0.33, 1], light: [0.88, 0.78, 0.43, 1]})
     */
    function duotone ({
        dark = [0.7411764706, 0.0431372549, 0.568627451, 1],
        light = [0.9882352941, 0.7333333333, 0.05098039216, 1]
     } = {}) {
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
                main: `
    if (u_duotoneEnabled) {
        vec3 gray = vec3(dot(lumcoeff, color));
        color = mix(u_dark.rgb, u_light.rgb, gray);
    }`
            },
            get light () {
                return this.uniforms[1].data.slice(0);
            },
            set light (l) {
                l.forEach((c, i) => {
                    if ( ! Number.isNaN(c) ) {
                        this.uniforms[1].data[i] = c;
                    }
                });
            },
            get dark () {
                return this.uniforms[2].data.slice(0);
            },
            set dark (d) {
                d.forEach((c, i) => {
                    if ( ! Number.isNaN(c) ) {
                        this.uniforms[2].data[i] = c;
                    }
                });
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            uniforms: [
                {
                    name: 'u_duotoneEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_light',
                    type: 'f',
                    data: light
                },
                {
                    name: 'u_dark',
                    type: 'f',
                    data: dark
                }
            ]
        };
    }

    /**
     * @function displacement
     * @property {string} CLAMP stretch the last value to the edge. This is the default behavior.
     * @property {string} DISCARD discard values beyond the edge of the media - leaving a transparent pixel.
     * @property {string} WRAP continue rendering values from opposite direction when reaching the edge.
     * @param {Object} [params]
     * @param {string} [params.wrap] wrapping method to use. Defaults to `displacement.CLAMP`.
     * @param {{x: number, y: number}} [params.scale] initial scale to use for x and y displacement. Defaults to `{x: 0.0, y: 0.0}` which means no displacement.
     * @returns {displacementEffect}
     *
     * @example displacement({wrap: displacement.DISCARD, scale: {x: 0.5, y: -0.5}})
     */
    function displacement ({
       wrap = WRAP_METHODS.CLAMP,
        scale
    } = {}) {
        const { x: sx, y: sy } = (scale || { x: 0.0, y: 0.0 });

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
                main: `
    v_displacementMapTexCoord = a_displacementMapTexCoord;`
            },
            fragment: {
                uniform: {
                    u_displacementEnabled: 'bool',
                    u_dispMap: 'sampler2D',
                    u_dispScale: 'vec2'
                },
                source: `
    if (u_displacementEnabled) {
        vec3 dispMap = texture2D(u_dispMap, v_displacementMapTexCoord).rgb - 0.5;
        vec2 dispVec = vec2(sourceCoord.x + u_dispScale.x * dispMap.r, sourceCoord.y + u_dispScale.y * dispMap.g);
        ${wrap}
        sourceCoord = dispVec;
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get scale () {
                const [x, y] = this.uniforms[2].data;
                return {x, y};
            },
            set scale ({x, y}) {
                if ( typeof x !== 'undefined' )
                    this.uniforms[2].data[0] = x;
                if ( typeof y !== 'undefined' )
                    this.uniforms[2].data[1] = y;
            },
            get map () {
                return this.textures[0].data;
            },
            set map (img) {
                this.textures[0].data = img;
            },
            varying: {
                v_displacementMapTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_displacementEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_dispMap',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_dispScale',
                    type: 'f',
                    data: [sx, sy]
                }
            ],
            attributes: [
                {
                    name: 'a_displacementMapTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: 'RGB'
                }
            ]
        };
    }

    const WRAP_METHODS =  {
        CLAMP: `dispVec = clamp(dispVec, 0.0, 1.0);`,
        DISCARD: `if (dispVec.x < 0.0 || dispVec.x > 1.0 || dispVec.y > 1.0 || dispVec.y < 0.0) { discard; }`,
        WRAP: `dispVec = mod(dispVec, 1.0);`
    };

    displacement.CLAMP = WRAP_METHODS.CLAMP;
    displacement.DISCARD = WRAP_METHODS.DISCARD;
    displacement.WRAP = WRAP_METHODS.WRAP;

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
    var perlinNoise = `
vec3 mod289 (vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289 (vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute (vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt (vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade (vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float noise (vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}`;

    /*!
     * Cellular noise ("Worley noise") in 3D in GLSL.
     * Author:  Stefan Gustavson (stefan.gustavson@liu.se)
     * Version: Stefan Gustavson 2011-04-19
     *
     * Many thanks to Ian McEwan of Ashima Arts for the
     * ideas for permutation and gradient selection.
     *
     * Copyright (c) 2011 Stefan Gustavson. All rights reserved.
     * Distributed under the MIT license. See LICENSE file.
     * https://github.com/ashima/webgl-noise
     */
    /**
     * Cellular noise ("Worley noise") in 3D in GLSL. Exposes a `noise(vec3 P)` function for use inside fragment shaders.
     */
    var cellular = `
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  // Modulo 7 without a division
  vec3 mod7(vec3 x) {
    return x - floor(x * (1.0 / 7.0)) * 7.0;
  }

  // Permutation polynomial: (34x^2 + x) mod 289
  vec3 permute(vec3 x) {
    return mod289((34.0 * x + 1.0) * x);
  }

  float noise(vec3 P) {
    #define K 0.142857142857 // 1/7
    #define Ko 0.428571428571 // 1/2-K/2
    #define K2 0.020408163265306 // 1/(7*7)
    #define Kz 0.166666666667 // 1/6
    #define Kzo 0.416666666667 // 1/2-1/6*2
    #define jitter 1.0 // smaller jitter gives more regular pattern

    vec3 Pi = mod289(floor(P));
    vec3 Pf = fract(P) - 0.5;

    vec3 Pfx = Pf.x + vec3(1.0, 0.0, -1.0);
    vec3 Pfy = Pf.y + vec3(1.0, 0.0, -1.0);
    vec3 Pfz = Pf.z + vec3(1.0, 0.0, -1.0);

    vec3 p = permute(Pi.x + vec3(-1.0, 0.0, 1.0));
    vec3 p1 = permute(p + Pi.y - 1.0);
    vec3 p2 = permute(p + Pi.y);
    vec3 p3 = permute(p + Pi.y + 1.0);

    vec3 p11 = permute(p1 + Pi.z - 1.0);
    vec3 p12 = permute(p1 + Pi.z);
    vec3 p13 = permute(p1 + Pi.z + 1.0);

    vec3 p21 = permute(p2 + Pi.z - 1.0);
    vec3 p22 = permute(p2 + Pi.z);
    vec3 p23 = permute(p2 + Pi.z + 1.0);

    vec3 p31 = permute(p3 + Pi.z - 1.0);
    vec3 p32 = permute(p3 + Pi.z);
    vec3 p33 = permute(p3 + Pi.z + 1.0);

    vec3 ox11 = fract(p11*K) - Ko;
    vec3 oy11 = mod7(floor(p11*K))*K - Ko;
    vec3 oz11 = floor(p11*K2)*Kz - Kzo; // p11 < 289 guaranteed

    vec3 ox12 = fract(p12*K) - Ko;
    vec3 oy12 = mod7(floor(p12*K))*K - Ko;
    vec3 oz12 = floor(p12*K2)*Kz - Kzo;

    vec3 ox13 = fract(p13*K) - Ko;
    vec3 oy13 = mod7(floor(p13*K))*K - Ko;
    vec3 oz13 = floor(p13*K2)*Kz - Kzo;

    vec3 ox21 = fract(p21*K) - Ko;
    vec3 oy21 = mod7(floor(p21*K))*K - Ko;
    vec3 oz21 = floor(p21*K2)*Kz - Kzo;

    vec3 ox22 = fract(p22*K) - Ko;
    vec3 oy22 = mod7(floor(p22*K))*K - Ko;
    vec3 oz22 = floor(p22*K2)*Kz - Kzo;

    vec3 ox23 = fract(p23*K) - Ko;
    vec3 oy23 = mod7(floor(p23*K))*K - Ko;
    vec3 oz23 = floor(p23*K2)*Kz - Kzo;

    vec3 ox31 = fract(p31*K) - Ko;
    vec3 oy31 = mod7(floor(p31*K))*K - Ko;
    vec3 oz31 = floor(p31*K2)*Kz - Kzo;

    vec3 ox32 = fract(p32*K) - Ko;
    vec3 oy32 = mod7(floor(p32*K))*K - Ko;
    vec3 oz32 = floor(p32*K2)*Kz - Kzo;

    vec3 ox33 = fract(p33*K) - Ko;
    vec3 oy33 = mod7(floor(p33*K))*K - Ko;
    vec3 oz33 = floor(p33*K2)*Kz - Kzo;

    vec3 dx11 = Pfx + jitter*ox11;
    vec3 dy11 = Pfy.x + jitter*oy11;
    vec3 dz11 = Pfz.x + jitter*oz11;

    vec3 dx12 = Pfx + jitter*ox12;
    vec3 dy12 = Pfy.x + jitter*oy12;
    vec3 dz12 = Pfz.y + jitter*oz12;

    vec3 dx13 = Pfx + jitter*ox13;
    vec3 dy13 = Pfy.x + jitter*oy13;
    vec3 dz13 = Pfz.z + jitter*oz13;

    vec3 dx21 = Pfx + jitter*ox21;
    vec3 dy21 = Pfy.y + jitter*oy21;
    vec3 dz21 = Pfz.x + jitter*oz21;

    vec3 dx22 = Pfx + jitter*ox22;
    vec3 dy22 = Pfy.y + jitter*oy22;
    vec3 dz22 = Pfz.y + jitter*oz22;

    vec3 dx23 = Pfx + jitter*ox23;
    vec3 dy23 = Pfy.y + jitter*oy23;
    vec3 dz23 = Pfz.z + jitter*oz23;

    vec3 dx31 = Pfx + jitter*ox31;
    vec3 dy31 = Pfy.z + jitter*oy31;
    vec3 dz31 = Pfz.x + jitter*oz31;

    vec3 dx32 = Pfx + jitter*ox32;
    vec3 dy32 = Pfy.z + jitter*oy32;
    vec3 dz32 = Pfz.y + jitter*oz32;

    vec3 dx33 = Pfx + jitter*ox33;
    vec3 dy33 = Pfy.z + jitter*oy33;
    vec3 dz33 = Pfz.z + jitter*oz33;

    vec3 d11 = dx11 * dx11 + dy11 * dy11 + dz11 * dz11;
    vec3 d12 = dx12 * dx12 + dy12 * dy12 + dz12 * dz12;
    vec3 d13 = dx13 * dx13 + dy13 * dy13 + dz13 * dz13;
    vec3 d21 = dx21 * dx21 + dy21 * dy21 + dz21 * dz21;
    vec3 d22 = dx22 * dx22 + dy22 * dy22 + dz22 * dz22;
    vec3 d23 = dx23 * dx23 + dy23 * dy23 + dz23 * dz23;
    vec3 d31 = dx31 * dx31 + dy31 * dy31 + dz31 * dz31;
    vec3 d32 = dx32 * dx32 + dy32 * dy32 + dz32 * dz32;
    vec3 d33 = dx33 * dx33 + dy33 * dy33 + dz33 * dz33;

    vec3 d1 = min(min(d11,d12), d13);
    vec3 d2 = min(min(d21,d22), d23);
    vec3 d3 = min(min(d31,d32), d33);
    vec3 d = min(min(d1,d2), d3);
    d.x = min(min(d.x,d.y),d.z);

    return sqrt(d.x);
  }
`;

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
    var simplex = `
vec3 mod289 (vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289 (vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute (vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt (vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float noise (vec3 v) { 
    const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
}`;

    /**
     * @function turbulence
     * @property {string} COLOR
     * @property {string} ALPHA
     * @param {object} params
     * @param {string} params.noise 3D noise implementation to use.
     * @param {string} [params.output] how to output the `turbulenceValue` variable. Use `turbulence.COLOR` or `turbulence.ALPHA` for outputting to color or alpha correspondingly. Defaults to `turbulence.COLOR`.
     * @param {{x: number, y: number}} [params.frequency={x: 0.0, y: 0.0}] initial frequencies to use for x and y axes.
     * @param {number} [params.octaves=1] initial number of octaves to use for turbulence noise generation.
     * @param {boolean} [params.isFractal=false] initial number of octaves to use for turbulence noise generation.
     * @param {number} [params.time=0] initial time for controlling initial noise value.
     * @returns {turbulenceEffect}
     *
     * @example turbulence({noise: kampos.noise.simplex, output: turbulence.COLOR, octaves: 4, isFractal: true})
     */
    function turbulence ({
        noise,
        output= OUTPUT_TYPES.COLOR,
        frequency,
        octaves = 1,
        isFractal= false,
        time = 0.0
    }) {
        const { x: fx, y: fy } = (frequency || { x: 0.0, y: 0.0 });

        /**
         * @typedef {Object} turbulenceEffect
         * @property {{x: number?, y: number?}} frequency
         * @property {number} octaves
         * @property {boolean} isFractal
         *
         * @description Generates a turbulence/fractal noise value stored into `turbulenceValue`.
         * Depends on a `noise(vec3 P)` function to be declared and injected via the `noise` param, for example, simply supplying the {@link perlinNoiseEffect}.
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
                constant: `
${noise}

const int MAX_OCTAVES = 9;

float turbulence (vec3 seed, vec2 frequency, int numOctaves, bool isFractal) {
    float sum = 0.0;
    vec3 position = vec3(0.0);
    position.x = seed.x * frequency.x;
    position.y = seed.y * frequency.y;
    position.z = seed.z;
    float ratio = 1.0;

    for (int octave = 0; octave <= MAX_OCTAVES; octave++) {
        if (octave > numOctaves) {
            break;
        }

        if (isFractal) {
            sum += noise(position) / ratio;
        }
        else {
            sum += abs(noise(position)) / ratio;
        }
        position.x *= 2.0;
        position.y *= 2.0;
        ratio *= 2.0;
    }

    if (isFractal) {
        sum = (sum + 1.0) / 2.0;
    }

    return clamp(sum, 0.0, 1.0);
}`,
                main: `
    vec3 turbulenceSeed = vec3(gl_FragCoord.xy, u_time * 0.0001);
    float turbulenceValue = turbulence(turbulenceSeed, u_turbulenceFrequency, u_turbulenceOctaves, u_isFractal);
    ${output || ''}`
            },
            get frequency () {
                const [x, y] = this.uniforms[0].data;
                return {x, y};
            },
            set frequency ({x, y}) {
                if ( typeof x !== 'undefined' )
                    this.uniforms[0].data[0] = x;
                if ( typeof y !== 'undefined' )
                    this.uniforms[0].data[1] = y;
            },
            get octaves () {
                return this.uniforms[1].data[0];
            },
            set octaves (value) {
                this.uniforms[1].data[0] = Math.max(0, parseInt(value));
            },
            get isFractal () {
                return !!this.uniforms[2].data[0];
            },
            set isFractal (toggle) {
                this.uniforms[2].data[0] = +toggle;
            },
            get time () {
                return this.uniforms[3].data[0];
            },
            set time (value) {
                this.uniforms[3].data[0] = Math.max(0, parseFloat(value));
            },
            uniforms: [
                {
                    name: 'u_turbulenceFrequency',
                    type: 'f',
                    data: [fx, fy]
                },
                {
                    name: 'u_turbulenceOctaves',
                    type: 'i',
                    data: [octaves]
                },
                {
                    name: 'u_isFractal',
                    type: 'i',
                    data: [+!!isFractal]
                },
                {
                    name: 'u_time',
                    type: 'f',
                    data: [time]
                }
            ]
        };
    }

    const OUTPUT_TYPES = {
        COLOR: 'color = vec3(turbulenceValue);',
        ALPHA: 'alpha = turbulenceValue;'
    };

    turbulence.COLOR = OUTPUT_TYPES.COLOR;
    turbulence.ALPHA = OUTPUT_TYPES.ALPHA;

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
                main: `
    v_transitionToTexCoord = a_transitionToTexCoord;`
            },
            fragment: {
                uniform: {
                    u_transitionEnabled: 'bool',
                    u_transitionProgress: 'float',
                    u_transitionTo: 'sampler2D'
                },
                main: `
    if (u_transitionEnabled) {
        vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
        color = mix(color, targetPixel.rgb, u_transitionProgress);
        alpha = mix(alpha, targetPixel.a, u_transitionProgress);
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get progress () {
                return this.uniforms[2].data[0];
            },
            set progress (p) {
                this.uniforms[2].data[0] = p;
            },
            get to () {
                return this.textures[0].data;
            },
            set to (media) {
                this.textures[0].data = media;
            },
            varying: {
                v_transitionToTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_transitionEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionTo',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionProgress',
                    type: 'f',
                    data: [0]
                }
            ],
            attributes: [
                {
                    name: 'a_transitionToTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: 'RGBA',
                    update: true
                }
            ]
        };
    }

    /**
     * @function displacementTransition
     * @param {Object} [params]
     * @param {{x: number=0.0, y: number=0.0}} [params.sourceScale] initial displacement scale values of source media
     * @param {{x: number=0.0, y: number=0.0}} [params.toScale] initial displacement scale values of target media
     * @returns {displacementTransitionEffect}
     * @example displacementTransition()
     */
    function displacementTransition ({sourceScale, toScale} = {}) {
        const { x: sSx, y: sSy } = (sourceScale || { x: 0.0, y: 0.0 });
        const { x: tSx, y: tSy } = (toScale || { x: 0.0, y: 0.0 });

        /**
         * @typedef {Object} displacementTransitionEffect
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map displacement map to use
         * @property {number} progress number between 0.0 and 1.0
         * @property {{x: number?, y: number?}} sourceScale displacement scale values of source media
         * @property {{x: number?, y: number?}} toScale displacement scale values of target media
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
                main: `
    v_transitionToTexCoord = a_transitionToTexCoord;
    v_transitionDispMapTexCoord = a_transitionDispMapTexCoord;`
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
                source: `
    vec3 transDispMap = vec3(1.0);
    vec2 transDispVec = vec2(0.0);

    if (u_transitionEnabled) {
        // read the displacement texture once and create the displacement map
        transDispMap = texture2D(u_transitionDispMap, v_transitionDispMapTexCoord).rgb - 0.5;

        // prepare the source coordinates for sampling
        transDispVec = vec2(u_sourceDispScale.x * transDispMap.r, u_sourceDispScale.y * transDispMap.g);
        sourceCoord = clamp(sourceCoord + transDispVec * u_transitionProgress, 0.0, 1.0);
    }`,
                main: `
    if (u_transitionEnabled) {
        // prepare the target coordinates for sampling
        transDispVec = vec2(u_toDispScale.x * transDispMap.r, u_toDispScale.y * transDispMap.g);
        vec2 targetCoord = clamp(v_transitionToTexCoord + transDispVec * (1.0 - u_transitionProgress), 0.0, 1.0);

        // sample the target
        vec4 targetPixel = texture2D(u_transitionTo, targetCoord);

        // mix the results of source and target
        color = mix(color, targetPixel.rgb, u_transitionProgress);
        alpha = mix(alpha, targetPixel.a, u_transitionProgress);
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get progress () {
                return this.uniforms[3].data[0];
            },
            set progress (p) {
                this.uniforms[3].data[0] = p;
            },
            get sourceScale () {
                const [x, y] = this.uniforms[4].data;
                return {x, y};
            },
            set sourceScale ({x, y}) {
                if ( typeof x !== 'undefined' )
                    this.uniforms[4].data[0] = x;
                if ( typeof y !== 'undefined' )
                    this.uniforms[4].data[1] = y;
            },
            get toScale () {
                const [x, y] = this.uniforms[5].data;
                return {x, y};
            },
            set toScale ({x, y}) {
                if ( typeof x !== 'undefined' )
                    this.uniforms[5].data[0] = x;
                if ( typeof y !== 'undefined' )
                    this.uniforms[5].data[1] = y;
            },
            get to () {
                return this.textures[0].data;
            },
            set to (media) {
                this.textures[0].data = media;
            },
            get map () {
                return this.textures[1].data;
            },
            set map (img) {
                this.textures[1].data = img;
            },
            varying: {
                v_transitionToTexCoord: 'vec2',
                v_transitionDispMapTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_transitionEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionTo',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionDispMap',
                    type: 'i',
                    data: [2]
                },
                {
                    name: 'u_transitionProgress',
                    type: 'f',
                    data: [0]
                },
                {
                    name: 'u_sourceDispScale',
                    type: 'f',
                    data: [sSx, sSy]
                },
                {
                    name: 'u_toDispScale',
                    type: 'f',
                    data: [tSx, tSy]
                }
            ],
            attributes: [
                {
                    name: 'a_transitionToTexCoord',
                    extends: 'a_texCoord'
                },
                {
                    name: 'a_transitionDispMapTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: 'RGBA',
                    update: true
                },
                {
                    format: 'RGB'
                }
            ]
        };
    }

    /**
     * @function dissolveTransition
     * @param {Object} [params]
     * @param {number} [params.low=0.0] initial lower edge of intersection step
     * @param {number} [params.high=0.01] initial higher edge of intersection step
     * @param {number[]} [params.color=[0, 0, 0, 0]] color to transition to if not transitioning to media
     * @param {boolean} [params.textureEnabled=true] whether to enable transition to texture instead of color
     * @returns {dissolveTransitionEffect}
     * @example dissolveTransition()
     */
    function dissolve ({
        low = 0.0,
        high = 0.01,
        color = [0.0, 0.0, 0.0, 0.0],
        textureEnabled = true
    } = {}) {
        /**
         * @typedef {Object} dissolveTransitionEffect
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
         * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} map dissolve map to use
         * @property {number[]} color a solid color to transition to with alpha channel, Array of 4 number in range [0.0, 1.0]
         * @property {number} low lower edge of intersection step, in range [0.0, 1.0]
         * @property {number} high higher edge of intersection step, in range [0.0, 1.0]
         * @property {number} progress number in range [0.0, 1.0]
         * @property {boolean} textureEnabled whether to enable transitioning to texture instead of color
         * @property {boolean} disabled
         *
         * @example
         * const img = new Image();
         * img.src = 'dissolve.jpg';
         * effect.map = img;
         * effect.to = document.querySelector('#video-to');
         * effect.progress = 0.5;
         */
        return {
            vertex: {
                attribute: {
                    a_transitionToTexCoord: 'vec2',
                    a_transitionDissolveMapTexCoord: 'vec2'
                },
                main: `
    v_transitionToTexCoord = a_transitionToTexCoord;
    v_transitionDissolveMapTexCoord = a_transitionDissolveMapTexCoord;`
            },
            fragment: {
                uniform: {
                    u_transitionEnabled: 'bool',
                    u_dissolveToTextureEnabled: 'bool',
                    u_transitionProgress: 'float',
                    u_dissolveLowEdge: 'float',
                    u_dissolveHighEdge: 'float',
                    u_transitionColorTo: 'vec4',
                    u_transitionTo: 'sampler2D',
                    u_transitionDissolveMap: 'sampler2D'
                },
                main: `
    if (u_transitionEnabled) {
        vec4 targetPixel = u_transitionColorTo;

        if (u_dissolveToTextureEnabled) {
            targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
        }

        vec3 transDissolveMapColor = texture2D(u_transitionDissolveMap, v_transitionDissolveMapTexCoord).rgb;
        float transDissolveMapAlpha = dot(transDissolveMapColor, lumcoeff);
        vec4 transDissolveMap = vec4(transDissolveMapColor, transDissolveMapAlpha);

        float edgeDelta = u_dissolveHighEdge - u_dissolveLowEdge;
        float dissolveProgress = u_transitionProgress * (1.0 + edgeDelta);
        vec4 dissolveVector = smoothstep(u_dissolveLowEdge, u_dissolveHighEdge, clamp(transDissolveMap - 1.0 + dissolveProgress , 0.0, 1.0));

        // color = dissolveVector.rgb; // debug
        color = mix(color, targetPixel.rgb, dissolveVector.rgb);
        alpha = mix(alpha, targetPixel.a, dissolveVector.a);
    }`
            },
            get disabled () {
                return !this.uniforms[0].data[0];
            },
            set disabled (b) {
                this.uniforms[0].data[0] = +!b;
            },
            get textureEnabled () {
                return !this.uniforms[7].data[0];
            },
            set textureEnabled (b) {
                this.uniforms[7].data[0] = +!!b;
            },
            get progress () {
                return this.uniforms[3].data[0];
            },
            set progress (p) {
                this.uniforms[3].data[0] = Math.min(Math.max(p, 0.0), 1.0);
            },
            get color () {
                return this.uniforms[6].data.slice();
            },
            set color (colorTo) {
                colorTo.forEach((c, i) => {
                    if ( ! Number.isNaN(c) ) {
                        this.uniforms[6].data[i] = c;
                    }
                });
            },
            get to () {
                return this.textures[0].data;
            },
            set to (media) {
                this.textures[0].data = media;
            },
            get map () {
                return this.textures[1].data;
            },
            set map (img) {
                this.textures[1].data = img;
            },
            get low () {
                return this.uniforms[4].data[0];
            },
            set low (low) {
                this.uniforms[4].data[0] = Math.min(Math.max(low, 0.0), this.high);
            },
            get high () {
                return this.uniforms[5].data[0];
            },
            set high (high) {
                this.uniforms[5].data[0] = Math.min(Math.max(high, this.low), 1.0);
            },
            varying: {
                v_transitionToTexCoord: 'vec2',
                v_transitionDissolveMapTexCoord: 'vec2'
            },
            uniforms: [
                {
                    name: 'u_transitionEnabled',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionTo',
                    type: 'i',
                    data: [1]
                },
                {
                    name: 'u_transitionDissolveMap',
                    type: 'i',
                    data: [2]
                },
                {
                    name: 'u_transitionProgress',
                    type: 'f',
                    data: [0]
                },
                {
                    name: 'u_dissolveLowEdge',
                    type: 'f',
                    data: [low]
                },
                {
                    name: 'u_dissolveHighEdge',
                    type: 'f',
                    data: [high]
                },
                {
                    name: 'u_transitionColorTo',
                    type: 'f',
                    data: color
                },
                {
                    name: 'u_dissolveToTextureEnabled',
                    type: 'i',
                    data: [+!!textureEnabled]
                }
            ],
            attributes: [
                {
                    name: 'a_transitionToTexCoord',
                    extends: 'a_texCoord'
                },
                {
                    name: 'a_transitionDissolveMapTexCoord',
                    extends: 'a_texCoord'
                }
            ],
            textures: [
                {
                    format: 'RGBA',
                    update: true
                },
                {
                    format: 'RGB',
                    update: false
                }
            ]
        };
    }

    var core = {
        init,
        draw,
        destroy,
        resize,
        getWebGLContext,
        createTexture
    };

    const vertexSimpleTemplate = ({
        uniform = '',
        attribute = '',
        varying = '',
        constant = '',
        main = ''
    }) => `
precision highp float;
${uniform}
${attribute}
attribute vec2 a_position;
${varying}

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
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
        main = ''
    }) => `
precision highp float;
${uniform}
${attribute}
attribute vec2 a_texCoord;
attribute vec2 a_position;
${varying}
varying vec2 v_texCoord;

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
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
        source = ''
    }) => `
precision highp float;
${varying}
${uniform}

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
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
        source = ''
    }) => `
precision highp float;
${varying}
varying vec2 v_texCoord;
${uniform}
uniform sampler2D u_source;

const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);
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
        mirror: 'MIRRORED_REPEAT'
    };

    const SHADER_ERROR_TYPES = {
        vertex: 'VERTEX',
        fragment: 'FRAGMENT'
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
     * @param {boolean} [config.noSource]
     * @return {{gl: WebGLRenderingContext, data: kamposSceneData, [dimensions]: {width: number, height: number}}}
     */
    function init ({gl, plane, effects, dimensions, noSource}) {

        const programData = _initProgram(gl, plane, effects, noSource);

        return {gl, data: programData, dimensions: dimensions || {}};
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
    function getWebGLContext (canvas) {
        let context;

        const config = {
            preserveDrawingBuffer: false, // should improve performance - https://stackoverflow.com/questions/27746091/preservedrawingbuffer-false-is-it-worth-the-effort
            antialias: false, // should improve performance
            depth: false, // turn off for explicitness - and in some cases perf boost
            stencil: false // turn off for explicitness - and in some cases perf boost
        };

        context = canvas.getContext('webgl', config);

        if ( context ) {
            WEBGL_CONTEXT_SUPPORTED = true;
        }
        else if ( ! WEBGL_CONTEXT_SUPPORTED ) {
            context = canvas.getContext('experimental-webgl', config);
        }
        else {
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
    function resize (gl, dimensions) {
        const canvas = gl.canvas;
        const realToCSSPixels = 1; //window.devicePixelRatio;
        const {width, height} = dimensions || {};
        let displayWidth, displayHeight;

        if ( width && height ) {
            displayWidth = width;
            displayHeight = height;
        }
        else {
            // Lookup the size the browser is displaying the canvas.
            displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
            displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
        }

        // Check if the canvas is not the same size.
        if ( canvas.width !== displayWidth ||
             canvas.height !== displayHeight ) {

            // Make the canvas the same size
            canvas.width  = displayWidth;
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
     * @param {{width: number, height: number}} dimensions
     */
    function draw (gl, plane = {}, media, data, dimensions) {
        const {program, source, attributes, uniforms, textures, extensions, vao} = data;
        const {xSegments = 1, ySegments = 1} = plane;

        if ( media && source && source.texture ) {
            // bind the source texture
            gl.bindTexture(gl.TEXTURE_2D, source.texture);

            // read source data into texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
        }

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        if ( vao ) {
            extensions.vao.bindVertexArrayOES(vao);
        }
        else {
            // set attribute buffers with data
            _enableVertexAttributes(gl, attributes);
        }

        // set uniforms with data
        _setUniforms(gl, uniforms);

        let startTex = gl.TEXTURE0;

        if ( source ) {
            gl.activeTexture(startTex);
            gl.bindTexture(gl.TEXTURE_2D, source.texture);
            startTex = gl.TEXTURE1;
        }

        if ( textures ) {
            for ( let i = 0; i < textures.length; i++ ) {
                gl.activeTexture(startTex + i);

                const tex = textures[i];
                gl.bindTexture(gl.TEXTURE_2D, tex.texture);

                if ( tex.update ) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl[tex.format], gl[tex.format], gl.UNSIGNED_BYTE, tex.data);
                }
            }
        }

        // Draw the rectangles
        gl.drawArrays(gl.TRIANGLES, 0, 6 * xSegments * ySegments);
    }

    /**
     * Free all resources attached to a specific webgl context.
     *
     * @private
     * @param {WebGLRenderingContext} gl
     * @param {kamposSceneData} data
     */
    function destroy (gl, data) {
        const {program, vertexShader, fragmentShader, source, attributes, extensions, vao} = data;

        // delete buffers
        (attributes || []).forEach(attr => gl.deleteBuffer(attr.buffer));

        if ( vao )
            extensions.vao.deleteVertexArrayOES(vao);

        // delete texture
        if ( source && source.texture )
            gl.deleteTexture(source.texture);

        // delete program
        gl.deleteProgram(program);

        // delete shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }

    function _initProgram (gl, plane, effects, noSource=false) {
        const source = noSource ? null : {
            texture: createTexture(gl).texture,
            buffer: null
        };

        if ( source ) {
            // flip Y axis for source texture
            gl.bindTexture(gl.TEXTURE_2D, source.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        }

        const data = _mergeEffectsData(plane, effects, noSource);
        const vertexSrc = _stringifyShaderSrc(data.vertex, noSource ? vertexSimpleTemplate : vertexMediaTemplate);
        const fragmentSrc = _stringifyShaderSrc(data.fragment, noSource ? fragmentSimpleTemplate : fragmentMediaTemplate);

        // compile the GLSL program
        const {program, vertexShader, fragmentShader, error, type} = _getWebGLProgram(gl, vertexSrc, fragmentSrc);

        if ( error ) {
            throw new Error(`${type} error:: ${error}\n${type === SHADER_ERROR_TYPES.fragment ? fragmentSrc : vertexSrc}`);
        }

        let vaoExt, vao;
        try {
            vaoExt = gl.getExtension('OES_vertex_array_object');
            vao = vaoExt.createVertexArrayOES();
            vaoExt.bindVertexArrayOES(vao);
        }
        catch (e) {
            // ignore
        }

        // setup the vertex data
        const attributes = _initVertexAttributes(gl, program, data.attributes);

        if ( vao ) {
            _enableVertexAttributes(gl, attributes);
            vaoExt.bindVertexArrayOES(null);
        }

        // setup uniforms
        const uniforms = _initUniforms(gl, program, data.uniforms);

        return {
            extensions: {
                vao: vaoExt
            },
            program,
            vertexShader,
            fragmentShader,
            source,
            attributes,
            uniforms,
            textures: data.textures,
            vao
        };
    }

    function _mergeEffectsData (plane, effects, noSource= false) {
        return effects.reduce((result, config) => {
            const {attributes = [], uniforms = [], textures = [], varying = {}} = config;
            const merge = shader => Object.keys(config[shader] || {}).forEach(key => {
                if ( key === 'constant' || key === 'main' || key === 'source' ) {
                    result[shader][key] += config[shader][key] + '\n';
                }
                else {
                    result[shader][key] = {...result[shader][key], ...config[shader][key]};
                }
            });

            merge('vertex');
            merge('fragment');

            attributes.forEach(attribute => {
                const found = result.attributes.some((attr) => {
                    if ( attr.name === attribute.name ) {
                        Object.assign(attr, attribute);
                        return  true;
                    }
                });

                if ( ! found ) {
                    result.attributes.push(attribute);
                }
            });

            result.attributes.forEach((attr) => {
                if ( attr.extends ) {
                    const found = result.attributes.some(attrToExtend => {
                        if ( attrToExtend.name === attr.extends ) {
                            Object.assign(attr, attrToExtend, {name: attr.name});
                            return true;
                        }
                    });

                    if ( !found ) {
                        throw new Error(`Could not find attribute ${attr.extends} to extend`);
                    }
                }
            });

            result.uniforms.push(...uniforms);
            result.textures.push(...textures);

            Object.assign(result.vertex.varying, varying);
            Object.assign(result.fragment.varying, varying);

            return result;
        }, getEffectDefaults(plane, noSource));
    }

    function _getPlaneCoords({xEnd, yEnd, factor}, plane = {}) {
        const {xSegments = 1, ySegments = 1} = plane;
        const result = [];

        for (let i = 0; i < xSegments; i++) {
            for (let j = 0; j < ySegments; j++) {
                /* A */
                result.push(
                    xEnd * i / xSegments - factor,
                    yEnd * j / ySegments - factor
                );
                /* B */
                result.push(
                    xEnd * i / xSegments - factor,
                    yEnd * (j + 1) / ySegments - factor
                );
                /* C */
                result.push(
                    xEnd * (i + 1) / xSegments - factor,
                    yEnd * j / ySegments - factor
                );
                /* D */
                result.push(
                    xEnd * (i + 1) / xSegments - factor,
                    yEnd * j / ySegments - factor
                );
                /* E */
                result.push(
                    xEnd * i / xSegments - factor,
                    yEnd * (j + 1) / ySegments - factor
                );
                /* F */
                result.push(
                    xEnd * (i + 1) / xSegments - factor,
                    yEnd * (j + 1) / ySegments - factor
                );
            }
        }

        return result;
    }

    function getEffectDefaults (plane, noSource) {
        /*
         * Default uniforms
         */
        const uniforms = noSource ? [] : [
            {
                name: 'u_source',
                type: 'i',
                data: [0]
            }
        ];

        /*
         * Default attributes
         */
        const attributes = [
            {
                name: 'a_position',
                data: new Float32Array(_getPlaneCoords({xEnd: 2, yEnd: 2, factor: 1}, plane)),
                size: 2,
                type: 'FLOAT'
            }
        ];

        if ( ! noSource ) {
            attributes.push({
                name: 'a_texCoord',
                data: new Float32Array(_getPlaneCoords({xEnd: 1, yEnd: 1, factor: 0}, plane)),
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
            attributes,
            uniforms,
            /*
             * Default textures
             */
            textures: []
        };
    }

    function _stringifyShaderSrc (data, template) {
        const templateData = Object.entries(data)
            .reduce((result, [key, value]) => {
                if ( ['uniform', 'attribute', 'varying'].includes(key) ) {
                    result[key] = Object.entries(value)
                        .reduce((str, [name, type]) =>
                            str + `${key} ${type} ${name};\n`,
                            ''
                        );
                }
                else {
                    result[key] = value;
                }

                return result;
            }, {});

        return template(templateData);
    }

    function _getWebGLProgram (gl, vertexSrc, fragmentSrc) {
        const vertexShader = _createShader(gl, gl.VERTEX_SHADER, vertexSrc);
        const fragmentShader = _createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

        if ( vertexShader.error ) {
            return vertexShader;
        }

        if ( fragmentShader.error ) {
            return fragmentShader;
        }

        return _createProgram(gl, vertexShader, fragmentShader);
    }

    function _createProgram (gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if ( success ) {
            return {program, vertexShader, fragmentShader};
        }

        const exception = {
            error: gl.getProgramInfoLog(program),
            type: 'program'
        };

        gl.deleteProgram(program);

        return exception;
    }

    function _createShader (gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if ( success ) {
            return shader;
        }

        const exception = {
            error: gl.getShaderInfoLog(shader),
            type: type === gl.VERTEX_SHADER ? SHADER_ERROR_TYPES.vertex : SHADER_ERROR_TYPES.fragment
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
    function createTexture (gl, {width=1, height=1, data=null, format='RGBA', wrap='stretch'}={}) {
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the parameters so we can render any size image
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[_getTextureWrap(wrap.x || wrap)]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[_getTextureWrap(wrap.y || wrap)]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        if ( data ) {
            // Upload the image into the texture
            gl.texImage2D(gl.TEXTURE_2D, 0,gl[format], gl[format], gl.UNSIGNED_BYTE, data);
        }
        else {
            // Create empty texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[format], gl.UNSIGNED_BYTE, null);
        }

        return {texture, width, height, format};
    }

    function _createBuffer (gl, program, name, data) {
        const location = gl.getAttribLocation(program, name);
        const buffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        return {location, buffer};
    }

    function _initVertexAttributes (gl, program, data) {
        return (data || []).map(attr => {
            const {location, buffer} = _createBuffer(gl, program, attr.name, attr.data);

            return {
                name: attr.name,
                location,
                buffer,
                type: attr.type,
                size: attr.size
            };
        });
    }

    function _initUniforms (gl, program, uniforms) {
        return (uniforms || []).map(uniform => {
            const location = gl.getUniformLocation(program, uniform.name);

            return {
                location,
                size: uniform.size || uniform.data.length,
                type: uniform.type,
                data: uniform.data
            };
        });
    }

    function _setUniforms (gl, uniformData) {
        (uniformData || []).forEach(uniform => {
            let {size, type, location, data} = uniform;

            if ( type === 'i' ) {
                data = new Int32Array(data);
            }

            gl[`uniform${size}${type}v`](location, data);
        });
    }

    function _enableVertexAttributes (gl, attributes) {
        (attributes || []).forEach(attrib => {
            const {location, buffer, size, type} = attrib;

            gl.enableVertexAttribArray(location);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(location, size, gl[type], false, 0, 0);
        });
    }

    function _getTextureWrap (key) {
        return TEXTURE_WRAP[key] || TEXTURE_WRAP['stretch'];
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
     * @property {WebGLVertexArrayObjectOES} [vao]
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
    class Kampos {
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
            let {target, plane, effects, ticker, noSource} = config;

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

            const {x: xSegments = 1, y: ySegments = 1} = plane && plane.segments
                ? typeof plane.segments === 'object'
                    ? plane.segments
                    : {x: plane.segments, y: plane.segments}
                : {};
            this.plane = {
                xSegments,
                ySegments
            };

            const {data} = core.init({gl, plane: this.plane, effects, dimensions: this.dimensions, noSource});

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
         *
         * @param {number} time
         */
        draw (time) {
            if ( this.lostContext ) {
                const success = this.restoreContext();

                if ( ! success ) return;
            }

            const cb = this.config.beforeDraw;

            if ( cb && cb(time) === false )
                return;

            core.draw(this.gl, this.plane, this.media, this.data, this.dimensions);
        }

        /**
         * Starts the animation loop.
         *
         * If a {@link Ticker} is used, this instance will be added to that {@link Ticker}.
         *
         * @param {function} beforeDraw function to run before each draw call
         */
        play (beforeDraw) {
            this.config.beforeDraw = beforeDraw;

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
                if (this.config) {
                    this.config.target.removeEventListener('webglcontextlost', this._loseContext, true);
                    this.config.target.removeEventListener('webglcontextcreationerror', this._contextCreationError, false);
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
                    data: texture.data,
                    wrap: texture.wrap
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

    /**
     * Initialize a ticker instance for batching animation of multiple {@link Kampos} instances.
     *
     * @class Ticker
     */
    class Ticker {
        constructor () {
            this.pool = [];
        }

        /**
         * Starts the animation loop.
         */
        start () {
            if ( ! this.animationFrameId ) {
                const loop = (time) => {
                    this.animationFrameId = window.requestAnimationFrame(loop);
                    this.draw(time);
                };

                this.animationFrameId = window.requestAnimationFrame(loop);
            }
        }

        /**
         * Stops the animation loop.
         */
        stop () {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        /**
         * Invoke `.draw()` on all instances in the pool.
         *
         * @param {number} time
         */
        draw (time) {
            this.pool.forEach(instance => instance.draw(time));
        }

        /**
         * Add an instance to the pool.
         *
         * @param {Kampos} instance
         */
        add (instance) {
            const index = this.pool.indexOf(instance);

            if ( ! ~ index ) {
                this.pool.push(instance);
                instance.playing = true;
            }
        }

        /**
         * Remove an instance form the pool.
         *
         * @param {Kampos} instance
         */
        remove (instance) {
            const index = this.pool.indexOf(instance);

            if ( ~ index ) {
                this.pool.splice(index, 1);
                instance.playing = false;
            }
        }
    }

    var index = {
        effects: {
            alphaMask,
            blend,
            brightnessContrast,
            hueSaturation,
            duotone,
            displacement,
            turbulence
        },
        transitions: {
            fade,
            displacement: displacementTransition,
            dissolve
        },
        noise: {
            perlinNoise,
            simplex,
            cellular
        },
        Kampos,
        Ticker
    };

    return index;

}));
