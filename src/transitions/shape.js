const COlOR_TRANSITION = 'transitionColor';
const ALPHA_TRANSITION = 'transitionAlpha';
const APPEAR_ALPHA = 'appearAlpha';
const DIRECTION_LEFT = 'left';
const DIRECTION_RIGHT = 'right';
const DIRECTION_TOP = 'top';
const DIRECTION_BOTTOM = 'bottom';
const DIRECTION_TOP_LEFT = 'topLeft';
const DIRECTION_TOP_RIGHT = 'topRight';
const DIRECTION_BOTTOM_LEFT = 'bottomLeft';
const DIRECTION_BOTTOM_RIGHT = 'bottomRight';
const DIRECTION_CONSTANT = 'constant';


/*
 * 1 2 3
 * 4 5 6
 * 7 8 9
 */
export const DIRECTION_ENUM = {
    [DIRECTION_TOP_LEFT]: 1,
    [DIRECTION_TOP]: 2,
    [DIRECTION_TOP_RIGHT]: 3,
    [DIRECTION_LEFT]: 4,
    [DIRECTION_CONSTANT]: 5,
    [DIRECTION_RIGHT]: 6,
    [DIRECTION_BOTTOM_LEFT]: 7,
    [DIRECTION_BOTTOM]: 8,
    [DIRECTION_BOTTOM_RIGHT]: 9,
};

export const EFFECT_ENUM = {
    [COlOR_TRANSITION]: 1,
    [ALPHA_TRANSITION]: 2,
    [APPEAR_ALPHA]: 3,
};

/**
 * @function shapeTransition
 * @property {string} CIRCLE 'circle'
 * @property {string} SQUARE 'square'
 * @property {string} DIAMOND 'diamond'
 * @property {string} COLOR_TRANSITION transition between two media sources using a color overlay
 * @property {string} ALPHA_TRANSITION transition between two media sources using transparency
 * @property {string} APPEAR_ALPHA transition between transparent canvas to the source media
 * @property {string} DIRECTION_LEFT 'left'
 * @property {string} DIRECTION_RIGHT 'right'
 * @property {string} DIRECTION_TOP 'top'
 * @property {string} DIRECTION_BOTTOM 'bottom'
 * @property {string} DIRECTION_TOP_LEFT 'topLeft'
 * @property {string} DIRECTION_TOP_RIGHT 'topRight'
 * @property {string} DIRECTION_BOTTOM_LEFT 'bottomLeft'
 * @property {string} DIRECTION_BOTTOM_RIGHT 'bottomRight'
 * @property {string} DIRECTION_CONSTANT 'constant'
 * @param {Object} [options]
 * @param {number} [options.nbDivider=50] number of shapes to divide the screen into
 * @param {string} [options.shape='circle'] ENUM['circle', 'diamond', 'square'] shape of every grid cell in the transition
 * @param {string} [options.direction='xy'] ENUM['constant', 'top', 'bottom', 'left', 'right', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'] direction of the transition
 * @param {string} [options.effect='transitionColor'] ENUM['transitionColor', 'transitionAlpha', 'appearAlpha'] effect type of the transition
 * @param {boolean} [options.enableBrightness=false] enable brightness effect. Defaults to `false`.
 * @param {number} [options.maxBrightness=1] maximum brightness to use for the effect. Defaults to `1`.
 * @param {boolean} [options.enableColor=false] enable overlay color effect. Defaults to `false`.
 * @param {Array<number>} [options.color=[0.1, 0.1, 0.1]] background color for overlay color effect. Defaults to `[0.1, 0.1, 0.1]`.
 * @param {number} [options.progress=0] progress of the transition. Defaults to `0`.
 * @param {number} [options.shapeBorder=0.15] border size of the shape. Defaults to `0.15`.
 * @returns {shapeTransitionEffect}
 * @example shapeTransition()
 */
function shapeTransition ({
    nbDivider = 50,
    shape = shapeTransition.CIRCLE,
    direction = shapeTransition.DIRECTION_TOP_LEFT,
    effect = shapeTransition.COLOR_TRANSITION,
    enableBrightness = false,
    maxBrightness = 1,
    enableColor = false,
    color = [0.1, 0.1, 0.1],
    progress = 0,
    shapeBorder = 0.15,
} = {}) {
    /**
     * @typedef {Object} shapeTransitionEffect
     * @property {boolean} disabled whether to disable the effect
     * @property {number} progress progress of the transition - 0.0 to 1.0
     * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
     * @property {[number, number]} resolution resolution of the media source
     * @property {number} dividerCount number of shapes to divide the screen into
     * @property {number} shapeBorder border size of the shape
     * @property {string} direction direction of the transition
     * @property {string} effect effect of the transition
     * @property {boolean} brightnessEnabled enable brightness effect
     * @property {boolean} maxBrightness maximum brightness to use for the effect
     * @property {string} color background color for overlay color effect
     * @property {boolean} overlayColorEnabled enable overlay color effect
     *
     * @example
     */

    // Default Uniforms values
    const effectDirection = DIRECTION_ENUM[direction];
    const effectType = EFFECT_ENUM[effect];

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
                u_direction: 'int',
                u_effect: 'int',
                u_brightnessEnabled: 'bool',
                u_maxBrightness: 'float',
                u_shapeColor: 'vec3',
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

        // Shape progress
        float offset = 0.;
        float shapeProgress = 0.;

        /*
        if (u_direction == 5) { // center
            shapeProgress =  1. - pow(cos(v_texCoord.x - 0.5), 2.) + pow(sin(v_texCoord.y - 0.5), 2.);
            offset = 2.;
        } else if (u_direction == 0) { // outer
            shapeProgress =  pow(cos(v_texCoord.x - 0.5), 2.) +  1. - pow(sin(v_texCoord.y - 0.5), 2.);
        */

        if (u_direction == 4) { // left
            shapeProgress =  v_texCoord.x + 1.;
        } else if (u_direction == 6) { // right
            shapeProgress = 1. - (v_texCoord.x + 1.);
            offset = 4.;
        } else if (u_direction == 1) { // top left
            shapeProgress = (v_texCoord.x + 1. + (1. - (v_texCoord.y + 1.))) / 2.;
            offset = 2.;
        } else if (u_direction == 3) { // top right
            shapeProgress = (1. - v_texCoord.x + 1. + (1. - (v_texCoord.y + 1.))) / 2.;
            offset = 2.;
        } else if (u_direction == 2) { // top
            shapeProgress = 1. - (v_texCoord.y + 1.);
            offset = 4.;
        } else if (u_direction == 8) { // bottom
            shapeProgress = v_texCoord.y + 1.;
        } else if (u_direction == 7) { // bottom left
            shapeProgress = (v_texCoord.x + 1. + v_texCoord.y + 1.) / 2.;
        } else if (u_direction == 9) { // bottom right
            shapeProgress = (1. - v_texCoord.x + 1. + v_texCoord.y + 1.) / 2.;
        }

        // Transition
        float transition = (shapeProgress * 2. + offset) - u_transitionProgress * 6.;

        if (u_effect == 1) {
            if (u_direction == 5) {
                transition = 2.15 - u_transitionProgress * 4.6;
            }
            shapeProgress = pow(abs(transition), transitionSpread);
        } else {
            if (u_direction == 5) {
                // adding 0.15 extra to be sure shapes are covering the whole space (espacially for circle because of blurry border)
                shapeProgress = 2.15 - u_transitionProgress * 2.3;
            } else {
                transition = (shapeProgress * 2. + offset) - u_transitionProgress * 4.;
                shapeProgress = pow(transition, transitionSpread);
            }
        }

        vec3 shapeColor = vec3(${shape}(st, max(shapeProgress, 0.)));

        vec4 textureTarget = texture2D(u_transitionTo, v_transitionToTexCoord);

        if (u_effect == 1) {
            color = mix(textureTarget.rgb, color, smoothstep(0., 1., transition)) * shapeColor;
            alpha = shapeColor.r;
        } else if (u_effect == 2) {
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
            color.rgb += overlayProgress * u_shapeColor;
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
        set to(m) {
            this.textures[0].data = m;
        },
        set resolution([w, h]) {
            this.uniforms[3].data[0] = w;
            this.uniforms[3].data[1] = h;
        },
        set dividerCount(n) {
            this.uniforms[4].data[0] = n;
        },
        set shapeBorder(s) {
            this.uniforms[5].data[0] = s;
        },
        set direction(d) {
            this.uniforms[6].data[0] = DIRECTION_ENUM[d];
        },
        set effect(e) {
            this.uniforms[7].data[0] = EFFECT_ENUM[e];
        },
        set brightnessEnabled(b) {
            this.uniforms[8].data[0] = +b;
        },
        set maxBrightness(b) {
            this.uniforms[9].data[0] = b;
        },
        set color([r, g, b]) {
            this.uniforms[10].data[0] = r;
            this.uniforms[10].data[1] = g;
            this.uniforms[10].data[2] = b;
        },
        set overlayColorEnabled(b) {
            this.uniforms[11].data[0] = +b;
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
                data: [progress],
            },
            {
                name: 'u_resolution',
                type: 'f',
                data: [0, 0],
            },
            {
                name: 'u_nbDivider',
                type: 'f',
                data: [nbDivider],
            },
            {
                name: 'u_shapeBorder',
                type: 'f',
                data: [shapeBorder],
            },
            {
                name: 'u_direction',
                type: 'i',
                data: [effectDirection],
            },
            {
                name: 'u_effect',
                type: 'i',
                data: [effectType],
            },
            {
                name: 'u_brightnessEnabled',
                type: 'i',
                data: [+enableBrightness],
            },
            {
                name: 'u_maxBrightness',
                type: 'f',
                data: [maxBrightness],
            },
            {
                name: 'u_shapeColor',
                type: 'f',
                data: [...color],
            },
            {
                name: 'u_overlayColorEnabled',
                type: 'i',
                data: [+enableColor],
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

shapeTransition.CIRCLE = 'circle';
shapeTransition.SQUARE = 'square';
shapeTransition.DIAMOND = 'diamond';
shapeTransition.COLOR_TRANSITION = COlOR_TRANSITION;
shapeTransition.ALPHA_TRANSITION = ALPHA_TRANSITION;
shapeTransition.APPEAR_ALPHA = APPEAR_ALPHA;
shapeTransition.DIRECTION_LEFT = DIRECTION_LEFT;
shapeTransition.DIRECTION_RIGHT = DIRECTION_RIGHT;
shapeTransition.DIRECTION_TOP = DIRECTION_TOP;
shapeTransition.DIRECTION_BOTTOM = DIRECTION_BOTTOM;
shapeTransition.DIRECTION_TOP_LEFT = DIRECTION_TOP_LEFT;
shapeTransition.DIRECTION_TOP_RIGHT = DIRECTION_TOP_RIGHT;
shapeTransition.DIRECTION_BOTTOM_LEFT = DIRECTION_BOTTOM_LEFT;
shapeTransition.DIRECTION_BOTTOM_RIGHT = DIRECTION_BOTTOM_RIGHT;
shapeTransition.DIRECTION_CONSTANT = DIRECTION_CONSTANT;

export default shapeTransition;
