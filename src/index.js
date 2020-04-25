import alphaMask from './effects/alpha-mask';
import blend from './effects/blend';
import brightnessContrast from './effects/brightness-contrast';
import hueSaturation from './effects/hue-saturation';
import duotone from './effects/duotone';
import displacement from './effects/displacement';
import perlinNoise from './noise/perlin-noise-3d';
import simplex from './noise/simplex-3d';
import turbulence from './effects/turbulence';
import fade from './transitions/fade';
import displacementTransition from './transitions/displacement';
import Kampos from './kampos';
import Ticker from './ticker';

export default {
    effects: {
        alphaMask,
        blend,
        brightnessContrast,
        hueSaturation,
        duotone,
        displacement,
        turbulence
    },
    transitions: {
        fade,
        displacement: displacementTransition
    },
    noise: {
        perlinNoise,
        simplex
    },
    Kampos,
    Ticker
};
