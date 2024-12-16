/**
 * @function turbulence
 * @property {string} COLOR
 * @property {string} ALPHA
 * @param {object} params
 * @param {string} params.noise 3D noise implementation to use.
 * @param {string} [params.output] how to output the `turbulenceValue` variable. Use `turbulence.COLOR` or `turbulence.ALPHA` for outputting to color or alpha correspondingly. Defaults to `turbulence.COLOR`.
 * @param {{x: number, y: number}} [params.frequency={x: 0.0, y: 0.0}] initial frequencies to use for x and y axes.
 * @param {number} [params.octaves=1] initial number of octaves to use for turbulence noise generation.
 * @param {boolean} [params.isFractal=false] initial number of octaves to use for turbulence noise generation.
 * @param {number} [params.time=0] initial time for controlling initial noise value.
 * @returns {turbulenceEffect}
 *
 * @example turbulence({noise: kampos.noise.simplex, output: turbulence.COLOR, octaves: 4, isFractal: true})
 */
function turbulence({
    noise,
    output = OUTPUT_TYPES.COLOR,
    frequency,
    octaves = 1,
    isFractal = false,
    time = 0.0,
    input = 1,
    angle = 0.0,
}) {
    const { x: fx, y: fy } = frequency || { x: 0.0, y: 0.0 };

    /**
     * @typedef {Object} turbulenceEffect
     * @property {{x: number?, y: number?}} frequency
     * @property {number} octaves
     * @property {boolean} isFractal
     *
     * @description Generates a turbulence/fractal noise value stored into `turbulenceValue`.
     * Depends on a `noise(vec3 P)` function to be declared and injected via the `noise` param, for example, simply supplying the {@link perlinNoiseEffect}.
     *
     * @example
     * effect.frequency = {x: 0.0065};
     * effect.octaves = 4;
     * effect.isFractal = true;
     */
    return {
        fragment: {
            uniform: {
                u_turbulenceEnabled: 'bool',
                u_turbulenceFrequency: 'vec2',
                u_turbulenceOctaves: 'int',
                u_isFractal: 'bool',
                u_time: 'float',
                u_angle_rad: 'float',
            },
            constant: `
${noise}

const int MAX_OCTAVES = 9;

float turbulence (vec3 seed, vec2 frequency, int numOctaves, bool isFractal) {
    float sum = 0.0;
    vec3 position = vec3(0.0);
    position.x = seed.x * frequency.x;
    position.y = seed.y * frequency.y;
    position.z = seed.z;
    float ratio = 1.0;

    for (int octave = 0; octave <= MAX_OCTAVES; octave++) {
        if (octave > numOctaves) {
            break;
        }

        if (isFractal) {
            sum += noise(position) / ratio;
        }
        else {
            sum += abs(noise(position)) / ratio;
        }
        position.x *= 2.0;
        position.y *= 2.0;
        ratio *= 2.0;
    }

    if (isFractal) {
        sum = (sum + 1.0) / 2.0;
    }

    return clamp(sum, 0.0, 1.0);
}`,
            source: `    
    ${INPUT_TYPES[input] || ''}
    float turbulenceValue = turbulence(turbulenceSeed, u_turbulenceFrequency, u_turbulenceOctaves, u_isFractal);`,
            main: `
    ${output || ''}`,
        },
        get frequency() {
            const [x, y] = this.uniforms[0].data;
            return { x, y };
        },
        set frequency({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[0].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[0].data[1] = y;
        },
        get octaves() {
            return this.uniforms[1].data[0];
        },
        set octaves(value) {
            this.uniforms[1].data[0] = Math.max(0, parseInt(value));
        },
        get isFractal() {
            return !!this.uniforms[2].data[0];
        },
        set isFractal(toggle) {
            this.uniforms[2].data[0] = +toggle;
        },
        get time() {
            return this.uniforms[3].data[0];
        },
        set time(value) {
            this.uniforms[3].data[0] = Math.max(0, parseFloat(value));
        },
        get input() {
            return this.uniforms[4].data[0];
        },
        set input(value) {
            this.uniforms[4].data[0] = value;
        },
        get angle() {
            return this.uniforms[5].data[0];
        },
        set angle(value) {
            this.uniforms[5].data[0] = value;
        },
        uniforms: [
            {
                name: 'u_turbulenceFrequency',
                type: 'f',
                data: [fx, fy],
            },
            {
                name: 'u_turbulenceOctaves',
                type: 'i',
                data: [octaves],
            },
            {
                name: 'u_isFractal',
                type: 'i',
                data: [+!!isFractal],
            },
            {
                name: 'u_time',
                type: 'f',
                data: [time],
            },
            {
                name: 'u_input',
                type: 'i',
                data: [input],
            },
            {
                name: 'u_angle_rad',
                type: 'f',
                data: [angle],
            },
        ],
    };
}

const OUTPUT_TYPES = {
    COLOR: 'color = vec3(turbulenceValue);',
    ALPHA: 'alpha = turbulenceValue;',
};

const INPUT_TYPES = {
    1: `vec3 turbulenceSeed = vec3(gl_FragCoord.xy, u_time * 0.0001)`,
    2: `vec3 turbulenceSeed = vec3(gl_FragCoord.xyz)`,
    3: `vec3 turbulenceSeed = vec2(gl_FragCoord.x + u_mouse.x * u_resolution.x * -1.0, gl_FragCoord.y + u_mouse.y * u_resolution.y, u_time * 0.0001);`,
    4: `vec2 movement = vec2(u_mouse.x * cos(u_angle_rad) * u_resolution.x * -1.0, u_mouse.y * sin(u_angle_rad) * u_resolution.y);
    vec3 turbulenceSeed = vec3(gl_FragCoord.xy + movement.xy, u_time * 0.0001);`,
};

turbulence.COLOR = OUTPUT_TYPES.COLOR;
turbulence.ALPHA = OUTPUT_TYPES.ALPHA;

export default turbulence;
