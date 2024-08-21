import { Kampos, effects, noise, transitions } from '../index.js';

const target = document.querySelector('#target');

const mapTarget = document.createElement('canvas');
const MAP_WIDTH = 854;
const MAP_HEIGHT = 480;

/* Change to true to see the effect with dynamic noise animation */
const DYNAMIC = false;

/* Try flipping between animation types */
const TYPE = 'LIQUID';
//const TYPE = 'SMOKE';
const ANIMATIONS = {
    SMOKE: {
        octaves: 8,
        edge: 0.4,
        cellFactor: 4,
    },
    LIQUID: {
        octaves: 1,
        edge: 0.03,
        cellFactor: 2,
    },
};

mapTarget.width = MAP_WIDTH;
mapTarget.height = MAP_HEIGHT;

/* this factor controls the size of the blobs in the noise - increase for smaller blobs */
const AMPLITUDE = ANIMATIONS[TYPE].cellFactor / MAP_WIDTH;
const frequency = { x: AMPLITUDE, y: AMPLITUDE };

/* increase number on range (1, 8) to go from water-like effect into clouds-like one */
const octaves = ANIMATIONS[TYPE].octaves;

/* change to false (or comment out) if you want to see the turbulence noise variant */
const isFractal = true;

/* create the turbulence effect we need for the map texture */
const turbulence = effects.turbulence({
    noise: noise.simplex,
    frequency,
    isFractal,
});

const dissolveMap = new Kampos({
    target: mapTarget,
    effects: [turbulence],
    noSource: true,
});

/* create the dissolve map by generating a single noise frame */
dissolveMap.draw();

/* you can play with this value on the range of (0.0, 1.0) to go from hard clipping to a smooth smoke-like mask */
const high = ANIMATIONS[TYPE].edge;

/* create the effects/transitions we need */
const dissolve = transitions.dissolve({ high });
dissolve.map = mapTarget;

/* init kampos */
const instance = new Kampos({ target, effects: [dissolve] });

/* make sure videos are loaded and playing*/
Promise.all([
    loadImage(`https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=1`),
    loadImage(`https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=2`),
    loadImage(`https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=3`),
    loadImage(`https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=4`),
]).then((images) => {
    const width = MAP_WIDTH;
    const height = MAP_HEIGHT;
    let index = 0;

    if (DYNAMIC) {
        dissolve.textures[1].update = true;
    }

    /* paint initial scene */
    instance.setSource({ media: images[0], width, height });
    dissolve.to = images[1];
    instance.draw();

    function easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }

    function changeImage(prevImage, nextImage) {
        /* set media source */
        instance.setSource({ media: prevImage, width, height });

        /* set media to transition into */
        dissolve.to = nextImage;

        const start = performance.now();

        /* start kampos */
        instance.play(function draw() {
            const time = performance.now() - start;

            /* this is invoked once in every animation frame */
            if (DYNAMIC) {
                turbulence.time = time * 2;
                dissolveMap.draw();
            }

            /* you can reduce time factor for slower transition, or increase for faster */
            const progress = easeOutCubic(time * (DYNAMIC ? 2e-4 : 4e-4));
            dissolve.progress = progress;

            if (progress * 100 >= 99.9) {
                instance.stop();

                // bind the event again
                bindClick();
            }
        });
    }

    function next() {
        const from = images[index];

        // next...
        index = (index + 1) % images.length;

        const to = images[index];

        changeImage(from, to);
    }

    function prev() {
        const from = images[index];

        // prev...
        index = (index - 1 + images.length) % images.length;

        const to = images[index];

        changeImage(from, to);
    }

    function click(event) {
        const { offsetX } = event;

        target.classList.remove('clickable');

        if (offsetX > width / 2) {
            next();
        } else {
            prev();
        }
    }

    function bindClick() {
        target.classList.add('clickable');
        target.addEventListener('click', click, { once: true });
    }

    bindClick();
});
