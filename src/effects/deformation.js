/**
 * Depends on the `resolution` utility.
 * Depends on the `mouse` utility.
 *
 * @function deformation
 * @param {Object} [params]
 * @param {number} [params.radius] initial radius to use for circle of effect boundaries. Defaults to 0 which means no effect.
 * @param {string} [params.wrap] wrapping method to use. Defaults to `deformation.CLAMP`.
 * @param {string} [params.deformation] deformation method to use within the radius. Defaults to `deformation.NONE`.
 * @returns {deformationEffect}
 *
 * @example deformation({radius: 0.1, wrap: deformation.CLAMP, deformation: deformation.TUNNEL})
 */
function deformation({
    radius,
    wrap = WRAP_METHODS.WRAP,
    deformation = DEFORMATION_METHODS.NONE,
} = {}) {
    const dataRadius = radius || 0;

    /**
     * @typedef {Object} deformationEffect
     * @property {boolean} disabled
     * @property {number} radius
     *
     * @example
     * effect.disabled = true;
     * effect.radius = 0.253;
     */
    return {
        fragment: {
            uniform: {
                u_deformationEnabled: 'bool',
                u_radius: 'float',
            },
            source: `
        float _aspectRatio = u_resolution.x / u_resolution.y;
        vec2 _position = u_mouse;
        vec2 diff = sourceCoord - _position;
        float dist = diff.x * diff.x * _aspectRatio * _aspectRatio + diff.y * diff.y;
        float r = sqrt(dist);
        bool isInsideDeformation = dist < u_radius * u_radius;

        if (u_deformationEnabled) {
            if (isInsideDeformation) {
                vec2 dispVec = diff;
                float a = atan(diff.y, diff.x);
                ${deformation}
                dispVec = dispVec + _position;
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
            if (typeof r !== 'undefined') this.uniforms[1].data[0] = r;
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
