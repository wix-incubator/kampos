export default function () {
    return {
        vertexSrc: {},
        fragmentSrc: {
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
        set brightness (b) {
            this.uniforms[2].data[0] = parseFloat(Math.max(0, b));
        },
        get contrast () {
            return this.uniforms[3].data[0];
        },
        set contrast (c) {
            this.uniforms[3].data[0] = parseFloat(Math.max(0, c));
        },
        get brightnessDisabled () {
            return !this.uniforms[0].data;
        },
        set brightnessDisabled (b) {
            return this.uniforms[0].data[0] = +!b;
        },
        get contrastDisabled () {
            return !this.uniforms[1].data;
        },
        set contrastDisabled (b) {
            return this.uniforms[1].data[0] = +!b;
        },
        uniforms: [
            {
                name: 'u_brEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            {
                name: 'u_ctEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            /**
             * 0.0 is completely black.
             * 1.0 is no change.
             *
             * @min 0.0
             * @default 1.0
             */
            {
                name: 'u_brightness',
                size: 1,
                type: 'f',
                data: [1.0]
            },
            /**
             * 0.0 is completely gray.
             * 1.0 is no change.
             *
             * @min 0.0
             * @default 1.0
             */
            {
                name: 'u_contrast',
                size: 1,
                type: 'f',
                data: [1.0]
            }
        ]
    };
};
