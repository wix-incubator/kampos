import test from 'ava';
import path from 'path';
import http from 'http';
import pify from 'pify';
import puppeteer from 'puppeteer';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import getPort from 'get-port';
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const PROJECT_PATH = path.resolve(__dirname, '../..');
const SIMPLE_VIDEO_CANVAS_DIMS = {width: 854, height: 480};
const SIMPLE_VIDEO_DIMS = {width: 854, height: 480};
const VIDEO_URL_PREFIX = '/test/e2e/';
const SIMPLE_VIDEO_URL = `${VIDEO_URL_PREFIX}e2e-video.ogg`;

let server;
let browser;
let pageUrl;

async function createBrowser () {
    browser = await puppeteer.launch({
        headless: false
    });
}

async function setPage (t) {
    t.context.page = await browser.newPage();
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

        return _initVideo().then(() => video.pause());
    }, source, src, dims);
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
    // await t.context.page.evaluate(vgls => vgls && vgls.forEach(vgl => vgl.destroy()), t.context.vgls);
    await t.context.page.close();
});

test.after(async () => {
    await browser.close();
    server.close();
});

test('playing an instance with lost context should restore context and recover', async t => {
    await initVideo(t, SIMPLE_VIDEO_URL, SIMPLE_VIDEO_DIMS);

    const NUM_CONTEXTS = 17;
    const page = t.context.page;
    const source = t.context.source;

    const kamposs = await page.evaluateHandle((video, canvasDims, NUM_CONTEXTS) => {
        const _target = document.querySelector('#canvas');
        const instances = [];

        for (let index = 1; index <= NUM_CONTEXTS; index++ ) {
            const target = _target.cloneNode(true);
            target.id = `canvas${index}`;
            _target.parentNode.appendChild(target);

            target.style.width = `${canvasDims.width}px`;
            target.style.height = `${canvasDims.height}px`;

            const {Kampos, effects} = window.kampos;

            let instance = new Kampos({target, effects: []});

            const width = video.videoWidth;
            const height = video.videoHeight;

            instance.setSource({media: video, type: 'video', width, height});
            instance.play();
            instances.push(instance);
        }

        return instances;
    }, source, SIMPLE_VIDEO_CANVAS_DIMS, NUM_CONTEXTS);

    const stateHandle = await t.context.page.evaluateHandle(kamposs => {
        return kamposs.reduce((acc, kampos) => {
            acc[kampos.config.target.id] = kampos.lostContext;

            return acc;
        }, {});
    }, kamposs);
    const contextState = await stateHandle.jsonValue();

    // make sure we have one instance with a lost context
    t.is(contextState.canvas1, true);

    // attempt to set its source
    const kampos = await page.evaluateHandle((kamposs, video) => {
        const instance = kamposs[0];
        const width = video.videoWidth;
        const height = video.videoHeight;

        instance.setSource({media: video, type: 'video', width, height});

        return instance
    }, kamposs, source);

    const isLostHandle = await t.context.page.evaluateHandle(kampos => kampos.gl.isContextLost(), kampos);
    const isLost = await isLostHandle.jsonValue();

    t.is(isLost, false);

    t.context.kamposs = kamposs;
});
