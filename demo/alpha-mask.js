import { Kampos, effects } from "../index.js";

const media1 = document.querySelector("#video3");
const media2 = document.querySelector("#video4");
const target = document.querySelector("#target");

// create the effects/transitions we need
const alphaMask = effects.alphaMask();

// make sure videos are loaded and playing
prepareVideos([media1, media2])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        alphaMask.isLuminance = true;
        alphaMask.mask = media2;
        // it's a video so update on every frame
        alphaMask.textures[0].update = true;

        // init kampos
        const instance = new Kampos({ target, effects: [alphaMask] });

        // set media source
        instance.setSource({ media: media1, width, height });
        // start kampos
        instance.play();
    });
