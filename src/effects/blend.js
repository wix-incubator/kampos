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
export default function ({
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
                data: new Float32Array([
                    0.0, 0.0,
                    0.0, 1.0,
                    1.0, 0.0,
                    1.0, 1.0]),
                size: 2,
                type: 'FLOAT'
            }
        ],
        textures: [
            {
                format: 'RGBA'
            }
        ]
    };
};
