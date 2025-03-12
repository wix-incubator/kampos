import { Kampos, fbos, effects, utilities } from '../index.js';

const GUI = lil.GUI;

const media1 = document.querySelector('#video3');
const target = document.querySelector('#target');

// create the effects/transitions we need
let gridMouseDisplacement;
let flowmapGrid;
let resolution;
let instance;

const guiObj = {
    radius: 130,
    gridSize: 1000,
    relaxation: 0.93,
    resetForce: 0.3,
    intensity: 0.01,
    channelSplit: true,
    ratio: 'square', // using String here to simplify choices, but in the end it's a Number used for aspectRatio
};

// make sure videos are loaded and playing
prepareVideos([media1]).then(() => {
    generateInstance({ aspectRatio: 1 });
});


const rect = target.getBoundingClientRect();
let movement = 1;
let mousePos = [0, 0];
let deltaMouse = [0, 0];
const mouse = {
    x: 0,
    y: 0,
};

let lastTime = 0;

function generateInstance({ aspectRatio }) {
    if (instance) {
        instance.destroy();
    }

    // create the effects/transitions we need
    resolution = utilities.resolution({ width: rect.width, height: rect.height });
    gridMouseDisplacement = effects.gridMouseDisplacement({ aspectRatio });
    flowmapGrid = fbos.flowmapGrid({ aspectRatio, width: rect.width, height: rect.height });

    // init kampos
    instance = new Kampos({
        target,
        effects: [resolution, gridMouseDisplacement],
        fbo: {
            size: Math.ceil(Math.sqrt(guiObj.gridSize)),
            //size: rect.height,
            effects: [flowmapGrid],
        },
    });

    // set media source
    const width = media1.videoWidth;
    const height = media1.videoHeight;
    instance.setSource({ media: media1, width, height });

    resizeHandler(target);

    instance.play(function (time) {
        const deltaTime = (time - lastTime);
        lastTime = time;

        movement -= (guiObj.resetForce * 0.01 * deltaTime) / 8;
        movement = Math.max(0, movement);

        if (flowmapGrid) {
            flowmapGrid.mouse = { x: mousePos[0], y: mousePos[1] };
            flowmapGrid.deltaMouse = { x: deltaMouse[0], y: deltaMouse[1] };
            flowmapGrid.movement = movement;
        }
    });
}

// handler for detecting pointer move
const moveHandler = (e) => {
    const { offsetX, offsetY } = e;

    mouse.x = (offsetX - rect.x) / rect.width;
    mouse.y = 1 - offsetY / rect.height;

    deltaMouse = [(mouse.x - mousePos[0]) * 80, (mouse.y - mousePos[1]) * 80];
    mousePos = [mouse.x, mouse.y];

    movement = 1;
};

/*
 * register event handlers for interaction
 */
target.addEventListener('pointermove', moveHandler);

const resizeHandler = (target) => {
    rect.width = target.offsetWidth;
    rect.height = target.offsetHeight;
    flowmapGrid.resolution = { x: rect.width,  y: rect.height };
    resolution.resolutoin = { x: rect.width, y: rect.height };
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
    gui.add(guiObj, 'channelSplit').onChange((value) => {
        gridMouseDisplacement.enableChannelSplit = value;
    });
    gui.add(guiObj, 'radius', 1, 300).onChange((value) => {
        flowmapGrid.radius = value;
    });
    gui.add(guiObj, 'gridSize', 100, 8000).onChange((value) => {
        // have to recreate whole instance because fboSize needs to change
        const ratioUniform = guiObj.ratio === 'square' ? 1 : 16 / 9;
        generateInstance({ aspectRatio: ratioUniform });
        resizeHandler(target);
    });
    gui.add(guiObj, 'intensity', 0, 0.1).onChange((value) => {
        gridMouseDisplacement.intensity = value;
    });
    gui.add(guiObj, 'resetForce', 0.08, 1);
    gui.add(guiObj, 'relaxation', 0.8, 0.99).onChange((value) => {
        flowmapGrid.relaxation = value;
    });
};

setGUI();
