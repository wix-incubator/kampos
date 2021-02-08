const {Kampos, effects, noise, transitions} = window.kampos;

const media1 = document.querySelector('#video3');
const media2 = document.querySelector('#video4');
const target = document.querySelector('#target');

const mapTarget = document.createElement('canvas');
const MAP_WIDTH = 854;
const MAP_HEIGHT = 480;
const CELL_FACTOR = 4;

mapTarget.width = MAP_WIDTH;
mapTarget.height = MAP_HEIGHT;

const USE_TURBULENCE = true;
let dissolveMapEffects;

if (USE_TURBULENCE) {
    // create the effects we need
    const turbulence = effects.turbulence(noise.simplex);
    // const turbulence = effects.turbulence(noise.cellular);
    // create a simple effect that converts the turbulence return value into the output color
    const render = {fragment: {main: 'color = vec3(turbulenceValue);'}};

    // try playing with this factor
    const AMPLITUDE = CELL_FACTOR / MAP_WIDTH;

    turbulence.frequency = {x: AMPLITUDE, y: AMPLITUDE};
    turbulence.octaves = 1; // water
    // turbulence.octaves = 8; // clouds
    // change to false (or comment out) if you want to see the turbulence noise variant
    turbulence.isFractal = true;

    dissolveMapEffects = [turbulence, render];
}
else {
    const render = {
        fragment: {
            uniform: {
                u_resolution: 'vec2',
                u_time: 'float'
            },
            constant: noise.cellular,
            //constant: noise.simplex,
            //constant: noise.perlinNoise,
            main: `color = vec3(noise(vec3(gl_FragCoord.xy/u_resolution.xy, 0.0)));`
        },
        uniforms: [
            {
                name: 'u_resolution',
                type: 'f',
                data: [MAP_WIDTH / CELL_FACTOR, MAP_HEIGHT / CELL_FACTOR]
            }
        ]
    };

    dissolveMapEffects = [render];
}

const dissolveMap = new Kampos({ target: mapTarget, effects: dissolveMapEffects, noSource: true });

// create the dissolve map by generating a single noise frame
dissolveMap.draw();

// create the effects/transitions we need
const dissolve = transitions.dissolve();
dissolve.map = mapTarget;

// init kampos
const instance = new Kampos({target, effects:[dissolve]});

// make sure videos are loaded and playing
prepareVideos([media1, media2])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        // set media source
        instance.setSource({media: media1, width, height});

        // set media to transition into
        dissolve.to = media2;

        // start kampos
        instance.play();
    });

// this is invoked once in every animation frame, while the mouse over the canvas
function draw (time) {
    dissolve.progress = Math.sin(time * 4e-4);
}

const loop = time => {
    draw(time);
    requestAnimationFrame(loop);
}

/*
 * start the loop
 */
requestAnimationFrame(loop);
