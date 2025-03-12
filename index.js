import resolution from './src/utilities/resolution.js';
import mouse from './src/utilities/mouse.js';
import circle from './src/utilities/circle.js';
import alphaMask from './src/effects/alpha-mask.js';
import deformation from './src/effects/deformation.js';
import blend from './src/effects/blend.js';
import brightnessContrast from './src/effects/brightness-contrast.js';
import hueSaturation from './src/effects/hue-saturation.js';
import duotone from './src/effects/duotone.js';
import displacement from './src/effects/displacement.js';
import channelSplit from './src/effects/channel-split.js';
import kaleidoscope from './src/effects/kaleidoscope.js';
import slitScan from './src/effects/slit-scan.js';
import perlinNoise from './src/noise/perlin-noise-3d.js';
import cellular from './src/noise/cellular-noise-3d.js';
import simplex from './src/noise/simplex-3d.js';
import simplex2d from './src/noise/simplex-2d.js';
import white from './src/noise/white.js';
import turbulence from './src/effects/turbulence.js';
import fade from './src/transitions/fade.js';
import displacementTransition from './src/transitions/displacement.js';
import dissolve from './src/transitions/dissolve.js';
import flowmapGrid from './src/fbo/flowmap-grid.js';
import gridMouseDisplacement from './src/effects/flowmap-grid-displacement.js';
import shapeTransition from './src/transitions/shape.js';

export { Kampos } from './src/kampos.js';

export { Ticker } from './src/ticker.js';

export const effects = {
    alphaMask,
    blend,
    brightnessContrast,
    channelSplit,
    deformation,
    displacement,
    duotone,
    hueSaturation,
    kaleidoscope,
    turbulence,
    slitScan,
    gridMouseDisplacement
};

export const transitions = {
    fade,
    displacement: displacementTransition,
    dissolve,
    shape: shapeTransition
};

export const noise = {
    perlinNoise,
    simplex,
    simplex2d,
    cellular,
    white,
};

export const utilities = {
    mouse,
    resolution,
    circle,
};

export const fbos = {
    flowmapGrid,
};
