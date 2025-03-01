import { Kampos, fbos, effects } from '../index.js';

const GUI = lil.GUI;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');

// create the effects/transitions we need
const gridMouseDisplacement = effects.gridMouseDisplacement({ aspectRatio: 1 });
const flowmapGrid = fbos.flowmapGrid({ aspectRatio: 1 });

const guiObj = {
    radius: 130,
    gridSize: 1000,
    relaxation: 0.93,
    resetForce: 0.3,
    displacementForce: 0.01,
    rgbShift: true,
    ratio: 'square', // using String here to simplify choices, but in the end it's a Number used for aspectRatio
};

// init kampos
const instance = new Kampos({
    target,
    effects: [gridMouseDisplacement],
    fbo: {
        size: Math.ceil(Math.sqrt(guiObj.gridSize)),
        effects: [flowmapGrid],
    },
});

// make sure videos are loaded and playing
prepareVideos([media1, media2]).then(() => {
    const width = media1.videoWidth;
    const height = media1.videoHeight;

    // set media source
    instance.setSource({ media: media1, width, height });

    // start kampos
    resizeHandler(target);
    instance.play();
});

let x, y, rect;
let drawing = false;
let movement = 1;
let mousePos = [0, 0];
let deltaMouse = [0, 0];
let mouse = {
    x: 0,
    y: 0,
};

// this is invoked once in every animation frame, while there's a mouse move over the canvas
function tick() {
    // gridMouseDisplacement.progress = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
    // hueSat.hue = Math.max(0, Math.min(1, (x - rect.x) / rect.width)) * 360 - 180;

    // movement -= (gui.resetForce * 0.01 * deltaTime) / 8
    movement -= guiObj.resetForce * 0.01;
    movement = Math.max(0, movement);
    // drawing = false;

    flowmapGrid.mouse = mousePos;
    flowmapGrid.deltaMouse = deltaMouse;
    flowmapGrid.movement = movement;

    requestAnimationFrame(tick);
}

tick();

// handler for detecting mouse move
const moveHandler = (e) => {
    const { clientX, clientY } = e;

    // cache mouse location

    rect = target.getBoundingClientRect();

    mouse.x = (clientX - rect.x) / rect.width;
    mouse.y = 1 - clientY / rect.height;

    deltaMouse = [(mouse.x - mousePos[0]) * 80, (mouse.y - mousePos[1]) * 80];
    mousePos = [mouse.x, mouse.y];

    movement = 1;

    flowmapGrid.containerResolution = [rect.width, rect.height];

    // // only once! a frame
    // if (!drawing) {
    //     drawing = true;
    //     // read here
    //     rect = target.getBoundingClientRect();
    //     // write on next frame
    //     requestAnimationFrame(tick);
    // }
};

/*
 * register event handlers for interaction
 */
target.addEventListener('mousemove', moveHandler);

const resizeHandler = (target) => {
    const rect = target.getBoundingClientRect();
    flowmapGrid.containerResolution = [rect.width, rect.height];
    gridMouseDisplacement.containerResolution = [rect.width, rect.height];
};

window.addEventListener('resize', resizeHandler.bind(null, target));

const setGUI = () => {
    const gui = new GUI();

    gui.add(guiObj, 'ratio', ['rectangle', 'square']).onChange((value) => {
        const ratioUniform = value === 'square' ? 1 : 16 / 9;
        flowmapGrid.aspectRatio = ratioUniform;
        gridMouseDisplacement.aspectRatio = ratioUniform;
        resizeHandler(target);
    });
    gui.add(guiObj, 'rgbShift').onChange((value) => {
        gridMouseDisplacement.rgbShift = value;
    });
    gui.add(guiObj, 'radius', 1, 300).onChange((value) => {
        flowmapGrid.radius = value;
    });
    gui.add(guiObj, 'gridSize', 100, 8000).onChange((value) => {
        this.size = Math.ceil(Math.sqrt(value));
        this.handleResize(target);
    });
    gui.add(guiObj, 'displacementForce', 0, 0.1).onChange((value) => {
        gridMouseDisplacement.displacementForce = value;
    });
    gui.add(guiObj, 'resetForce', 0.08, 1);
    gui.add(guiObj, 'relaxation', 0.8, 0.99).onChange((value) => {
        flowmapGrid.relaxation = value;
    });
};

setGUI();
