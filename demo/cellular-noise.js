const { Kampos, effects, noise } = window.kampos;

const target = document.querySelector('canvas');
target.width = 854;
target.height = 480;

const render = {
    fragment: {
        uniform: {
            u_resolution: 'vec2',
            u_time: 'float'
        },
        constant: noise.cellular,
        main: 'color = vec3(noise(vec3(gl_FragCoord.xy/u_resolution.xy, u_time * 0.0005)));'
    },
    uniforms: [
        {
            name: 'u_time',
            type: 'f',
            data: [1.0]
        },
        {
            name: 'u_resolution',
            type: 'f',
            data: [854 / 10, 480 / 10]
        }
    ],
    get time() {
        return this.uniforms[0].data[0];
    },
    set time(t) {
        this.uniforms[0].data[0] = t;
    }
};

const instance = new Kampos({ target, effects: [render], noSource: true });

const start = Date.now();

// you can increase/decrease the time factor for a faster/slower animation
instance.play(
    () => render.time = (Date.now() - start) * 2
);
