import {
    expect,
    test,
    beforeAll,
    beforeEach,
    afterEach,
    afterAll,
} from 'vitest';
import fs from 'fs';
import url from 'url';
import path from 'path';
import http from 'http';
import pify from 'pify';
import getPort from 'get-port';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import png from 'pngjs';

const { PNG } = png;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const PROJECT_PATH = path.resolve(__dirname, '../..');
const SIMPLE_VIDEO_CANVAS_DIMS = { width: 854, height: 480 };
const SIMPLE_VIDEO_DIMS = { width: 854, height: 480 };
const SIMPLE_VIDEO_CANVAS_POS = { x: 0, y: 484 };
const IMAGE_CANVAS_POS = { x: 0, y: 480 };
const VIDEO_URL_PREFIX = '/test/e2e/';
const SIMPLE_VIDEO_URL = `${VIDEO_URL_PREFIX}e2e-video.webm`;
const IMAGE_URL = `${VIDEO_URL_PREFIX}e2e-image.png`;

let server;
let browser;
let pageUrl;

async function createBrowser() {
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
}

async function setPage(ctx) {
    ctx.page = await browser.newPage();
    await ctx.page.setViewport({
        width: 1024,
        height: 1024,
        deviceScaleFactor: 1,
    });
}

const createServer = function () {
    return getPort().then((port) => {
        const serve = serveStatic(PROJECT_PATH, { index: ['index.html'] });
        const s = http.createServer((req, resp) =>
            serve(req, resp, finalhandler(req, resp)),
        );
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

async function initVideo(ctx, src, dims) {
    const page = ctx.page;

    const body = await page.$('body');
    await page.evaluate((b) => b.classList.remove('image-test'), body);

    const source = await page.$('#video');
    ctx.source = source;

    await page.evaluate(
        (video, url, dims) => {
            video.src = url;

            function _initVideo() {
                return new Promise((resolve) => {
                    video.addEventListener(
                        'playing',
                        () => {
                            video.style.width = `${dims.width}px`;
                            video.style.height = `${dims.height}px`;
                            resolve();
                        },
                        true,
                    );

                    video.play();
                });
            }

            return _initVideo().then(() => {
                video.pause();
                video.currentTIme = 1;
            });
        },
        source,
        src,
        dims,
    );
}

async function initImage(ctx, src, dims) {
    const page = ctx.page;

    const body = await page.$('body');
    await page.evaluate((b) => b.classList.add('image-test'), body);

    const source = await page.$('#image');
    const container = await page.$('#image-container');
    ctx.source = source;

    await page.evaluate(
        (image, container, url, dims) => {
            container.setAttribute('width', dims.width);
            container.setAttribute('height', dims.height);
            image.setAttribute('width', dims.width);
            image.setAttribute('height', dims.height);
            return new Promise((resolve) => {
                image.addEventListener('load', resolve);
                image.setAttribute('href', url);
            });
        },
        source,
        container,
        src,
        dims,
    );
}

async function drawEffect(ctx, filterContent, data, canvasDims) {
    const page = ctx.page;
    const source = ctx.source;

    ctx.kampos = await page.evaluateHandle(
        async (source, filterContent, data, canvasDims) => {
            const target = document.querySelector('#canvas');
            const filter = document.querySelector('#filter');
            const isVideo = source instanceof window.HTMLVideoElement;
            let media;

            if (isVideo) {
                media = source;
            } else {
                media = new Image();
                media.src = source.getAttribute('href');
                await new Promise((resolve) => {
                    media.onload = resolve;
                });
            }

            target.style.width = `${canvasDims.width}px`;
            target.style.height = `${canvasDims.height}px`;

            const { Kampos, effects } = window.kampos;
            const effectsToRender = data.map((datum) => {
                const effect = effects[datum.name](datum.arg);

                if (datum.path) {
                    effect.uniforms[datum.path[0]].data[0] = datum.value;
                } else if (datum.setter) {
                    effect[datum.setter] = datum.value;
                } else if (datum.value) {
                    Object.keys(datum.value).forEach((path) => {
                        const value = datum.value[path];

                        if (Number.isNaN(+path)) {
                            effect[path] = value;
                        } else {
                            effect.uniforms[path].data.splice(
                                0,
                                value.length,
                                ...value,
                            );
                        }
                    });
                }

                return effect;
            });

            if (filterContent) {
                filter.innerHTML = filterContent;

                source.style.filter = `url(#${filter.id})`;
            }

            let instance = new Kampos({ target, effects: effectsToRender });

            const width = isVideo
                ? source.videoWidth
                : +source.getAttribute('width');
            const height = isVideo
                ? source.videoHeight
                : +source.getAttribute('height');

            instance.setSource({ media, width, height });
            instance.play();

            return instance;
        },
        source,
        filterContent,
        data,
        canvasDims,
    );
}

beforeAll(async (ctx) => {
    server = await createServer();
    const port = server.port;
    const host = server.host;
    await server
        .listen({
            port,
            host,
        })
        .then(() => console.log(`listening on port ${port}`));

    pageUrl = `${server.url}/test/e2e/index.html`;

    await createBrowser();
});

beforeEach(async (ctx) => {
    await setPage(ctx);

    await ctx.page.goto(pageUrl);
});

afterEach(async (ctx) => {
    await ctx.page.evaluate((kampos) => kampos?.destroy(), ctx.kampos);
    await ctx.page.close();
});

afterAll(async () => {
    await browser.close();
    server.close();
});

function getTestFilenamePrefix(ctx) {
    return `test/e2e/screenshots/${ctx.task.name?.replace(/\s/g, '-')}`;
}

function takeScreenshot(page, filename, clip = {}) {
    return page.screenshot({
        omitBackground: false,
        path: `./${filename}`,
        clip: { x: 0, y: 0, ...clip },
    });
}

async function getDiffPixels(ctx, canvasDims, canvasPos, threshold = 0.14) {
    const page = ctx.page;
    const { width, height } = canvasDims;
    const testFilePrefix = getTestFilenamePrefix(ctx);
    const expectedFileName = `${testFilePrefix}_expected.png`;
    const actualFileName = `${testFilePrefix}_actual.png`;

    await takeScreenshot(page, expectedFileName, canvasDims);
    await takeScreenshot(page, actualFileName, { ...canvasPos, ...canvasDims });

    const expected = fs
        .createReadStream(expectedFileName)
        .pipe(new PNG())
        .on('parsed', doneReading);
    const actual = fs
        .createReadStream(actualFileName)
        .pipe(new PNG())
        .on('parsed', doneReading);

    let filesRead = 0;
    let resolve;
    const promise = new Promise((res) => {
        resolve = res;
    });

    function doneReading() {
        if (++filesRead < 2) {
            return;
        }

        expect(expected.width).toBe(actual.width);
        expect(expected.height).toBe(actual.height);

        const diff = new PNG({ width, height });
        const diffPixels = pixelmatch(
            expected.data,
            actual.data,
            diff.data,
            width,
            height,
            { threshold },
        );

        diff.pack().pipe(fs.createWriteStream(`${testFilePrefix}_diff.png`));

        resolve(diffPixels);
    }

    return promise;
}

function getBlendColorFilter(mode, color) {
    return `<feFlood flood-color="${color[0]}" flood-opacity="${color[1] || 1}" result="color"></feFlood>
<feBlend color-interpolation-filters="sRGB" mode="${mode}" in="SourceGraphic" in2="color"></feBlend>`;
}

function getBrightnessFilter(value) {
    return `<feComponentTransfer color-interpolation-filters="sRGB">
    <feFuncR type="linear" slope="${value}"/>
    <feFuncG type="linear" slope="${value}"/>
    <feFuncB type="linear" slope="${value}"/>
</feComponentTransfer>`;
}

function getContrastFilter(value) {
    return `<feComponentTransfer color-interpolation-filters="sRGB">
    <feFuncR type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
    <feFuncG type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
    <feFuncB type="linear" slope="${value}" intercept="${-(0.5 * value) + 0.5}"/>
</feComponentTransfer>`;
}

function getHueFilter(value) {
    return `<feColorMatrix color-interpolation-filters="sRGB" type="hueRotate" values="${value}"/>`;
}

function getSaturateFilter(value) {
    return `<feColorMatrix color-interpolation-filters="sRGB" in="SourceGraphic" type="saturate" values="${value}"/>`;
}

function getDuotoneFilter(dark, light) {
    return `<feColorMatrix color-interpolation-filters="sRGB" type="saturate" values="0">
</feColorMatrix>
<feColorMatrix type="matrix" values="${light[0] - dark[0]} 0 0 0 ${dark[0]}
                                     ${light[1] - dark[1]} 0 0 0 ${dark[1]}
                                     ${light[2] - dark[2]} 0 0 0 ${dark[2]}
                                     0                     0 0 1 0"></feColorMatrix>`;
}

function getSpecificChannelFilter(channels, value = 1) {
    return `<feComponentTransfer color-interpolation-filters="sRGB" in="SourceGraphic">
    <feFuncR type="linear" slope="${channels.includes('r') ? 1 : 0}"/>
    <feFuncG type="linear" slope="${channels.includes('g') ? 1 : 0}"/>
    <feFuncB type="linear" slope="${channels.includes('b') ? 1 : 0}"/>
</feComponentTransfer>`;
}

function getOffsetFilter(offset, result = '') {
    return `<feOffset dx="${offset.x || 0}" dy="${offset.y || 0}"${result ? ` result="${result}"` : ''}/>`;
}

function getChannelSplitFilter(offsetRed, offsetGreen, offsetBlue) {
    return `${getSpecificChannelFilter('r')}
    ${getOffsetFilter({x: offsetRed}, 'red')}
    ${getSpecificChannelFilter('g')}
    ${getOffsetFilter({x: offsetGreen}, 'green')}
    ${getSpecificChannelFilter('b')}
    ${getOffsetFilter({x: offsetBlue}, 'blue')}
    <feComposite operator="arithmetic" in="red" in2="green" result="yellow" k1="0" k2="1" k3="1" k4="0"></feComposite>
    <feComposite operator="arithmetic" in="yellow" in2="blue" k1="0" k2="1" k3="1" k4="0"></feComposite>`;
}

test('brightness 1.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBrightnessFilter(1.0),
        [{ name: 'brightnessContrast', setter: 'brightness', value: 1.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('brightness 1.5', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBrightnessFilter(1.5),
        [{ name: 'brightnessContrast', setter: 'brightness', value: 1.5 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
        0.2,
    );

    expect(diffPixels).toBe(0);
});

test('brightness 0.5', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBrightnessFilter(0.5),
        [{ name: 'brightnessContrast', setter: 'brightness', value: 0.5 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('contrast 1.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getContrastFilter(1.0),
        [{ name: 'brightnessContrast', setter: 'contrast', value: 1.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('contrast 1.5', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getContrastFilter(1.5),
        [{ name: 'brightnessContrast', setter: 'contrast', value: 1.5 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
        0.2,
    );

    expect(diffPixels).toBe(0);
});

test('contrast 0.2', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getContrastFilter(0.2),
        [{ name: 'brightnessContrast', setter: 'contrast', value: 0.2 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('hue 0.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getHueFilter(0),
        [{ name: 'hueSaturation', setter: 'hue', value: 0.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('hue 90', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getHueFilter(90),
        [{ name: 'hueSaturation', setter: 'hue', value: 90.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('hue 45', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getHueFilter(45),
        [{ name: 'hueSaturation', setter: 'hue', value: 45.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('hue -90', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getHueFilter(-90),
        [{ name: 'hueSaturation', setter: 'hue', value: -90 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('hue -135', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getHueFilter(-135),
        [{ name: 'hueSaturation', setter: 'hue', value: -135 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('saturate 1.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getSaturateFilter(1.0),
        [{ name: 'hueSaturation', setter: 'saturation', value: 1.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('saturate 0.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getSaturateFilter(0.0),
        [{ name: 'hueSaturation', setter: 'saturation', value: 0.0 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('saturate 1.5', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getSaturateFilter(1.5),
        [{ name: 'hueSaturation', setter: 'saturation', value: 1.5 }],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
        0.2,
    );

    expect(diffPixels).toBe(0);
});

test('duotone golden-purple', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.7411764706, 0.0431372549, 0.568627451],
            [0.9882352941, 0.7333333333, 0.05098039216],
        ),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.9882352941, 0.7333333333, 0.05098039216, 1],
                    dark: [0.7411764706, 0.0431372549, 0.568627451, 1],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone strawberry-midnight', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.00392156862745098, 0.09803921568627451, 0.5764705882352941],
            [1.0, 0.1843137254901961, 0.5725490196078431],
        ),
        [
            {
                name: 'duotone',
                value: {
                    light: [1.0, 0.1843137254901961, 0.5725490196078431, 1],
                    dark: [
                        0.00392156862745098, 0.09803921568627451,
                        0.5764705882352941, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone seafoam-lead', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
            [0.0, 0.9803921568627451, 0.5725490196078431],
        ),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone seafoam-lead | brightness 2.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
            [0.0, 0.9803921568627451, 0.5725490196078431],
        ) + getBrightnessFilter(2.0),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
            {
                name: 'brightnessContrast',
                setter: 'brightness',
                value: 2.0,
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('brightness 2.0 | duotone seafoam-lead', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBrightnessFilter(2.0) +
            getDuotoneFilter(
                [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
                [0.0, 0.9803921568627451, 0.5725490196078431],
            ),
        [
            {
                name: 'brightnessContrast',
                setter: 'brightness',
                value: 2.0,
            },
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone seafoam-lead | contrast 2.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
            [0.0, 0.9803921568627451, 0.5725490196078431],
        ) + getContrastFilter(2.0),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
            {
                name: 'brightnessContrast',
                setter: 'contrast',
                value: 2.0,
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('contrast 2.0 | duotone seafoam-lead', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getContrastFilter(2.0) +
            getDuotoneFilter(
                [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
                [0.0, 0.9803921568627451, 0.5725490196078431],
            ),
        [
            {
                name: 'brightnessContrast',
                setter: 'contrast',
                value: 2.0,
            },
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone seafoam-lead | contrast 0.2', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
            [0.0, 0.9803921568627451, 0.5725490196078431],
        ) + getContrastFilter(0.2),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
            {
                name: 'brightnessContrast',
                setter: 'contrast',
                value: 0.2,
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('contrast 0.2 | duotone seafoam-lead', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getContrastFilter(0.2) +
            getDuotoneFilter(
                [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
                [0.0, 0.9803921568627451, 0.5725490196078431],
            ),
        [
            {
                name: 'brightnessContrast',
                setter: 'contrast',
                value: 0.2,
            },
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('duotone seafoam-lead | brightness 0.5 | contrast 2.0', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getDuotoneFilter(
            [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
            [0.0, 0.9803921568627451, 0.5725490196078431],
        ) +
            getBrightnessFilter(0.5) +
            getContrastFilter(2.0),
        [
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
            {
                name: 'brightnessContrast',
                value: {
                    brightness: 0.5,
                    contrast: 2.0,
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('brightness 0.5 | contrast 2.0 | duotone seafoam-lead', async (ctx) => {
    await initVideo(ctx, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBrightnessFilter(0.5) +
            getContrastFilter(2.0) +
            getDuotoneFilter(
                [0.12941176470588237, 0.12941176470588237, 0.12941176470588237],
                [0.0, 0.9803921568627451, 0.5725490196078431],
            ),
        [
            {
                name: 'brightnessContrast',
                value: {
                    brightness: 0.5,
                    contrast: 2.0,
                },
            },
            {
                name: 'duotone',
                value: {
                    light: [0.0, 0.9803921568627451, 0.5725490196078431, 1],
                    dark: [
                        0.12941176470588237, 0.12941176470588237,
                        0.12941176470588237, 1,
                    ],
                },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        SIMPLE_VIDEO_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend multiply orange 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('multiply', [`rgb(${255}, ${128}, ${0})`, '1']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [1.0, 0.5, 0.0, 1.0],
                arg: { mode: 'multiply' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend screen turquoise 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('screen', [`rgb(${64}, ${224}, ${208})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [64 / 255, 224 / 255, 208 / 255, 1.0],
                arg: { mode: 'screen' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend overlay magenta 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('overlay', [
            `rgb(${255 * 0.8}, ${0}, ${255 * 0.8})`,
            '1.0',
        ]),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [0.8, 0.0, 0.8, 1.0],
                arg: { mode: 'overlay' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend darken magenta 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('darken', [`rgb(${255}, ${0}, ${255})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [1.0, 0.0, 1.0, 1.0],
                arg: { mode: 'darken' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend lighten yellow 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('lighten', [`rgb(${255}, ${255}, ${0})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [1.0, 1.0, 0.0, 1.0],
                arg: { mode: 'lighten' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

// TODO: SVG filter not working
test('blend colorDodge firebrick 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('color-dodge', [
            `rgb(${178}, ${34}, ${34})`,
            '1.0',
        ]),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [178 / 255, 34 / 255, 34 / 255, 1.0],
                arg: { mode: 'colorDodge' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend colorBurn darkolivegreen 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('color-burn', [`rgb(${85}, ${107}, ${47})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [85 / 255, 107 / 255, 47 / 255, 1.0],
                arg: { mode: 'colorBurn' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend hardLight yogurtpink 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('hard-light', [
            `rgb(${200}, ${150}, ${180})`,
            '1.0',
        ]),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [200 / 255, 150 / 255, 180 / 255, 1.0],
                arg: { mode: 'hardLight' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend softLight yellowgreen 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('soft-light', [
            `rgb(${154}, ${205}, ${50})`,
            '1.0',
        ]),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [154 / 255, 205 / 255, 50 / 255, 1.0],
                arg: { mode: 'softLight' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend difference yellowgreen 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('difference', [
            `rgb(${154}, ${205}, ${50})`,
            '1.0',
        ]),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [154 / 255, 205 / 255, 50 / 255, 1.0],
                arg: { mode: 'difference' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend exclusion yellowgreen 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('exclusion', [`rgb(${154}, ${205}, ${50})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [154 / 255, 205 / 255, 50 / 255, 1.0],
                arg: { mode: 'exclusion' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test.skip('blend hue indianred 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('hue', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [205 / 255, 92 / 255, 92 / 255, 1.0],
                arg: { mode: 'hue' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend saturation indianred 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('saturation', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [205 / 255, 92 / 255, 92 / 255, 1.0],
                arg: { mode: 'saturation' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('blend color indianred 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('color', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [205 / 255, 92 / 255, 92 / 255, 1.0],
                arg: { mode: 'color' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('luminosity color indianred 1.0', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);

    await drawEffect(
        ctx,
        getBlendColorFilter('luminosity', [`rgb(${205}, ${92}, ${92})`, '1.0']),
        [
            {
                name: 'blend',
                setter: 'color',
                value: [205 / 255, 92 / 255, 92 / 255, 1.0],
                arg: { mode: 'luminosity' },
            },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    expect(diffPixels).toBe(0);
});

test('channelSplit red cyan', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);
    const offset = SIMPLE_VIDEO_DIMS.width * 0.01;

    await drawEffect(
        ctx,
        getChannelSplitFilter(-offset, offset, offset),
        [
            { name: 'channelSplit', arg: { offsetRed: {x: 0.01, y: 0}, offsetGreen: {x: -0.01, y: 0}, offsetBlue: {x: -0.01, y: 0} } },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    // TODO: fix by taking the correct snapshots excluding the sides
    expect(diffPixels).toBe(7822); // expect the 7680 pixels of the horizontal sides to be different + 142 pixels of the gl.LINEAR filtering
});

test('channelSplit magenta green', async (ctx) => {
    await initImage(ctx, IMAGE_URL, SIMPLE_VIDEO_DIMS);
    const offset = SIMPLE_VIDEO_DIMS.width * 0.05;

    await drawEffect(
        ctx,
        getChannelSplitFilter(offset, -offset, offset),
        [
            { name: 'channelSplit', arg: { offsetRed: {x: -0.05, y: 0}, offsetGreen: {x: 0.05, y: 0}, offsetBlue: {x: -0.05, y: 0} } },
        ],
        SIMPLE_VIDEO_CANVAS_DIMS,
    );

    const diffPixels = await getDiffPixels(
        ctx,
        SIMPLE_VIDEO_CANVAS_DIMS,
        IMAGE_CANVAS_POS,
    );

    // TODO: fix by taking the correct snapshots excluding the sides
    expect(diffPixels).toBe(40320); // expect the 40320 pixels of the horizontal sides to be different
});
