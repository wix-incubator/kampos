const {Kampos, transitions} = window.kampos;
const transitionDisplacement = transitions.displacement;

/*
 * Wrapper class for transition logic.
 * This is a simple vanilla implementation
 */
class Transition {
    constructor ({vid1, vid2, target, disp, dispScale}) {
        /*
         * prepare here everything we need
         */
        this.vid1 = vid1;
        this.vid2 = vid2;
        this.target = target;
        this.dispScale = dispScale;
        this.transition = transitionDisplacement();

        this.direction = 1;
        this.startTime = 0;

        // init kampos
        this.kampos = new Kampos({target, effects: [this.transition]});

        // load the displacement map image
        const dispReady = loadImage(disp);

        // make sure videos are loaded and playing
        prepareVideos([this.vid1, this.vid2])
            .then(() => {
                const height = window.document.documentElement.clientHeight;
                const width = height * this.vid1.videoWidth / this.vid1.videoHeight;

                dispReady.then(img => {
                    /*
                     * set transition values
                     */
                    this.transition.map = img;
                    this.transition.to = this.vid2;

                    // try playing with the x/y and +/- for different transition effects
                    this.transition.sourceScale = {x: this.dispScale};
                    this.transition.toScale = {x: -this.dispScale};

                    // set media source
                    this.kampos.setSource({media: this.vid1, width, height});

                    // start kampos
                    this.kampos.play();
                });
            });
    }

    /*
     * start animation playback forward
     */
    forward () {
        this.direction = 1;
        this.startTime = Date.now();
        this.loop();
    }

    /*
     * start animation playback backwards
     */
    backward () {
        this.direction = 0;
        this.startTime = Date.now();
        this.loop();
    }

    /*
     * This will probably be a callback you'll provide to your animation library
     */
    tick (p) {
        this.transition.progress = p;
    }

    /*
     * This will usually be implemented by an animation library you may already have in your project
     */
    loop () {
        const now = Date.now() - this.startTime;
        // dividing by 500 is just enough to slow down the effect
        // you can change the sin() function with a different one for a different easing
        let p = Math.abs(Math.sin(now / 500));
        p = this.direction ? p : 1 - p;

        this.tick(p);

        let nextTick = () => this.loop();

        // we choose a cutoff value where the progress value
        // is almost 0/1, depending on direction
        // and then stop the animation by just rendering
        // 1 extra tick with the final value (0 or 1 respectively).
        if (this.direction) {
            if (p * 100 >= 99) {
                nextTick = () => this.tick(1);
            }
        }
        else if (p * 100 <= 1) {
            nextTick = () => this.tick(0);
        }

        window.requestAnimationFrame(nextTick);
    }
}

const video1 = document.querySelector('#video1');
const video2 = document.querySelector('#video2');
const target = document.querySelector('#target');

const trans = new Transition({
    vid1: video1,
    vid2: video2,
    target,
    // switch between the different displacement-map images and refresh to see different effects
    disp: 'disp-cloud.png',
    //disp: 'disp-liquid.jpg',
    //disp: 'disp-tri.jpg',
    // disp: 'disp-snow.jpg',
    // change this value and refresh to see how it affects the transition
    dispScale: 1.0
});

/*
 * register event handlers for interaction
 */
target.addEventListener('mouseenter', () => trans.forward());
target.addEventListener('mouseleave', () => trans.backward());
