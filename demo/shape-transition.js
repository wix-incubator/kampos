import { Kampos, transitions } from '../index.js';

const GUI = lil.GUI;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');
const button = document.querySelector('#button');

const MEDIA = {};
let shapeEffect;
let instance;

function generateInstance({ shape, direction, effect }) {
    if (instance) {
        instance.destroy();
    }

    // create the effects/transitions we need
    shapeEffect = transitions.shape({
        shape,
        direction,
        effect,
    });

    shapeEffect.to = MEDIA.to;

    // init kampos
    instance = new Kampos({target, effects: [shapeEffect]});

    // set media source
    instance.setSource({ media: MEDIA.media, width: MEDIA.width, height: MEDIA.height });

    // start kampos
    resizeHandler(target);
    instance.play();
}

const resizeHandler = (target) => {
    shapeEffect.resolution = [target.offsetWidth, target.offsetHeight];
};

window.addEventListener('resize', resizeHandler.bind(null, target));

// make sure videos are loaded and playing
prepareVideos([media1, media2]).then(() => {
    MEDIA.width = media1.videoWidth;
    MEDIA.height = media1.videoHeight;

    MEDIA.media = media1;

    // set media to transition into
    MEDIA.to = media2;

    generateInstance({ shape: 'circle', direction: 'bottomLeft', effect: 'transitionColor' });
});

const startTransition = () => {
    gsap.to(guiObj, {
        duration: guiObj.speed,
        progress: guiObj.progress < 0.5 ? 1 : 0,
        ease: guiObj.easing,
        onUpdate: () => {
            shapeEffect.progress = guiObj.progress;
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
    effect: 'transitionColor',
    direction: 'bottomLeft',
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
        shapeEffect.progress = value;
    });
    gui.add(guiObj, 'nbDivider', 1, 100)
        .step(1)
        .onChange((value) => {
            shapeEffect.dividerCount = value;
        });
    gui.add(guiObj, 'shapeBorder', 0, 1)
        .step(0.01)
        .onChange((value) => {
            shapeEffect.shapeBorder = value;
        });
    gui.add(guiObj, 'shape', ['circle', 'diamond', 'square']).onChange(
        (value) => {
            generateInstance({ shape: value, direction: guiObj.direction, effect: guiObj.effect });
        }
    );

    gui.add(guiObj, 'direction', ['topLeft', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'constant']).onChange(
        (value) => {
            shapeEffect.direction = value;
        }
    );

    gui.add(guiObj, 'effect', [
        'transitionColor',
        'transitionAlpha',
        'appearAlpha',
    ]).onChange((value) => {
        shapeEffect.effect = value;
    });

    gui.add(guiObj, 'speed', 0.5, 4).step(0.1);
    gui.add(guiObj, 'easing', gsapEasings);
    gui.addColor(guiObj, 'bkgColor').onChange((value) => {
        document.body.style.backgroundColor = value;
        shapeEffect.color = hexToWebGLArray(value);
    });

    const extras = gui.addFolder('Extras FX');

    extras
        .add(guiObj, 'brightness')
        .name('Brightness')
        .onChange((value) => {
            shapeEffect.brightnessEnabled = value;
        });
    extras
        .add(guiObj, 'maxBrightness', 0, 1)
        .step(0.01)
        .name('Brightness strength')
        .onChange((value) => {
            shapeEffect.maxBrightness = value;
        });

    extras
        .add(guiObj, 'overlayColor')
        .name('Overlay Color')
        .onChange((value) => {
            shapeEffect.overlayColorEnabled = value;
        });

    document.body.style.backgroundColor = guiObj.bkgColor;
};

setGUI();
