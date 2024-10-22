/**
 * @function shapeMask
 * @param {{radius: number}} [params.radius] initial radius to use for circle mask. Defaults to 0 which means no mask.
 * @param {{aspectRatio: number}} [params.aspectRatio]
 * @param {string} [params.wrap] wrapping method to use. Defaults to `shapeMask.CLAMP`.
 * @param {string} [params.deformation] deformation method to use within the mask. Defaults to `shapeMask.NONE`.
 * @returns {maskEffect}
 *
 * @example shapeMask({radius: 0.1, aspectRatio: 4 / 3, wrap: shapeMask.CLAMP, deformation: shapeMask.TUNNEL})
 */
function shapeMask({
    radius,
    aspectRatio,
    wrap = WRAP_METHODS.WRAP,
    deformation = DEFORMATION_METHODS.NONE,
} = {}) {
    const dataRadius = radius || 0;
    const dataAspectRatio = aspectRatio || 1;

    /**
     * @typedef {Object} maskEffect
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
                u_maskEnabled: 'bool',
                u_radius: 'float',
                u_position: 'vec2',
                u_aspectRatio: 'float',
            },
            constant: `const float PI = ${Math.PI};`,
            source: `
             vec2 diff = sourceCoord - u_position;
             float dist = diff.x * diff.x * u_aspectRatio * u_aspectRatio + diff.y * diff.y;
             float r = sqrt(dist);
             if (u_maskEnabled) {
         if (dist < u_radius * u_radius) {
            vec2 dispVec = diff;
            float a = atan(diff.y, diff.x);
            ${deformation}
            dispVec = dispVec + u_position;
            ${wrap}
            sourceCoord = dispVec;
        }
     }`,
            //         main: `
            //  if (u_maskEnabled) {
            //      if (dist < u_radius * u_radius) {
            //         color = vec3(color.b, color.r, color.g);
            //     }
            //  }`,
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
                name: 'u_maskEnabled',
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

shapeMask.CLAMP = WRAP_METHODS.CLAMP;
shapeMask.DISCARD = WRAP_METHODS.DISCARD;
shapeMask.WRAP = WRAP_METHODS.WRAP;

const DEFORMATION_METHODS = {
    NONE: ``,
    TUNNEL: `dispVec = vec2(dispVec.x * cos(r + r) - dispVec.y * sin(r + r), dispVec.y * cos(r + r) + dispVec.x * sin(r + r));`,
    SOMETHING: `dispVec = vec2(0.3 / (10.0 * r + dispVec.x), 0.5 * a / PI);`,
    SOMETHING2: `dispVec = vec2(0.02 * dispVec.y + 0.03 * cos(a) / r, 0.02 * dispVec.x + 0.03 * sin(a) / r);`,
    INVERT: `dispVec = dispVec * -1.0;`,
    SCALE: `dispVec = dispVec * 0.75;`,
    MAGNIFY: `dispVec = dispVec * (pow(2.0, r / u_radius) - 1.0);`,
};

shapeMask.NONE = DEFORMATION_METHODS.NONE;
shapeMask.TUNNEL = DEFORMATION_METHODS.TUNNEL;
shapeMask.SOMETHING = DEFORMATION_METHODS.SOMETHING;
shapeMask.SOMETHING2 = DEFORMATION_METHODS.SOMETHING2;
shapeMask.INVERT = DEFORMATION_METHODS.INVERT;
shapeMask.SCALE = DEFORMATION_METHODS.SCALE;
shapeMask.MAGNIFY = DEFORMATION_METHODS.MAGNIFY;

export default shapeMask;
