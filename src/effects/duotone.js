/**
 * @function duotone
 * @param {Object} [params]
 * @param {number[]} [params.dark=[0.741, 0.0431, 0.568, 1]] initial dark color to use.
 * @param {number[]} [params.light=[0.988, 0.733, 0.051, 1]] initial light color to use.
 * @returns {duotoneEffect}
 *
 * @example duotone({dark: [0.2, 0.11, 0.33, 1], light: [0.88, 0.78, 0.43, 1]})
 */
export default function ({
    dark = [0.7411764706, 0.0431372549, 0.568627451, 1],
    light = [0.9882352941, 0.7333333333, 0.05098039216, 1],
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
                u_dark: 'vec4',
            },
            main: `
    if (u_duotoneEnabled) {
        vec3 gray = vec3(dot(lumcoeff, color));
        color = mix(u_dark.rgb, u_light.rgb, gray);
    }`,
        },
        get light() {
            return this.uniforms[1].data.slice(0);
        },
        set light(l) {
            l.forEach((c, i) => {
                if (!Number.isNaN(c)) {
                    this.uniforms[1].data[i] = c;
                }
            });
        },
        get dark() {
            return this.uniforms[2].data.slice(0);
        },
        set dark(d) {
            d.forEach((c, i) => {
                if (!Number.isNaN(c)) {
                    this.uniforms[2].data[i] = c;
                }
            });
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        uniforms: [
            {
                name: 'u_duotoneEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_light',
                type: 'f',
                data: light,
            },
            {
                name: 'u_dark',
                type: 'f',
                data: dark,
            },
        ],
    };
}
