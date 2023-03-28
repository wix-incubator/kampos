import alphaMask from './effects/alpha-mask.js';
import blend from './effects/blend.js';
import brightnessContrast from './effects/brightness-contrast.js';
import hueSaturation from './effects/hue-saturation.js';
import duotone from './effects/duotone.js';
import displacement from './effects/displacement.js';
import perlinNoise from './noise/perlin-noise-3d.js';
import cellular from './noise/cellular-noise-3d.js';
import simplex from './noise/simplex-3d.js';
import turbulence from './effects/turbulence.js';
import fade from './transitions/fade.js';
import displacementTransition from './transitions/displacement.js';
import dissolve from './transitions/dissolve.js';

export { Kampos } from './kampos.js';

export { Ticker } from './ticker.js';

export const effects = {
    alphaMask,
    blend,
    brightnessContrast,
    hueSaturation,
    duotone,
    displacement,
    turbulence
};

export const transitions = {
    fade,
    displacement: displacementTransition,
    dissolve
};

export const noise = {
    perlinNoise,
    simplex,
    cellular
};
