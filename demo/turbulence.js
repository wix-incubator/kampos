import { Kampos, effects, noise } from '../index.js';

const target = document.querySelector('#target');
const media = document.querySelector('#video5');

prepareVideos([media]).then(() => {
    const width = media.videoWidth;

    // try playing with this factor
    const AMPLITUDE = 2 / width;
    const frequency = { x: AMPLITUDE, y: AMPLITUDE };

    // increase/decrease the number of octaves to see different noise patterns
    const octaves = 4;
    // change to false (or comment out) if you want to see the turbulence noise variant
    const isFractal = true;

    // create the effects we need
    const turbulence = effects.turbulence({
        noise: noise.simplex,
        frequency,
        octaves,
        isFractal,
        output: '', // comment out this line to see the turbulence noise itself
    });

    // create a simple effect that converts the turbulence return value into the output color
    const disp = effects.displacement({
        input: effects.displacement.TURBULENCE,
        scale: { x: 0.15, y: -0.15 },
    });

    const instance = new Kampos({ target, effects: [turbulence, disp] });

    // set media source
    instance.setSource(media);

    // you can increase/decrease the time factor for a faster/slower animation
    instance.play((time) => (turbulence.time = time * 2));
});
