import alphaMask from './effects/alpha-mask';
import brightnessContrast from './effects/brightness-contrast';
import hueSaturation from './effects/hue-saturation';
import duotone from './effects/duotone';
import displacement from './effects/displacement';
import fade from './transitions/fade';
import displacementTransition from './transitions/displacement';
import Kampos from './kampos';
import Ticker from './ticker';

export default {
    effects: {
        alphaMask,
        brightnessContrast,
        hueSaturation,
        duotone,
        displacement
    },
    transitions: {
        fade,
        displacement: displacementTransition
    },
    Kampos,
    Ticker
};
