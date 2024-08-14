const {Kampos, effects, noise, transitions} = window.kampos;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
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
        cellFactor: 4
    },
    LIQUID: {
        octaves: 1,
        edge: 0.03,
        cellFactor: 2
    }
}

mapTarget.width = MAP_WIDTH;
mapTarget.height = MAP_HEIGHT;

/* this factor controls the size of the blobs in the noise - increase for smaller blobs */
const AMPLITUDE = ANIMATIONS[TYPE].cellFactor / MAP_WIDTH;
const frequency = {x: AMPLITUDE, y: AMPLITUDE};

/* increase number on range (1, 8) to go from water-like effect into clouds-like one */
const octaves = ANIMATIONS[TYPE].octaves;

/* change to false (or comment out) if you want to see the turbulence noise variant */
const isFractal = true;

/* create the turbulence effect we need for the map texture */
const turbulence = effects.turbulence({
    noise: noise.simplex,
    frequency,
    isFractal
});

const dissolveMap = new Kampos({ target: mapTarget, effects: [turbulence], noSource: true });

/* create the dissolve map by generating a single noise frame */
dissolveMap.draw();

/* you can play with this value on the range of (0.0, 1.0) to go from hard clipping to a smooth smoke-like mask */
const high = ANIMATIONS[TYPE].edge;

/* create the effects/transitions we need */
const dissolve = transitions.dissolve({ high });
dissolve.map = mapTarget;

/* init kampos */
const instance = new Kampos({target, effects:[dissolve]});

/* make sure videos are loaded and playing */
prepareVideos([media1, media2])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        /* set media source */
        instance.setSource({media: media1, width, height});

        /* set media to transition into*/
        dissolve.to = media2;
        if (DYNAMIC) {
            dissolve.textures[1].update = true;
        }

        /* start kampos */
        instance.play(function draw (time) {
            /* this is invoked once in every animation frame, while the mouse over the canvas */
            if (DYNAMIC) {
                turbulence.time = time * 2;
                dissolveMap.draw();
            }
            /* you can reduce time factor for slower transition, or increase for faster */
            dissolve.progress = Math.abs(Math.sin(time * (DYNAMIC ? 2e-4 : 4e-4)));
        });
    });
