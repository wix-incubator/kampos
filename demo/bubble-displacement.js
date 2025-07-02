import { Kampos, effects, noise } from '../index.js';

const target = document.querySelector('#target');
const mapTarget = document.createElement('canvas');

const worker = new Worker('./bubble-texture-worker.js');

loadImage(`https://picsum.photos/1200/800?random=3`).then((img) => {
    const height = window.innerHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    target.width = width;
    target.height = height;

    mapTarget.width = width;
    mapTarget.height = height;

    const offscreen = mapTarget.transferControlToOffscreen();
    worker.postMessage(
        {
            type: 'init',
            canvas: offscreen,
            width,
            height,
            bubbleRadius: 60,
            intensity: 1.0,
            maxAge: 120,
            fadeSpeed: 0.01,
            bubbleCount: 8,
        },
        [offscreen]
    );

    let lastMousePos = { x: 0, y: 0 };
    let mouseSpeed = 0;

    target.addEventListener('pointermove', ({ offsetX, offsetY }) => {
        const currentPos = { x: offsetX, y: offsetY };
        const deltaX = currentPos.x - lastMousePos.x;
        const deltaY = currentPos.y - lastMousePos.y;
        mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 0.05;

        worker.postMessage({
            type: 'addBubble',
            event: {
                offsetX,
                offsetY,
                speed: Math.min(mouseSpeed + 0.2, 1.0),
            },
        });

        lastMousePos = currentPos;
    });

    // Create displacement effect
    const displacement = effects.displacement({
        scale: { x: 0.1, y: 0.1 },
        enableBlueChannel: true,
    });
    displacement.map = mapTarget;
    displacement.textures[0].update = true;

    const instance = new Kampos({
        target,
        effects: [displacement],
    });

    // Set media source
    instance.setSource({ media: img, width, height });

    instance.play();
});
