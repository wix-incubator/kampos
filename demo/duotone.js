const {Kampos, effects} = window.kampos;

const target = document.querySelector('#target');
const media = document.querySelector('#video6');

// create the effects we need
const duotone = effects.duotone();

// init kampos with effect
const instance = new Kampos({target, effects:[duotone]});

prepareVideos([media])
    .then(() => {
        const width = media.videoWidth;
        const height = media.videoHeight;

        // set media source
        instance.setSource({media, width, height});

        // start kampos
        instance.play();

        // add mouse events to disable/enable the effect
        target.addEventListener('mouseenter', () => {
            duotone.disabled = true;
        });

        target.addEventListener('mouseleave', () => {
            duotone.disabled = false;
        });
    });
