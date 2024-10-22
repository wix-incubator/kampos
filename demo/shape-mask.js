import { Kampos, effects } from '../index.js';

const media = document.querySelector('#video9');
const target = document.querySelector('#target');

/* make sure video is loaded and playing */
prepareVideos([media]).then(() => {
    const width = media.videoWidth;
    const height = media.videoHeight;

    const shapeMask = effects.shapeMask({
        radius: 0.2,
        aspectRatio: width / height,
        deformation: effects.shapeMask.MAGNIFY,
    });

    const instance = new Kampos({ effects: [shapeMask], target });

    /* set media source */
    instance.setSource({ media, width, height });

    instance.play();

    target.addEventListener('pointermove', (e) => {
        const { offsetX, offsetY } = e;
        shapeMask.position = {
            x: offsetX / width,
            y: (height - offsetY) / height,
        };
    });
});
