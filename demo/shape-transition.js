import { Kampos, transitions } from '../index.js';
import {
    DIRECTION_ENUM,
    EFFECT_ENUM,
    SHAPE_ENUM,
} from '../src/transitions/shape.js';

const GUI = lil.GUI;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');
const button = document.querySelector('#button');

// create the effects/transitions we need
const fade = transitions.shape({
    shape: 'circle',
    direction: 'xy',
    effect: 'transition',
});

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
    resizeHandler();
});

const resizeHandler = () => {
    fade.resolution = [target.offsetWidth, target.offsetHeight];
};

window.addEventListener('resize', resizeHandler);

const startTransition = () => {
    gsap.to(guiObj, {
        duration: guiObj.speed,
        progress: guiObj.progress < 0.5 ? 1 : 0,
        ease: guiObj.easing,
        onUpdate: () => {
            fade.progress = guiObj.progress;
        },
    });
};

button.addEventListener('click', startTransition);

// GUI

export const guiObj = {
    progress: 0,
    nbDivider: 50,
    shape: 'circle',
    shapeBorder: 0.15,
    effect: 'transition',
    direction: 'xy',
    speed: 3.2,
    easing: 'quart.out',
    bkgColor: '#121212',
    brightness: false,
    maxBrightness: 1,
    overlayColor: false,
};

const gsapEasings = [
    'power0.in',
    'power0.out',
    'power0.inOut',
    'power1.in',
    'power1.out',
    'power1.inOut',
    'power2.in',
    'power2.out',
    'power2.inOut',
    'power3.in',
    'power3.out',
    'power3.inOut',
    'power4.in',
    'power4.out',
    'power4.inOut',
    'circ.in',
    'circ.out',
    'circ.inOut',
    'expo.in',
    'expo.out',
    'expo.inOut',
    'sine.in',
    'sine.out',
    'sine.inOut',
    'quad.in',
    'quad.out',
    'quad.inOut',
    'cubic.in',
    'cubic.out',
    'cubic.inOut',
    'quart.in',
    'quart.out',
    'quart.inOut',
    'quint.in',
    'quint.out',
    'quint.inOut',
];

function hexToWebGLArray(hex, alpha = 1.0) {
    // Remove the # if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b from the hex string
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    // Return as a WebGL-compatible array
    return new Float32Array([r, g, b, alpha]);
}

const setGUI = () => {
    const gui = new GUI();

    gui.add(guiObj, 'progress', 0, 1).onChange((value) => {
        fade.progress = value;
    });
    gui.add(guiObj, 'nbDivider', 1, 100)
        .step(1)
        .onChange((value) => {
            fade.nbDivider = value;
        });
    gui.add(guiObj, 'shapeBorder', 0, 1)
        .step(0.01)
        .onChange((value) => {
            fade.shapeBorder = value;
        });
    gui.add(guiObj, 'shape', ['circle', 'diamond', 'square']).onChange(
        (value) => {
            fade.shape = SHAPE_ENUM[value];
        }
    );

    gui.add(guiObj, 'direction', ['x', 'y', 'xy', 'yx', 'inside']).onChange(
        (value) => {
            fade.direction = DIRECTION_ENUM[value];
        }
    );

    gui.add(guiObj, 'effect', [
        'transition',
        'transitionAlpha',
        'appearAlpha',
    ]).onChange((value) => {
        fade.effect = EFFECT_ENUM[value];
    });

    gui.add(guiObj, 'speed', 0.5, 4).step(0.1);
    gui.add(guiObj, 'easing', gsapEasings);
    gui.addColor(guiObj, 'bkgColor').onChange((value) => {
        document.body.style.backgroundColor = value;
        fade.color = hexToWebGLArray(value);
    });

    const extras = gui.addFolder('Extras FX');

    extras
        .add(guiObj, 'brightness')
        .name('Brightness')
        .onChange((value) => {
            fade.brightnessEnabled = value;
        });
    extras
        .add(guiObj, 'maxBrightness', 0, 1)
        .step(0.01)
        .name('Brightness strength')
        .onChange((value) => {
            fade.maxBrightness = value;
        });

    extras
        .add(guiObj, 'overlayColor')
        .name('Overlay Color')
        .onChange((value) => {
            fade.overlayColorEnabled = value;
        });

    document.body.style.backgroundColor = guiObj.bkgColor;
};

setGUI();
