const {Kampos, effects, noise} = window.kampos;

const target = document.createElement('canvas');
target.width = 854;
target.height = 480;

const target2 = document.querySelector('#target');
const media1 = document.querySelector('#video5');

// uncomment here if you want to see just the turbulence
//target2.parentNode.replaceChild(target, target2);

// create the effects we need
const turbulence = effects.turbulence(noise.simplex);
// create a simple effect that converts the turbulence return value into the output color
const render = {fragment: {main: 'color = vec3(turbulenceValue);'}};
const disp = effects.displacement();

// try playing with this factor
const AMPLITUDE = 1 / target.width;

turbulence.frequency = {x: AMPLITUDE, y: AMPLITUDE};
turbulence.octaves = 4;
// change to false (or comment out) if you want to see the turbulence noise variant
turbulence.isFractal = true;

// init kampos
const instance = new Kampos({target, effects:[turbulence, render], noSource: true});

const instance2 = new Kampos({target: target2, effects:[disp]});

// start playing the noise map in a loop
const start = Date.now();

// you can increase/decrease the time factor for a faster/slower animation
instance.play(
    () => turbulence.time = (Date.now() - start) * 2
);

prepareVideos([media1])
    .then(() => {
        const width = media1.videoWidth;
        const height = media1.videoHeight;

        // set media source
        instance2.setSource({media: media1, width, height});

        disp.map = target;
        disp.scale = {x: 0.15, y: -0.15};
        disp.textures[0].update = true; // to update

        // start kampos
        instance2.play();
    });
