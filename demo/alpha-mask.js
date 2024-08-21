import { Kampos, effects } from '../index.js';

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');
// create the effects/transitions we need
const alphaMask = effects.alphaMask();
console.log('works!')

// init kampos
const instance = new Kampos({target, effects:[alphaMask]});

// make sure videos are loaded and playing
prepareVideos([media1, media2])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        // set media source
        instance.setSource({media: media1, width, height});

        alphaMask.mask = media2;

        // start kampos
        instance.play();
    });
