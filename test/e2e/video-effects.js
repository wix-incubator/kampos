import fs from 'fs';
import url from 'url';
import path from 'path';
import http from 'http';
import pify from 'pify';
import getPort from 'get-port';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import test from 'ava';
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import png from 'pngjs';

const {PNG} = png;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const PROJECT_PATH = path.resolve(__dirname, '../..');
const SIMPLE_VIDEO_CANVAS_DIMS = {width: 854, height: 480};
const SIMPLE_VIDEO_DIMS = {width: 854, height: 480};
const SIMPLE_VIDEO_CANVAS_POS = {x: 0, y: 484};
const IMAGE_CANVAS_POS = {x: 0, y: 480};
const VIDEO_URL_PREFIX = '/test/e2e/';
const SIMPLE_VIDEO_URL = `${VIDEO_URL_PREFIX}e2e-video.webm`;
const IMAGE_URL = `${VIDEO_URL_PREFIX}e2e-image.png`;

let server;
let browser;
let pageUrl;

async function createBrowser () {
    browser = await puppeteer.launch();
}

async function setPage (t) {
    t.context.page = await browser.newPage();
    await t.context.page.setViewport({
        width: 1024,
        height: 1024,
        deviceScaleFactor: 1,
    });
}

const createServer = function () {
    return getPort().then(port => {
        const serve = serveStatic(PROJECT_PATH, {'index': ['index.html']});
        const s = http.createServer((req, resp) => serve(req, resp, finalhandler(req, resp)));
        const host = 'localhost';

        s.host = host;
        s.port = port;
        s.url = `http://${host}:${port}`;
        s.protocol = 'http';

        s.listen = pify(s.listen, Promise);
        s.close = pify(s.close, Promise);

        return s;
    });
};

async function initVideo (t, src, dims) {
    const page = t.context.page;

    const body = await page.$('body');
    await page.evaluate(b => b.classList.remove('image-test'), body);

    const source = await page.$('#video');
    t.context.source = source;

    await page.evaluate((video, url, dims) => {
        video.src = url;

        function _initVideo () {
            return new Promise((resolve) => {
                video.addEventListener('playing', () => {
                    video.style.width = `${dims.width}px`;
                    video.style.height = `${dims.height}px`;
                    resolve();
                }, true);

                video.play();
            });
        }

        return _initVideo().then(() => {
            video.pause();
            video.currentTIme = 1;
        });
    }, source, src, dims);
}

async function initImage (t, src, dims) {
    const page = t.context.page;

    const body = await page.$('body');
    await page.evaluate(b => b.classList.add('image-test'), body);

    const source = await page.$('#image');
    const container = await page.$('#image-container');
    t.context.source = source;

    await page.evaluate((image, container, url, dims) => {
        container.setAttribute('width', dims.width);
        container.setAttribute('height', dims.height);
        image.setAttribute('width', dims.width);
        image.setAttribute('height', dims.height);
        return new Promise((resolve) => {
            image.addEventListener('load', resolve);
            image.setAttribute('href', url);
        });
    }, source, container, src, dims);
}

async function drawEffect (t, filterContent, data, canvasDims) {
    const page = t.context.page;
    const source = t.context.source;

    t.context.kampos = await page.evaluateHandle(async (source, filterContent, data, canvasDims) => {
        const target = document.querySelector('#canvas');
        const filter = document.querySelector('#filter');
        const isVideo = source instanceof window.HTMLVideoElement;
        let media;

        if ( isVideo ) {
            media = source;
        }
        else {
            media = new Image();
            media.src = source.getAttribute('href');
            await new Promise(resolve => {
                media.onload = resolve;
            });
        }

        target.style.width = `${canvasDims.width}px`;
        target.style.height = `${canvasDims.height}px`;

        const {Kampos, effects} = window.kampos;
        const effectsToRender = data.map(datum => {
            const effect = effects[datum.name](datum.arg);

            if ( datum.path ) {
                effect.uniforms[datum.path[0]].data[0] = datum.value;
            }
            else if ( datum.setter ) {
                effect[datum.setter] = datum.value;
            }
            else if ( datum.value ) {
                Object.keys(datum.value).forEach(path => {
                    const value = datum.value[path];

                    if ( Number.isNaN(+path) ) {
                        effect[path] = value;
                    }
                    else {
                        effect.uniforms[path].data.splice(0, value.length, ...value);
                    }
                });
            }

            return effect;
        });

        if ( filterContent ) {
            filter.innerHTML = filterContent;

            source.style.filter = `url(#${filter.id})`;
        }

        let instance = new Kampos({target, effects: effectsToRender});

        const width = isVideo ? source.videoWidth : +source.getAttribute('width');
        const height = isVideo ? source.videoHeight : +source.getAttribute('height');

        instance.setSource({media, width, height});
        instance.play();

        return instance;
    }, source, filterContent, data, canvasDims);
}

test.before(async () => {
    server = await createServer();
    const port = server.port;
    const host = server.host;
    await server.listen({
        port,
        host
    }).then(() => console.log(`listening on port ${port}`));

    pageUrl = `${server.url}/test/e2e/index.html`;

    await createBrowser();
});

test.beforeEach(async t => {
    await setPage(t);

    await t.context.page.goto(pageUrl);
});

test.afterEach(async t => {
    await t.context.page.evaluate(kampos => kampos.destroy(), t.context.kampos);
    await t.context.page.close();
});

test.after(async () => {
    await browser.close();
    server.close();
});

function getTestFilenamePrefix (t) {
    return `test/e2e/screenshots/${t.title.replace(/\s/g, '-')}`;
}

function takeScreenshot (page, filename, clip = {}) {
    return page.screenshot({
        omitBackground: false,
        path: `./${filename}`,
        clip: {x: 0, y: 0, ...clip}
    });
}

async function getDiffPixels (t, canvasDims, canvasPos, threshold = 0.14) {
    const page = t.context.page;
    const {width, height} = canvasDims;
    const testFilePrefix = getTestFilenamePrefix(t);
    const expectedFileName = `${testFilePrefix}_expected.png`;
    const actualFileName = `${testFilePrefix}_actual.png`;

    await takeScreenshot(page, expectedFileName, canvasDims);
    await takeScreenshot(page, actualFileName, {...canvasPos, ...canvasDims});

    const expected = fs.createReadStream(expectedFileName).pipe(new PNG()).on('parsed', doneReading);
    const actual = fs.createReadStream(actualFileName).pipe(new PNG()).on('parsed', doneReading);

    let filesRead = 0;
    let resolve;
    const promise = new Promise(res => {
        resolve = res;
    });

    function doneReading () {
        if ( ++filesRead < 2 ) {
            return;
        }

        t.is(expected.width, actual.width);
        t.is(expected.height, actual.height);

        const diff = new PNG({width, height});
        const diffPixels = pixelmatch(expected.data, actual.data, diff.data, width, height, {threshold});

        diff.pack().pipe(fs.createWriteStream(`${testFilePrefix}_diff.png`));

        resolve(diffPixels);
    }

    return promise;
}

function getBlendColorFilter (mode, color) {
    return `<feFlood flood-color="${color[0]}" flood-opacity="${color[1] || 1}" result="color"></feFlood>
<feBlend color-interpolation-filters="sRGB" mode="${mode}" in="SourceGraphic" in2="color"></feBlend>`;
}

function getBrightnessFilter (value) {
    return `<feComponentTransfer color-interpolation-filters="sRGB">
    <feFuncR type="linear" slope="${value}"/>
    <feFuncG type="linear" slope="${value}"/>
    <feFuncB type="linear" slope="${value}"/>
</feComponentTransfer>`;
}

function getContrastFilter (value) {
    return `<feComponentTransfer color-interpolation-filters="sRGB">
    <feFuncR type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
    <feFuncG type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
    <feFuncB type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
</feComponentTransfer>`;
}

function getHueFilter (value) {
    return `<feColorMatrix color-interpolation-filters="sRGB" type="hueRotate" values="${value}"/>`;
}

function getSaturateFilter (value) {
    return `<feColorMatrix color-interpolation-filters="sRGB" in="SourceGraphic" type="saturate" values="${value}"/>`;
}

function getDuotoneFilter (dark, light) {
    return `<feColorMatrix color-interpolation-filters="sRGB" type="saturate" values="0">
</feColorMatrix>
<feColorMatrix type="matrix" values="${light[0] - dark[0]} 0 0 0 ${dark[0]}
                                     ${light[1] - dark[1]} 0 0 0 ${dark[1]}
                                     ${light[2] - dark[2]} 0 0 0 ${dark[2]}
                                     0                     0 0 1 0"></feColorMatrix>`;
}

test.serial('brightness 1.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBrightnessFilter(1.0),
        [{name: 'brightnessContrast', setter: 'brightness', value: 1.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('brightness 1.5', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBrightnessFilter(1.5),
        [{name: 'brightnessContrast', setter: 'brightness', value: 1.5}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS, 0.2);

    t.is(diffPixels, 0);
});

test.serial('brightness 0.5', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBrightnessFilter(0.5),
        [{name: 'brightnessContrast', setter: 'brightness', value: 0.5}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('contrast 1.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getContrastFilter(1.0),
        [{name: 'brightnessContrast', setter: 'contrast', value: 1.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('contrast 1.5', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getContrastFilter(1.5),
        [{name: 'brightnessContrast', setter: 'contrast', value: 1.5}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS, 0.2);

    t.is(diffPixels, 0);
});

test.serial('contrast 0.2', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getContrastFilter(0.2),
        [{name: 'brightnessContrast', setter: 'contrast', value: 0.2}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('hue 0.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getHueFilter(0),
        [{name: 'hueSaturation', setter: 'hue', value: 0.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('hue 90', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getHueFilter(90),
        [{name: 'hueSaturation', setter: 'hue', value: 90.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});


test.serial('hue 45', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getHueFilter(45),
        [{name: 'hueSaturation', setter: 'hue', value: 45.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('hue -90', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getHueFilter(-90),
        [{name: 'hueSaturation', setter: 'hue', value: -90}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('hue -135', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getHueFilter(-135),
        [{name: 'hueSaturation', setter: 'hue', value: -135}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('saturate 1.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getSaturateFilter(1.0),
        [{name: 'hueSaturation', setter: 'saturation', value: 1.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('saturate 0.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getSaturateFilter(0.0),
        [{name: 'hueSaturation', setter: 'saturation', value: 0.0}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('saturate 1.5', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getSaturateFilter(1.5),
        [{name: 'hueSaturation', setter: 'saturation', value: 1.5}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS, 0.2);

    t.is(diffPixels, 0);
});

test.serial('duotone golden-purple', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.7411764706, 0.0431372549, 0.568627451],
        [0.9882352941, 0.7333333333, 0.05098039216]),
        [{
            name: 'duotone',
            value: {
                light: [0.9882352941, 0.7333333333, 0.05098039216, 1],
                dark: [0.7411764706, 0.0431372549, 0.568627451, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone strawberry-midnight', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.00392156862745098, 0.09803921568627451, 0.5764705882352941],
        [1.0, 0.1843137254901961, 0.5725490196078431]),
        [{
            name: 'duotone',
            value: {
                light: [1.0, 0.1843137254901961, 0.5725490196078431, 1],
                dark: [0.00392156862745098, 0.09803921568627451, 0.5764705882352941, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone seafoam-lead', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]),
        [{
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone seafoam-lead | brightness 2.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]) + getBrightnessFilter(2.0),
        [{
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }, {
            name: 'brightnessContrast',
            setter: 'brightness',
            value: 2.0
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('brightness 2.0 | duotone seafoam-lead', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBrightnessFilter(2.0) + getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]),
        [{
            name: 'brightnessContrast',
            setter: 'brightness',
            value: 2.0
        }, {
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone seafoam-lead | contrast 2.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]) + getContrastFilter(2.0),
        [{
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }, {
            name: 'brightnessContrast',
            setter: 'contrast',
            value: 2.0
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('contrast 2.0 | duotone seafoam-lead', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getContrastFilter(2.0) + getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]),
        [{
            name: 'brightnessContrast',
            setter: 'contrast',
            value: 2.0
        }, {
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone seafoam-lead | contrast 0.2', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]) + getContrastFilter(0.2),
        [{
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }, {
            name: 'brightnessContrast',
            setter: 'contrast',
            value: 0.2
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('contrast 0.2 | duotone seafoam-lead', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getContrastFilter(0.2) + getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]),
        [{
            name: 'brightnessContrast',
            setter: 'contrast',
            value: 0.2
        }, {
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('duotone seafoam-lead | brightness 0.5 | contrast 2.0', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]) + getBrightnessFilter(0.5) + getContrastFilter(2.0),
        [{
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }, {
            name: 'brightnessContrast',
            value: {
                brightness: 0.5,
                contrast: 2.0
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('brightness 0.5 | contrast 2.0 | duotone seafoam-lead', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBrightnessFilter(0.5) + getContrastFilter(2.0) + getDuotoneFilter(
        [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
        [0.0, 0.9803921568627451, 0.5725490196078431]),
        [{
            name: 'brightnessContrast',
            value: {
                brightness: 0.5,
                contrast: 2.0
            }
        }, {
            name: 'duotone',
            value: {
                light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                dark: [0.12941176470588237, 0.12941176470588237, 0.12941176470588237, 1]
            }
        }], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, SIMPLE_VIDEO_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend multiply orange 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('multiply', [`rgb(${255}, ${128}, ${0})`, '1']),
        [{name: 'blend', setter: 'color', value: [1.0, 0.5, 0.0, 1.0], arg: {mode: 'multiply'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend screen turquoise 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('screen', [`rgb(${64}, ${224}, ${208})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [64/255, 224/255, 208/255, 1.0], arg: {mode: 'screen'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend overlay magenta 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('overlay', [`rgb(${255 * 0.8}, ${0}, ${255 * 0.8})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [0.8, 0.0, 0.8, 1.0], arg: {mode: 'overlay'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend darken magenta 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('darken', [`rgb(${255}, ${0}, ${255})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [1.0, 0.0, 1.0, 1.0], arg: {mode: 'darken'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend lighten yellow 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('lighten', [`rgb(${255}, ${255}, ${0})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [1.0, 1.0, 0.0, 1.0], arg: {mode: 'lighten'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

// TODO: SVG filter not working
test.serial('blend colorDodge firebrick 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('color-dodge', [`rgb(${178}, ${34}, ${34})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [178/255, 34/255, 34/255, 1.0], arg: {mode: 'colorDodge'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend colorBurn darkolivegreen 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('color-burn', [`rgb(${85}, ${107}, ${47})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [85/255, 107/255, 47/255, 1.0], arg: {mode: 'colorBurn'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend hardLight yogurtpink 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('hard-light', [`rgb(${200}, ${150}, ${180})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [200/255, 150/255, 180/255, 1.0], arg: {mode: 'hardLight'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend softLight yellowgreen 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('soft-light', [`rgb(${154}, ${205}, ${50})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [154/255, 205/255, 50/255, 1.0], arg: {mode: 'softLight'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend difference yellowgreen 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('difference', [`rgb(${154}, ${205}, ${50})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [154/255, 205/255, 50/255, 1.0], arg: {mode: 'difference'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend exclusion yellowgreen 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('exclusion', [`rgb(${154}, ${205}, ${50})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [154/255, 205/255, 50/255, 1.0], arg: {mode: 'exclusion'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.failing('blend hue indianred 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('hue', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [205/255, 92/255, 92/255, 1.0], arg: {mode: 'hue'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend saturation indianred 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('saturation', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [205/255, 92/255, 92/255, 1.0], arg: {mode: 'saturation'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('blend color indianred 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('color', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [205/255, 92/255, 92/255, 1.0], arg: {mode: 'color'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});

test.serial('luminosity color indianred 1.0', async t => {
    await initImage(t, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(t, getBlendColorFilter('luminosity', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [{name: 'blend', setter: 'color', value: [205/255, 92/255, 92/255, 1.0], arg: {mode: 'luminosity'}}], SIMPLE_VIDEO_CANVAS_DIMS);

    const diffPixels = await getDiffPixels(t, SIMPLE_VIDEO_CANVAS_DIMS, IMAGE_CANVAS_POS);

    t.is(diffPixels, 0);
});
