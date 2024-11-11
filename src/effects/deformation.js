/**
 * @function deformation
 * @param {Object} [params]
 * @param {{radius: number}} [params.radius] initial radius to use for circle of effect boundaries. Defaults to 0 which means no effect.
 * @param {{aspectRatio: number}} [params.aspectRatio]
 * @param {string} [params.wrap] wrapping method to use. Defaults to `deformation.CLAMP`.
 * @param {string} [params.deformation] deformation method to use within the mask. Defaults to `deformation.NONE`.
 * @returns {deformationEffect}
 *
 * @example deformation({radius: 0.1, aspectRatio: 4 / 3, wrap: deformation.CLAMP, deformation: deformation.TUNNEL})
 */
function deformation({
    radius,
    aspectRatio,
    wrap = WRAP_METHODS.WRAP,
    deformation = DEFORMATION_METHODS.NONE,
} = {}) {
    const dataRadius = radius || 0;
    const dataAspectRatio = aspectRatio || 1;

    /**
     * @typedef {Object} deformationEffect
     * @property {boolean} disabled
     * @property {{x: number?, y: number?}} position
     * @property {number} radius
     * @property {number} aspectRatio
     *
     * @example
     * effect.disabled = true;
     * effect.position = {x: 0.4, y: 0.2};
     * effect.radius = 0.253;
     * effect.aspectRatio = 16 / 9;
     */
    return {
        fragment: {
            uniform: {
                u_deformationEnabled: 'bool',
                u_radius: 'float',
                u_position: 'vec2',
                u_aspectRatio: 'float',
            },
            constant: `const float PI = ${Math.PI};`,
            source: `
        vec2 diff = sourceCoord - u_position;
        float dist = diff.x * diff.x * u_aspectRatio * u_aspectRatio + diff.y * diff.y;
        float r = sqrt(dist);
        bool isInsideDeformation = dist < u_radius * u_radius;

        if (u_deformationEnabled) {
            if (isInsideDeformation) {
                vec2 dispVec = diff;
                float a = atan(diff.y, diff.x);
                ${deformation}
                dispVec = dispVec + u_position;
                ${wrap}
                sourceCoord = dispVec;
            }
        }`,
        //     main: `
        // if (isInsideDeformation) {
        //     color = mix(color, texture2D(u_source, v_texCoord).rgb, vec3(pow(r / u_radius, 4.0)));
        // }`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get radius() {
            return this.uniforms[1].data[0];
        },
        set radius(r) {
            if (typeof r !== 'undefined') this.uniforms[1].data[0] = x;
        },
        get aspectRatio() {
            return this.uniforms[3].data[0];
        },
        set aspectRatio(ar) {
            if (typeof ar !== 'undefined') this.uniforms[3].data[0] = ar;
        },
        get position() {
            const [x, y] = this.uniforms[2].data;
            return { x, y };
        },
        set position({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[2].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[2].data[1] = y;
        },
        uniforms: [
            {
                name: 'u_deformationEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_radius',
                type: 'f',
                data: [dataRadius],
            },
            {
                name: 'u_position',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'u_aspectRatio',
                type: 'f',
                data: [dataAspectRatio],
            },
        ],
    };
}

const WRAP_METHODS = {
    CLAMP: `dispVec = clamp(dispVec, 0.0, 1.0);`,
    DISCARD: `if (dispVec.x < 0.0 || dispVec.x > 1.0 || dispVec.y > 1.0 || dispVec.y < 0.0) { discard; }`,
    WRAP: `dispVec = mod(dispVec, 1.0);`,
};

deformation.CLAMP = WRAP_METHODS.CLAMP;
deformation.DISCARD = WRAP_METHODS.DISCARD;
deformation.WRAP = WRAP_METHODS.WRAP;

const DEFORMATION_METHODS = {
    NONE: ``,
    TUNNEL: `dispVec = vec2(dispVec.x * cos(r + r) - dispVec.y * sin(r + r), dispVec.y * cos(r + r) + dispVec.x * sin(r + r));`,
    SOMETHING: `dispVec = vec2(0.3 / (10.0 * r + dispVec.x), 0.5 * a / PI);`,
    SOMETHING2: `dispVec = vec2(0.02 * dispVec.y + 0.03 * cos(a) / r, 0.02 * dispVec.x + 0.03 * sin(a) / r);`,
    INVERT: `dispVec = dispVec * -1.0;`,
    SCALE: `dispVec = dispVec * 0.75;`,
    MAGNIFY: `dispVec = dispVec * (pow(2.0, r / u_radius) - 1.0);`,
    UNMAGNIFY: `dispVec = dispVec * (pow(2.0, min(u_radius / r, 4.0)));`,
};

deformation.NONE = DEFORMATION_METHODS.NONE;
deformation.TUNNEL = DEFORMATION_METHODS.TUNNEL;
deformation.SOMETHING = DEFORMATION_METHODS.SOMETHING;
deformation.SOMETHING2 = DEFORMATION_METHODS.SOMETHING2;
deformation.INVERT = DEFORMATION_METHODS.INVERT;
deformation.SCALE = DEFORMATION_METHODS.SCALE;
deformation.MAGNIFY = DEFORMATION_METHODS.MAGNIFY;
deformation.UNMAGNIFY = DEFORMATION_METHODS.UNMAGNIFY;

export default deformation;
