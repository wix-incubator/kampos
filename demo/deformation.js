import { Kampos, effects } from '../index.js';

// const media = document.querySelector('#video9');
const target = document.querySelector('#target');

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

function lerp (a, b, t) {
    return a * (1 - t) + b * t;
}

/* make sure video is loaded and playing */
loadImage(
    `https://picsum.photos/${WIDTH}/${HEIGHT}?random=1`,
).then((img) => {

    // const width = media.videoWidth;
    // const height = media.videoHeight;
    const height = window.document.documentElement.clientHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    /*
     * Deformation effect
     * based on mouse position
     */
    const deformation = effects.deformation({
        radius: 0.3,
        aspectRatio: width / height,
        deformation: effects.deformation.MAGNIFY,
    });

    const instance = new Kampos({ effects: [deformation], target });

    /* set media source */
    instance.setSource({ media: img, width, height });

    let lastPoint = { x: 0, y: 0 };
    let currentPoint = { x: 0, y: 0 };

    instance.play(() => {
         lastPoint = {
             x: lerp(lastPoint.x, currentPoint.x, 0.1),
             y: lerp(lastPoint.y, currentPoint.y, 0.1),
         };

        deformation.position = lastPoint;
    });

    target.addEventListener('pointermove', (e) => {
        const { offsetX, offsetY } = e;
        currentPoint = {
            x: offsetX / width,
            y: (height - offsetY) / height,
        };
    });
});
