export default function () {
    return {
        vertexSrc: {
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
        fragmentSrc: {
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
            return !this.uniforms[0].data;
        },
        set hueDisabled (b) {
            return this.uniforms[0].data[0] = +!b;
        },
        get saturationDisabled () {
            return !this.uniforms[1].data;
        },
        set saturationDisabled (b) {
            return this.uniforms[1].data[0] = +!b;
        },
        uniforms: [
            {
                name: 'u_hueEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            {
                name: 'u_satEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            /**
             * 0.0 is no change.
             * -180.0 is -180deg hue rotation.
             * 180.0 is +180deg hue rotation.
             *
             * @min -180.0
             * @max 180.0
             * @default 0.0
             */
            {
                name: 'u_hue',
                size: 1,
                type: 'f',
                data: [0.0]
            },
            /**
             * 1.0 is no change.
             * 0.0 is grayscale.
             *
             * @min 0.0
             * @default 1.0
             */
            {
                name: 'u_saturation',
                size: 1,
                type: 'f',
                data: [1.0]
            }
        ]
    };
};
