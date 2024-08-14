const {Kampos, effects, noise, transitions} = window.kampos;

const media = document.querySelector('#video8');
const target = document.querySelector('#target');

const kaleidoscope = effects.kaleidoscope();

const instance = new Kampos({effects: [kaleidoscope], target})

/* make sure video is loaded and playing */
prepareVideos([media])
    .then(() => {
        const width = media.videoWidth;
        const height = media.videoHeight;

        /* set media source */
        instance.setSource({media, width, height});

        instance.play();

        target.addEventListener('pointermove', (e) => {
            const { offsetX, offsetY } = e;
            kaleidoscope.offset = offsetX / width - 0.5;
        });
    });
