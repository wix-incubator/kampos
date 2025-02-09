import { Kampos, transitions } from '../index.js';

const GUI = lil.GUI;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');
const button = document.querySelector('#button');

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

const resiveHandler = () => {
    fade.resolution = [target.offsetWidth, target.offsetHeight];
};

window.addEventListener('resize', resiveHandler);
resiveHandler();

const startTransition = () => {
    console.log('ici');
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
    transitionSpread: 1.1,
    speed: 3.2,
    easing: 'quart.out',
    bkgColor: '#121212',
    brightness: false,
    brightnessValue: 1,
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
            switch (value) {
                case 'circle':
                    // program.uniforms.uShape.value = 1;
                    break;
                case 'diamond':
                    // program.uniforms.uShape.value = 2;
                    break;
                case 'square':
                    // program.uniforms.uShape.value = 3;
                    break;
            }
        }
    );

    gui.add(guiObj, 'direction', ['x', 'y', 'xy', 'yx', 'inside']).onChange(
        (value) => {
            switch (value) {
                case 'x':
                    // program.uniforms.uDirection.value = 1;
                    break;
                case 'y':
                    // program.uniforms.uDirection.value = 2;
                    break;
                case 'xy':
                    // program.uniforms.uDirection.value = 3;
                    break;
                case 'yx':
                    // program.uniforms.uDirection.value = 4;
                    break;
                case 'inside':
                    // program.uniforms.uDirection.value = 5;
                    break;
            }
        }
    );

    gui.add(guiObj, 'effect', [
        'transition',
        'transitionAlpha',
        'appearAlpha',
    ]).onChange((value) => {
        switch (value) {
            case 'transition':
                fade.effect = 1;
                break;
            case 'transitionAlpha':
                fade.effect = 2;
                break;
            case 'appearAlpha':
                fade.effect = 3;
                break;
        }
    });

    gui.add(guiObj, 'transitionSpread', 1, 4)
        .step(0.1)
        .onChange((value) => {
            // program.uniforms.uTransitionSpread.value = value;
        });
    gui.add(guiObj, 'speed', 0.5, 4).step(0.1);
    gui.add(guiObj, 'easing', gsapEasings);
    gui.addColor(guiObj, 'bkgColor').onChange((value) => {
        document.body.style.backgroundColor = value;
        // program.uniforms.uColor.value = new Color(value);
    });

    const extras = gui.addFolder('Extras FX');

    extras
        .add(guiObj, 'brightness')
        .name('Brightness')
        .onChange((value) => {
            // program.uniforms.uBrightness.value = value ? 1 : 0;
        });
    extras
        .add(guiObj, 'brightnessValue', 0, 1)
        .step(0.01)
        .name('Brightness strength')
        .onChange((value) => {
            // program.uniforms.uBrightnessValue.value = value;
        });

    extras
        .add(guiObj, 'overlayColor')
        .name('Overlay Color')
        .onChange((value) => {
            // program.uniforms.uOverlayColor.value = value ? 1 : 0;
        });

    document.body.style.backgroundColor = guiObj.bkgColor;
};

setGUI();
