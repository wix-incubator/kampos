export default function () {
    return {
        vertexSrc: {},
        fragmentSrc: {
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
            return !this.uniforms[0].data;
        },
        set disabled (b) {
            return this.uniforms[0].data[0] = +!b;
        },
        uniforms: [
            {
                name: 'u_duotoneEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            /**
             * Light tone
             */
            {
                name: 'u_light',
                size: 4,
                type: 'f',
                data: [0.9882352941, 0.7333333333, 0.05098039216, 1]
            },
            /**
             * Dark tone
             *
             */
            {
                name: 'u_dark',
                size: 4,
                type: 'f',
                data: [0.7411764706, 0.0431372549, 0.568627451, 1]
            }
        ]
    };
};
