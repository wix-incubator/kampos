import {Kampos, Ticker} from '../src/kampos';
// import transparentVideo from '../src/effects/transparent-video';
import alphaMask from '../src/effects/alpha-mask';
import brightnessContrast from '../src/effects/brightness-contrast';
import hueSaturation from '../src/effects/hue-saturation';
import duotone from '../src/effects/duotone';

const video = document.querySelector('#video');
const videoUrl = document.querySelector('#video-url');
const maskUrl = document.querySelector('#alpha-mask-url');
let target = document.querySelector('#target');
// let maskURL = 'https://static.wixstatic.com/shapes/3943e2a044854dfbae0fbe56ec72c7d9.svg';
let maskURL = 'https://static.wixstatic.com/shapes/2fc6253d53dc4925aab74c224256d7f8.svg';

let playing = false;
let timeupdate = false;

function initVideo () {
    video.src = videoUrl.value;

    video.addEventListener('playing', isPlaying, true);
    video.addEventListener('timeupdate', isTimeupdate, true);
    video.addEventListener('canplay', canPlay, true);
}

function canPlay () {
    video.play();
}

function isPlaying () {
    playing = true;
    video.removeEventListener('playing', isPlaying, true);
    check();
}
function isTimeupdate () {
    timeupdate = true;
    video.removeEventListener('timeupdate', isTimeupdate, true);
    check();
}

function check () {
    if (playing && timeupdate) {
        playing = false;
        timeupdate = false;

        const width = video.videoWidth;
        // const height = video.videoHeight / (toggleTransparent.checked ? 2 : 1);
        const height = video.videoHeight;

        target.style.width = `${width}px`;
        target.style.height = `${height}px`;

        if ( toggleAlphaMask.checked ) {
            createMaskImage(width, height)
                .then(function () {
                    instance.setSource({media: video, type: 'video', width, height});
                    ticker.start();
                });
        }
        else {
            instance.setSource({media: video, type: 'video', width, height});
            ticker.start();
        }
        video.removeEventListener('canplay', canPlay, true);
    }
}

function hex2vec4 (hex) {
    const s = hex.substring(1);
    return [s[0] + s[1], s[2] + s[3], s[4] + s[5], 'ff'].map(h => parseInt(h, 16) / 255);
}

function drawInlineSVG (ctx, rawSVG, callback) {
    const svg = new Blob([rawSVG], {type:"image/svg+xml"}),
        url = URL.createObjectURL(svg),
        img = new Image;

    img.onload = function () {
        ctx.drawImage(this, 0, 0);
        URL.revokeObjectURL(url);
        callback(this);
    };

    img.src = url;
}

function fetchSVG () {
    return window.fetch(maskURL).then(function (response) {
        return response.text();
    });
}

function handleRangeChange (e) {
    const target = e.target;
    const effect = target.id;
    let data;

    switch ( effect ) {
        case 'brightness':
        case 'contrast':
            bc[effect] = target.value;
            data = [bc[effect]];
            break;
        case 'hue':
        case 'saturation':
            hs[effect] = target.value;
            data = [hs[effect]];
            break;
        case 'duotone-light':
            dt.light = hex2vec4(target.value);
            e.target.nextElementSibling.textContent = target.value;
            break;
        case 'duotone-dark':
            dt.dark = hex2vec4(target.value);
            e.target.nextElementSibling.textContent = target.value;
            break;
    }

    if ( data ) {
        data[0] = parseFloat(target.value);
        e.target.nextElementSibling.textContent = data[0];
    }
}

const inputs = ['brightness', 'contrast', 'hue', 'saturation', 'duotone-light', 'duotone-dark'];
const hs = hueSaturation();
const bc = brightnessContrast();
const dt = duotone();
// const tv = transparentVideo();
const am = alphaMask();

// const toggleTransparent = document.querySelector('#toggle-transparent');
const toggleDuotone = document.querySelector('#toggle-duotone');
const toggleAlphaMask = document.querySelector('#toggle-alphamask');

// const duotoneChecked = toggleDuotone.checked;
// const transparentChecked = toggleTransparent.checked;
const toggleAlphaMaskChecked = toggleAlphaMask.checked;

const effects = [];

// if (transparentChecked) {
//     effects.push(tv);
// }

effects.push(bc);

// if (duotoneChecked) {
effects.push(dt);
// }

effects.push(hs);

if (toggleAlphaMaskChecked) {
    effects.push(am);
}

function createMaskImage (width, height) {
    if ( maskURL.endsWith('.svg') ) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        return new Promise(function (resolve) {
            fetchSVG().then(function (text) {
                const div = document.createElement('div');
                div.innerHTML = text;
                const svg = div.firstElementChild;
                document.body.appendChild(svg);
                const bbox = svg.getBBox();
                document.body.removeChild(svg);
                svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                canvas.width = width;
                canvas.height = height;

                drawInlineSVG(ctx, svg.outerHTML, () => {
                    am.textures[0].image = canvas;
                    resolve();
                });
            });
        });
    }
    else {
        return new Promise(function (resolve) {
            const img = new Image();

            img.crossOrigin = 'anonymous';
            img.onload = function () {
                am.textures[0].image = this;
                resolve();
            };

            img.src = maskURL;
        });
    }
}

inputs.map(function (name) {
    return document.getElementById(name);
})
    .map(function (input) {
        input.addEventListener('input', handleRangeChange);
    });

function toggleHandler () {
    // instance.destroy();

    // Works around an issue with working with the old context
    const newCanvas = document.createElement('canvas');
    target.parentElement.replaceChild(newCanvas, target);
    target = newCanvas;


    effects.length = 0;

    // if ( toggleTransparent.checked ) {
    //     effects.push(tv);
    // }

    effects.push(bc);

    // if ( toggleDuotone.checked ) {
    effects.push(dt);
    // }

    effects.push(hs);

    if ( toggleAlphaMask.checked ) {
        effects.push(am);
    }

    const width = video.videoWidth;
    // const height = video.videoHeight / (toggleTransparent.checked ? 2 : 1);
    const height = video.videoHeight;

    newCanvas.style.width = `${width}px`;
    newCanvas.style.height = `${height}px`;

    instance.init({target, effects, ticker});
    instance.setSource({media: video, type: 'video', width, height});
}

toggleDuotone.addEventListener('input', e => {
    dt.disabled = !e.target.checked;
});
// toggleTransparent.addEventListener('input', toggleHandler);
toggleAlphaMask.addEventListener('input', toggleHandler);

const ticker = new Ticker();
let instance = new Kampos({target, effects, ticker});

initVideo();

videoUrl.addEventListener('input', initVideo);
maskUrl.addEventListener('input', e => {
    maskURL = e.target.value;

    const width = video.videoWidth;
    // const height = video.videoHeight / (toggleTransparent.checked ? 2 : 1);
    const height = video.videoHeight;

    createMaskImage(width, height)
        .then(() => instance._createTextures())
});

const toggleBackgroundColor = document.querySelector('#toggle-background-color');
const backgroundColor = document.querySelector('#background-color');

toggleBackgroundColor.addEventListener('input', e => {
    document.body.style.backgroundImage = e.target.checked ? 'none' : '';
});

backgroundColor.addEventListener('input', e => {
    document.body.style.backgroundColor = backgroundColor.value;
    e.target.nextElementSibling.innerText = e.target.value;
});

document.querySelector('#duotone-switch').addEventListener('click', e => {
    const light = document.querySelector('#duotone-light');
    const dark = document.querySelector('#duotone-dark');

    const lightValue = light.value;
    const darkValue = dark.value;

    light.value = darkValue;
    dark.value = lightValue;

    handleRangeChange({target: light});
    handleRangeChange({target: dark});
});
