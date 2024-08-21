/*
 * Most simple image loader
 * You'll probably have something like this already
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            resolve(this);
        };

        img.src = src;
    });
}

window.loadImage = loadImage;

/*
 * Minimal, cross-browser logic for playing videos and making sure
 * they are ready to work with
 */
function prepareVideos(videos) {
    return new Promise((resolve) => {
        let playing = 0;
        let timeupdate = 0;

        function canPlay(e) {
            e.target.play();
        }

        const isPlaying = (e) => {
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
                videos.forEach((vid) => {
                    vid.removeEventListener('canplay', canPlay, true);
                });

                resolve();
            }
        };

        videos.forEach((vid) => {
            vid.addEventListener('playing', isPlaying, true);
            vid.addEventListener('timeupdate', isTimeupdate, true);
            vid.addEventListener('canplay', canPlay, true);
        });
    });
}

window.prepareVideos = prepareVideos;
