import { Kampos, transitions } from '../index.js';

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');

// create the effects/transitions we need
// const hueSat = effects.hueSaturation();
const fade = transitions.shape();

// init kampos
const instance = new Kampos({ target, effects: [fade] });

// make sure videos are loaded and playing
prepareVideos([media1, media2]).then(() => {
    const width = media1.videoWidth;
    const height = media1.videoHeight;

    // set media source
    instance.setSource({ media: media1, width, height });

    // set media to transition into
    fade.to = media2;

    // start kampos
    instance.play();
    resiveHandler();
});

let x, y, rect;
let drawing = false;

// this is invoked once in every animation frame, while there's a mouse move over the canvas
function tick() {
    fade.progress = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
    drawing = false;
}

// handler for detecting mouse move
const moveHandler = (e) => {
    const { clientX } = e;

    // cache mouse location
    x = clientX;
    // y = clientY;

    // only once! a frame
    if (!drawing) {
        drawing = true;
        // read here
        rect = target.getBoundingClientRect();
        // write on next frame
        requestAnimationFrame(tick);
    }
};

const resiveHandler = () => {
    fade.resolution = [target.offsetWidth, target.offsetHeight];
};

/*
 * register event handlers for interaction
 */
target.addEventListener('mouseenter', () => {
    target.addEventListener('mousemove', moveHandler);
});

target.addEventListener('mouseleave', () => {
    target.removeEventListener('mousemove', moveHandler);
});

window.addEventListener('resize', resiveHandler);
resiveHandler();
