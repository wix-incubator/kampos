import alphaMask from './src/effects/alpha-mask.js';
import blend from './src/effects/blend.js';
import brightnessContrast from './src/effects/brightness-contrast.js';
import hueSaturation from './src/effects/hue-saturation.js';
import duotone from './src/effects/duotone.js';
import displacement from './src/effects/displacement.js';
import kaleidoscope from './src/effects/kaleidoscope.js';
import perlinNoise from './src/noise/perlin-noise-3d.js';
import cellular from './src/noise/cellular-noise-3d.js';
import simplex from './src/noise/simplex-3d.js';
import turbulence from './src/effects/turbulence.js';
import fade from './src/transitions/fade.js';
import displacementTransition from './src/transitions/displacement.js';
import dissolve from './src/transitions/dissolve.js';

export { Kampos } from './src/kampos.js';

export { Ticker } from './src/ticker.js';

export const effects = {
    alphaMask,
    blend,
    brightnessContrast,
    hueSaturation,
    duotone,
    displacement,
    turbulence,
    kaleidoscope,
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
