const {Kampos, effects} = window.kampos;

const target = document.querySelector('#target');
const media = document.querySelector('#video6');

// create the effects we need
const duotone = effects.duotone();
const hueSaturation = effects.hueSaturation();

// init kampos with effect
const instance = new Kampos({target, effects:[duotone, hueSaturation]});

// prepareVideos([media])
loadImage('https://static.wixstatic.com/media/cec2b6_36e46176b7e54b678e4c6d39d36452e5~mv2.jpg')
    .then((img) => {
        // const width = media.videoWidth;
        // const height = media.videoHeight;
        const height = window.document.documentElement.clientHeight;
        const width = height * img.naturalWidth / img.naturalHeight;

        // set media source
        instance.setSource({media: img, width, height});

        // start kampos
        instance.play((time) => {
            hueSaturation.hue = Math.sin(time / 2e3) * 360;
        });

        // add mouse events to disable/enable the effect
        target.addEventListener('mouseenter', () => {
            duotone.disabled = true;
            hueSaturation.hueDisabled = true;
        });

        target.addEventListener('mouseleave', () => {
            duotone.disabled = false;
            hueSaturation.hueDisabled = false;
        });
    });
