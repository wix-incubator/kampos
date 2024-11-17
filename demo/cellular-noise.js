import { Kampos, utilities, noise } from '../index.js';

const WIDTH = 854;
const HEIGHT = 480;
const CELL = 10;

const target = document.querySelector('canvas');
target.width = WIDTH;
target.height = HEIGHT;

const resolution = utilities.resolution({
    x: CELL / WIDTH,
    y: CELL / HEIGHT,
});

const render = {
    fragment: {
        uniform: {
            u_time: 'float',
        },
        constant: noise.cellular,
        main: 'color = vec3(noise(vec3(gl_FragCoord.xy * u_resolution.xy, u_time * 0.0005)));',
    },
    uniforms: [
        {
            name: 'u_time',
            type: 'f',
            data: [1.0],
        },
    ],
    get time() {
        return this.uniforms[0].data[0];
    },
    set time(t) {
        this.uniforms[0].data[0] = t;
    },
};

const instance = new Kampos({ target, effects: [resolution, render], noSource: true });

const start = Date.now();

// you can increase/decrease the time factor for a faster/slower animation
instance.play(() => (render.time = (Date.now() - start) * 2));
