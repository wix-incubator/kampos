const {Kampos, effects, noise, transitions} = window.kampos;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');

const mapTarget = document.createElement('canvas');
const MAP_WIDTH = 854;
const MAP_HEIGHT = 480;

/* this factor controls the size of the blobs in the noise - increase for smaller blobs */
const CELL_FACTOR = 4;

mapTarget.width = MAP_WIDTH;
mapTarget.height = MAP_HEIGHT;

/* create the turbulence effect we need for the map texture */
const turbulence = effects.turbulence(noise.simplex);

/* create a simple effect that converts the turbulence return value into the output color */
const render = {fragment: {main: 'color = vec3(turbulenceValue);'}};

/* try playing with this factor */
const AMPLITUDE = CELL_FACTOR / MAP_WIDTH;

turbulence.frequency = {x: AMPLITUDE, y: AMPLITUDE};

/* increase number on range (1, 8) to go from water-like effect into clouds-like one */
turbulence.octaves = 1; // water
//turbulence.octaves = 8; // clouds

/* change to false (or comment out) if you want to see the turbulence noise variant */
turbulence.isFractal = true;

const dissolveMap = new Kampos({ target: mapTarget, effects: [turbulence, render], noSource: true });

/* create the dissolve map by generating a single noise frame */
dissolveMap.draw();

/* create the effects/transitions we need */
const dissolve = transitions.dissolve();
dissolve.map = mapTarget;

/* you can play with this value on the range of (0.0, 1.0) to go from hard clipping to a smooth smoke-like mask */
dissolve.high = 0.02;

/* init kampos */
const instance = new Kampos({target, effects:[dissolve]});

/* make sure videos are loaded and playing*/
prepareVideos([media1, media2])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        /* set media source */
        instance.setSource({media: media1, width, height});

        /* set media to transition into*/
        dissolve.to = media2;
        /* uncomment this line to allow map texture to update on every frame during transition */
        //dissolve.textures[1].update = true;

        /* start kampos */
        instance.play();
    });

/* this is invoked once in every animation frame, while the mouse over the canvas */
function draw (time) {
    /* uncomment the two lines below to start changing the map during transition */
    //turbulence.time = time * 2;
    //dissolveMap.draw();
    /* you can reduce time factor for slower transition, or increase for faster */
    dissolve.progress = Math.abs(Math.sin(time * 4e-4));
}

const loop = time => {
    draw(time);
    requestAnimationFrame(loop);
}

/*
 * start the loop
 */
requestAnimationFrame(loop);
