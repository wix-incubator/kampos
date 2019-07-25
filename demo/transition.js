import {Kampos} from '../src/kampos';
import transitionDisplacement from '../src/transitions/displacement';

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        const direction = entry.isIntersecting ? 'forward' : 'backward';
        Transition.targets.get(entry.target)[direction]();
    });
}, {
    root: null,
    rootMargin: '0%',
    threshold: 0.8
});

class Transition {
    constructor ({vid1, vid2, target, disp, ticker, dispScale}) {
        this.vid1 = vid1;
        this.vid2 = vid2;
        this.target = target;
        this.playing = 0;
        this.timeupdate = 0;
        this.disp = disp;
        this.dispScale = dispScale;
        this.transition = transitionDisplacement();

        this.direction = 1;
        this.startTime = 0;

        this.ready = new Promise(resolve => {
            this.setReady = resolve;
        });

        this.kampos = new Kampos({target, effects: [this.transition], ticker});

        this.initVideo();

        const forward = () => {
            this.direction = 1;
            this.startTime = Date.now();
            this.play();
        };

        const backward = () => {
            this.direction = 0;
            this.startTime = Date.now();
            this.play();
        };

        // target.addEventListener('mouseenter', forward);
        // target.addEventListener('mouseleave', backward);

        observer.observe(target);

        Transition.targets.set(target, {forward, backward});
    }

    initVideo () {

        function canPlay (e) {
            e.target.play();
        }

        const isPlaying = e => {
            this.playing += 1;
            e.target.removeEventListener('playing', isPlaying, true);
            check();
        };
        const isTimeupdate = (e) => {
            this.timeupdate += 1;
            e.target.removeEventListener('timeupdate', isTimeupdate, true);
            check();
        };

        const dispReady = new Promise(resolve => {
            const img = new Image();

            img.onload = function () {
                resolve(this);
            };

            img.src = this.disp;
        });

        const check = () => {
            if (this.playing === 2 && this.timeupdate === 2) {
                const width = this.vid1.videoWidth;
                const height = this.vid1.videoHeight;

                this.target.style.width = `${width}px`;
                this.target.style.height = `${height}px`;

                dispReady.then(img => {
                    this.transition.map = img;
                    this.transition.to = this.vid2;

                    this.transition.sourceScale = {x: this.dispScale};
                    this.transition.toScale = {x: -this.dispScale};

                    this.kampos.setSource({media: this.vid1, width, height});
                    this.setReady();
                });

                this.vid1.removeEventListener('canplay', canPlay, true);
                this.vid2.removeEventListener('canplay', canPlay, true);
            }
        };


        [this.vid1, this.vid2].forEach(vid => {
            vid.addEventListener('playing', isPlaying, true);
            vid.addEventListener('timeupdate', isTimeupdate, true);
            vid.addEventListener('canplay', canPlay, true);
        });
    }

    tick (p) {
        this.transition.progress = p;
    }

    play () {
        const now = Date.now() - this.startTime;
        let p = Math.abs(Math.sin(now / .5e3));
        p = this.direction ? p : 1 - p;

        this.tick(p);

        if (this.direction) {
            if (p * 1e2 < 99) {
                window.requestAnimationFrame(() => this.play());
            }
            else {
                window.requestAnimationFrame(() => this.tick(1));
            }
        }
        else {
            if (p * 1e2 > 1) {
                window.requestAnimationFrame(() => this.play());
            }
            else {
                window.requestAnimationFrame(() => this.tick(0));
            }
        }
    }
}

Transition.targets = new Map();

export default Transition;
