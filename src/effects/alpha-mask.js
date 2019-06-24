export default function () {
    return {
        vertexSrc: {
            attribute: {
                a_alphaMaskTexCoord: 'vec2'
            },
            main: `
    v_alphaMaskTexCoord = a_alphaMaskTexCoord;`
        },
        fragmentSrc: {
            uniform: {
                u_alphaMaskEnabled: 'bool',
                u_mask: 'sampler2D'
            },
            main: `
    if (u_alphaMaskEnabled) {
        alpha *= texture2D(u_mask, v_alphaMaskTexCoord).a;
    }`
        },
        get disabled () {
            return !this.uniforms[0].data;
        },
        set disabled (b) {
            return this.uniforms[0].data[0] = +!b;
        },
        varying: {
            v_alphaMaskTexCoord: 'vec2'
        },
        uniforms: [
            {
                name: 'u_alphaMaskEnabled',
                size: 1,
                type: 'i',
                data: [1]
            },
            {
                name: 'u_mask',
                size: 1,
                type: 'i',
                data: [1]
            }
        ],
        attributes: [
            {
                name: 'a_alphaMaskTexCoord',
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
                format: 'ALPHA'
            }
        ]
    };
};
