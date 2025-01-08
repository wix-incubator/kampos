import { Kampos, effects } from '../index.js';

/*!
 * Adapted from Daniel Velasquez's "Creating a Water-like Distortion with Three.js"
 * https://tympanus.net/codrops/2019/10/08/creating-a-water-like-distortion-effect-with-three-js/
 */

const DEBUG = false;

const target = document.querySelector('#target');
const mapTarget = document.createElement('canvas');

const worker = new Worker('./blob-texture-worker.js');

const MAP_WIDTH = 1396;
const MAP_HEIGHT = 992;

loadImage(
    `https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=1`,
).then((img) => {
    const height = window.innerHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    target.width = width;
    target.height = height;

    mapTarget.width = width;
    mapTarget.height = height;

    const offscreen = mapTarget.transferControlToOffscreen();
    worker.postMessage({
        type: 'init',
        canvas: offscreen,
        width,
        height,
        radius: 130,
        intensity: 1.2,
        maxAge: 130,
        forceDecay: 0.01,
    }, [offscreen]);

    target.addEventListener('pointermove', ({ offsetX, offsetY}) => {
        worker.postMessage({ type: 'addpoint', event: { offsetX, offsetY} });
    });

    // create the main instance that renders the displaced image
    const displacement = effects.displacement({
        scale: { x: 0, y: 0 },
        enableBlueChannel: true,
    });
    displacement.map = mapTarget;
    displacement.textures[0].update = true; // to update

    if (DEBUG) {
        document.body.appendChild(mapTarget);
        mapTarget.style.pointerEvents = 'none';
        mapTarget.style.position = 'absolute';
        mapTarget.style.top = '0';
    }

    const instance = new Kampos({target, effects: [displacement]});

    // // set media source
    instance.setSource({media: img, width, height});

    instance.play();
});
