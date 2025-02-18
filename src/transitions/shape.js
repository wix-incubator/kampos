export const SHAPE_ENUM = {
    circle: 1,
    diamond: 2,
    square: 3,
};

export const EFFECT_ENUM = {
    transition: 1,
    transitionAlpha: 2,
    appearAlpha: 3,
};

export const DIRECTION_ENUM = {
    x: 1,
    y: 2,
    xy: 3,
    yx: 4,
    inside: 5,
};

/**
 * @function shapeTransition
 * @returns {shapeTransitionEffect}
 * @example shapeTransition()
 */
export default function ({
    nbDivider = 50,
    shape = 'circle',
    direction = 'xy',
    effect = 'transition',
    brightness = false,
    overlayColor = false,
    bkgColor = '#121212',
} = {}) {
    /**
     * @typedef {Object} shapeTransitionEffect
     * @property {number} nbDivider number of shapes to divide the screen into
     * @property {string} shape ENUM['circle', 'diamond', 'square'] shape of the transition
     * @property {string} direction ENUM['x', 'y', 'xy', 'yx', 'inside'] direction of the transition
     * @property {string} effect ENUM['transition', 'transitionAlpha', 'appearAlpha'] effect of the transition
     * @property {boolean} brightness enable brightness effect
     * @property {boolean} overlayColor enable overlay color effect
     * @property {string} bkgColor background color for overlay color effect
     *
     * @example
     */

    // Default Uniforms values
    const DEFAULT = {
        progress: 0,
        nbDivider: nbDivider,
        shapeBorder: 0.15,
        shape: SHAPE_ENUM[shape], // 1, 2 or 3 , see demo
        direction: DIRECTION_ENUM[direction], // 1, 2, 3 , 4, 5 see demo
        effect: EFFECT_ENUM[effect], // 1, 2 or 3 , see demo
        bkgColor: bkgColor,
        brightness: brightness,
        maxBrightness: 1,
        overlayColor: overlayColor,
    };

    return {
        vertex: {
            attribute: {
                a_transitionToTexCoord: 'vec2',
            },
            main: `
    v_transitionToTexCoord = a_transitionToTexCoord;`,
        },
        fragment: {
            uniform: {
                u_transitionEnabled: 'bool',
                u_transitionProgress: 'float',
                u_transitionTo: 'sampler2D',
                u_resolution: 'vec2',
                u_nbDivider: 'float',
                u_shapeBorder: 'float',
                u_shape: 'float',
                u_direction: 'float',
                u_effect: 'float',
                u_brightnessEnabled: 'bool',
                u_maxBrightness: 'float',
                u_color: 'vec3',
                u_overlayColorEnabled: 'bool',
            },
            constant: `
            const float circleBorder = 0.15;
            const float transitionSpread = 1.15;

            vec2 rotate(vec2 v, float a) {
                float s = sin(a);
                float c = cos(a);
                mat2 m = mat2(c, -s, s, c);
                return m * v;
            }

            float circle(vec2 _uv, float _radius){
                vec2 l = _uv - vec2(0.5);
                float border = circleBorder;
                return 1. - smoothstep(_radius - (_radius * border),
                                    _radius + (_radius * border),
                                    dot(l, l) * 4.0);
            }

            float square(vec2 _uv, float _size) {
                vec2 l = abs(_uv - vec2(0.5));
                float border = u_shapeBorder;
                return 1. - smoothstep(_size - (_size * border),
                                    _size + (_size * border),
                                    max(l.x, l.y) * 2.0);
            }

            float diamond(vec2 _uv, float _size) {
                vec2 l = abs(rotate(_uv - vec2(0.5), PI / 4.0)); // Rotate by 45 degrees (PI / 4)
                float border = u_shapeBorder;
                return 1. - smoothstep(_size - (_size * border),
                                    _size + (_size * border),
                                    max(l.x, l.y) * 2.0);
            }
            `,
            main: `

            if (u_transitionEnabled) {

            // Grid of circles
            vec2 st = gl_FragCoord.xy / u_resolution;
            vec2 aspect = u_resolution / min(u_resolution.x, u_resolution.y); // Calculate aspect ratio
            st.x *= aspect.x / aspect.y; // Adjust x coordinate based on aspect ratio to have square
            st *= u_nbDivider; // TODO: nbShapes      // Scale up the space by 3
            st = fract(st); // Wrap around 1.0


            // Circle progress
            float circleProgress = v_texCoord.x + 1.; // 1 à 2
            float offset = 0.;
            if (u_direction == 2.) {
                circleProgress = v_texCoord.y + 1.;
            } else if (u_direction == 3.) {
                circleProgress = (v_texCoord.x + 1. + v_texCoord.y + 1.) / 2.;
            } else if (u_direction == 4.) {
                circleProgress = (v_texCoord.x + 1. + (1. - v_texCoord.y)) / 2.;
                offset = 1.;
            }

            // Transition
            float transition = (circleProgress * 2. + offset) - u_transitionProgress * 6.;

            if (u_effect == 1.) {
                if (u_direction == 5.) {
                    transition = 2.15 - u_transitionProgress * 4.6;
                }
                circleProgress = pow(abs(transition), transitionSpread);
            } else {
                transition = (circleProgress * 2. + offset) - u_transitionProgress * 4.;
                circleProgress = pow(transition, transitionSpread);

                if (u_direction == 5.) {
                    // adding 0.15 extra to be sure shapes are covering the whole space (espacially for circle because of blurry border)
                    circleProgress = 2.15 - u_transitionProgress * 2.3;
                }
            }


            vec3 shapeColor = vec3(0.,0.,0.);
            if (u_shape == 1.) {
                shapeColor = vec3(circle(st, max(circleProgress, 0.)));
            } else if (u_shape == 2.) {
                shapeColor = vec3(diamond(st, max(circleProgress, 0.)));
            } else if (u_shape == 3.) {
                shapeColor = vec3(square(st, max(circleProgress, 0.)));
            }

            vec4 textureTarget = texture2D(u_transitionTo, v_transitionToTexCoord);

            if (u_effect == 1.) {
                color = mix(textureTarget.rgb, color, smoothstep(0., 1., transition)) * shapeColor;
                alpha = shapeColor.r;
            } else if (u_effect == 2.) {
                color = mix(textureTarget.rgb, color, smoothstep(0., 1., shapeColor.r));
                alpha = 1.;
            } else {
                color = mix(textureTarget.rgb, color, smoothstep(0., 1., shapeColor.r));
                alpha = shapeColor.r;
            }

            // Apply brightness.
            if (u_brightnessEnabled) {
                float brightness = (0.5 * u_maxBrightness) * (1. - (abs(u_transitionProgress - 0.5) * 2.0));
                color.rgb += brightness;
            }

            // Apply color.
            if (u_overlayColorEnabled) {
                float overlayProgress = (1. - (abs(u_transitionProgress - 0.5) * 2.0));
                color.rgb += overlayProgress * u_color;
            }

}`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get progress() {
            return this.uniforms[2].data[0];
        },
        set progress(p) {
            this.uniforms[2].data[0] = p;
        },
        get to() {
            return this.textures[0].data;
        },
        set to(media) {
            this.textures[0].data = media;
        },
        set resolution([width, height]) {
            this.uniforms[3].data[0] = width;
            this.uniforms[3].data[1] = height;
        },
        set nbDivider(value) {
            this.uniforms[4].data[0] = value;
        },
        set shapeBorder(value) {
            this.uniforms[5].data[0] = value;
        },
        set shape(value) {
            this.uniforms[6].data[0] = value;
        },
        set direction(value) {
            this.uniforms[7].data[0] = value;
        },
        set effect(value) {
            this.uniforms[8].data[0] = value;
        },
        set brightnessEnabled(value) {
            this.uniforms[9].data[0] = +value;
        },
        set maxBrightness(value) {
            this.uniforms[10].data[0] = value;
        },
        set color([r, g, b, a]) {
            this.uniforms[11].data[0] = r;
            this.uniforms[11].data[1] = g;
            this.uniforms[11].data[2] = b;
        },
        set overlayColorEnabled(value) {
            this.uniforms[12].data[0] = +value;
        },
        varying: {
            v_transitionToTexCoord: 'vec2',
        },
        uniforms: [
            {
                name: 'u_transitionEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_transitionTo',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_transitionProgress',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_resolution',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'u_nbDivider',
                type: 'f',
                data: [DEFAULT.nbDivider],
            },
            {
                name: 'u_shapeBorder',
                type: 'f',
                data: [DEFAULT.shapeBorder],
            },
            {
                name: 'u_shape',
                type: 'f',
                data: [DEFAULT.shape],
            },
            {
                name: 'u_direction',
                type: 'f',
                data: [DEFAULT.direction],
            },
            {
                name: 'u_effect',
                type: 'f',
                data: [DEFAULT.effect],
            },
            {
                name: 'u_brightnessEnabled',
                type: 'i',
                data: [0],
            },
            {
                name: 'u_maxBrightness',
                type: 'f',
                data: [DEFAULT.maxBrightness],
            },
            {
                name: 'u_color',
                type: 'f',
                data: [0, 0, 0],
            },
            {
                name: 'u_overlayColorEnabled',
                type: 'i',
                data: [0],
            },
        ],
        attributes: [
            {
                name: 'a_transitionToTexCoord',
                extends: 'a_texCoord',
            },
        ],
        textures: [
            {
                format: 'RGBA',
                update: true,
            },
        ],
    };
}
