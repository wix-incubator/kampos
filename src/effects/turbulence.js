/**
 * @function turbulence
 * @param {string} noise 3D noise implementation to use
 * @returns {turbulenceEffect}
 *
 * @example turbulence(noise)
 */
export default function (noise) {
    /**
     * @typedef {Object} turbulenceEffect
     * @property {{x: number?, y: number?}} frequency
     * @property {number} octaves
     * @property {boolean} isFractal
     *
     * @description Generates a turbulence/fractal noise value stored into `turbulenceValue`.
     * Depends on a `noise(vec3 P)` function to be declared. Currently it's possible to simply use it after {@link perlinNoiseEffect}.
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
                u_time: 'float'
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
            main: `
    vec3 turbulenceSeed = vec3(gl_FragCoord.xy, u_time * 0.0001);
    float turbulenceValue = turbulence(turbulenceSeed, u_turbulenceFrequency, u_turbulenceOctaves, u_isFractal);`
        },
        get frequency () {
            const [x, y] = this.uniforms[0].data;
            return {x, y};
        },
        set frequency ({x, y}) {
            if ( typeof x !== 'undefined' )
                this.uniforms[0].data[0] = x;
            if ( typeof y !== 'undefined' )
                this.uniforms[0].data[1] = y;
        },
        get octaves () {
            return this.uniforms[1].data[0];
        },
        set octaves (value) {
            this.uniforms[1].data[0] = Math.max(0, parseInt(value));
        },
        get isFractal () {
            return !!this.uniforms[2].data[0];
        },
        set isFractal (toggle) {
            this.uniforms[2].data[0] = +toggle;
        },
        get time () {
            return this.uniforms[3].data[0];
        },
        set time (value) {
            this.uniforms[3].data[0] = Math.max(0, parseFloat(value));
        },
        uniforms: [
            {
                name: 'u_turbulenceFrequency',
                type: 'f',
                data: [0.0, 0.0]
            },
            {
                name: 'u_turbulenceOctaves',
                type: 'i',
                data: [1]
            },
            {
                name: 'u_isFractal',
                type: 'i',
                data: [0]
            },
            {
                name: 'u_time',
                type: 'f',
                data: [0.0]
            }
        ]
    };
};
