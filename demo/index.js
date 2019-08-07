(function () {
    'use strict';

    /*
     * Most simple image loader
     * You'll probably have something like this already
     */
    function loadImage$1 (src) {
        return new Promise(resolve => {
            const img = new Image();

            img.onload = function () {
                resolve(this);
            };

            img.src = src;
        });
    }

    window.loadImage = loadImage$1;

    /*
     * Minimal, cross-browser logic for playing videos and making sure
     * they are ready to work with
     */
    function prepareVideos$1 (videos) {
        return new Promise(resolve => {
            let playing = 0;
            let timeupdate = 0;

            function canPlay (e) {
                e.target.play();
            }

            const isPlaying = e => {
                playing += 1;
                e.target.removeEventListener('playing', isPlaying, true);
                check();
            };
            const isTimeupdate = (e) => {
                timeupdate += 1;
                e.target.removeEventListener('timeupdate', isTimeupdate, true);
                check();
            };

            const check = () => {
                if (playing === videos.length && timeupdate === videos.length) {
                    videos.forEach(vid => {
                        vid.removeEventListener('canplay', canPlay, true);
                    });

                    resolve();
                }
            };

            videos.forEach(vid => {
                vid.addEventListener('playing', isPlaying, true);
                vid.addEventListener('timeupdate', isTimeupdate, true);
                vid.addEventListener('canplay', canPlay, true);
            });
        });
    }

    window.prepareVideos = prepareVideos$1;

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
                    const width = this.vid1.videoWidth;
                    const height = this.vid1.videoHeight;

                    dispReady.then(img => {
                        /*
                         * set transition values
                         */
                        this.transition.map = img;
                        this.transition.to = this.vid2;

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
    const target1 = document.querySelector('#target1');

    const trans = new Transition({
        vid1: video1,
        vid2: video2,
        target: target1,
        disp: 'disp-snow.jpg',
        dispScale: 1.0
    });

    /*
     * register event handlers for interaction
     */
    target1.addEventListener('mouseenter', () => trans.forward());
    target1.addEventListener('mouseleave', () => trans.backward());

    const {Kampos: Kampos$1, effects, transitions: transitions$1} = window.kampos;

    const media1 = document.querySelector('#video3');
    const media2 = document.querySelector('#video4');
    const target = document.querySelector('#target2');

    // create the effects/transitions we need
    const hueSat = effects.hueSaturation();
    const fade = transitions$1.fade();

    // init kampos
    const instance = new Kampos$1({target, effects:[fade, hueSat]});

    // make sure videos are loaded and playing
    prepareVideos([media1, media2])
        .then(() => {
            const width = media1.videoWidth;
            const height = media1.videoHeight;

            // set media source
            instance.setSource({media: media1, width, height});

            // set media to transition into
            fade.to = media2;

            // start kampos
            instance.play();
        });

    let x, y, rect;
    let drawing = false;

    // this is invoked once in every animation frame, while there's a mouse move over the canvas
    function tick () {
        fade.progress = Math.max(0, Math.min(1, (y - rect.y) / rect.height));
        hueSat.hue = Math.max(0, Math.min(1, (x - rect.x) / rect.width)) * 360 - 180;
        drawing = false;
    }

    // handler for detecting mouse move
    const moveHandler = e => {
        const {clientX, clientY} = e;

        // cache mouse location
        x = clientX;
        y = clientY;

        // only once! a frame
        if (!drawing) {
            drawing = true;
            // read here
            rect = target.getBoundingClientRect();
            // write on next frame
            requestAnimationFrame(tick);
        }
    };

    /*
     * register event handlers for interaction
     */
    target.addEventListener('mouseenter', () => {
        target.addEventListener('mousemove', moveHandler);
    });

    target.addEventListener('mouseleave', () => {
        target.removeEventListener('mousemove', moveHandler);
    });

}());
