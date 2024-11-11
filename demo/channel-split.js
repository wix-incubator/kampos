import { Kampos, effects, noise } from '../index.js';

// const media = document.querySelector('#video9');
const target = document.querySelector('#target');

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

/* make sure video is loaded and playing */
loadImage(
    `https://picsum.photos/${WIDTH}/${HEIGHT}?random=1`,
).then((img) => {

    // const width = media.videoWidth;
    // const height = media.videoHeight;
    const height = window.document.documentElement.clientHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    const AMPLITUDE = 1 / target.width;
    const frequency = { x: AMPLITUDE, y: AMPLITUDE };

    const octaves = 2;
    // change to false (or comment out) if you want to see the turbulence noise variant
    const isFractal = true;

    // create the effects we need
    const turbulence = effects.turbulence({
        noise: noise.simplex,
        frequency,
        octaves,
        isFractal,
    });

    const OFFSET_AMPLITUDE = 0.1;

    /*
     * Channel split effect
     * based on mouse velocity
     */
    const offset = { x: 0.1, y: 0.1 };
    const channelSplit = effects.channelSplit({
        offsetRed: offset,
        offsetGreen: offset,
        offsetBlue: offset,
        offsetInputR: `vec2(turbulenceValue * ${OFFSET_AMPLITUDE}, turbulenceValue * ${OFFSET_AMPLITUDE})`,
        offsetInputG: `vec2(-turbulenceValue * ${OFFSET_AMPLITUDE}, -turbulenceValue * ${OFFSET_AMPLITUDE})`,
        offsetInputB: `vec2(turbulenceValue * ${OFFSET_AMPLITUDE}, -turbulenceValue * ${OFFSET_AMPLITUDE})`,
    });

    const instance = new Kampos({ effects: [turbulence, channelSplit], target });

    /* set media source */
    instance.setSource({ media: img, width, height });

    instance.play((time) => {
        turbulence.time = time * 5;
    });
});
