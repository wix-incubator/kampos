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
export default function ({ brightness = 1.0, contrast = 1.0 } = {}) {
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
                u_brightness: 'float',
            },
            constant: 'const vec3 half3 = vec3(0.5);',
            main: `
    if (u_brEnabled) {
        color *= u_brightness;
    }

    if (u_ctEnabled) {
        color = (color - half3) * u_contrast + half3;
    }

    color = clamp(color, 0.0, 1.0);`,
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
        uniforms: [
            {
                name: 'u_brEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_ctEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_brightness',
                type: 'f',
                data: [brightness],
            },
            {
                name: 'u_contrast',
                type: 'f',
                data: [contrast],
            },
        ],
    };
}
