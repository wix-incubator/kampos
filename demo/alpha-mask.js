import { Kampos, effects } from "../index.js";

const media1 = document.querySelector("#video3");
const media2 = document.querySelector("#video4");
const target = document.querySelector("#target");

// create the effects/transitions we need
const alphaMask = effects.alphaMask();

// init kampos
const instance = new Kampos({ target, effects: [alphaMask] });

// make sure videos are loaded and playing
prepareVideos([media1, media2])
    .then(() => loadImage(`https://picsum.photos/1200/1200?random=1`))
    .then((img) => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;
        // set media source
        instance.setSource({ media: media1, width, height });
        alphaMask.isLuminance = true;
        alphaMask.mask = img; // change to media2 for video as mask
        alphaMask.textures[0].update = true;
    });
// start kampos
instance.play();
