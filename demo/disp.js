import {Ticker} from '../src/kampos';
import Transition from './transition';

const video = document.querySelector('#video');
const video2 = document.querySelector('#video2');
const target = document.querySelector('#target');

const video3 = document.querySelector('#video3');
const video4 = document.querySelector('#video4');
const target2 = document.querySelector('#target2');

const video5 = document.querySelector('#video5');
const video6 = document.querySelector('#video6');
const target3 = document.querySelector('#target3');

const video7 = document.querySelector('#video7');
const video8 = document.querySelector('#video8');
const target4 = document.querySelector('#target4');

const ticker = new Ticker();

const trans1 = new Transition({
    vid1: video,
    vid2: video2,
    target: target,
    ticker,
    disp: 'disp-tri.jpg',
    dispScale: 0.3
});

const trans2 = new Transition({
    vid1: video3,
    vid2: video4,
    target: target2,
    ticker,
    disp: 'disp-snow.jpg',
    dispScale: 1.0
});

const trans3 = new Transition({
    vid1: video5,
    vid2: video6,
    target: target3,
    ticker,
    disp: 'disp-cloud.png',
    dispScale: 0.2
});

const trans4 = new Transition({
    vid1: video7,
    vid2: video8,
    target: target4,
    ticker,
    disp: 'disp-liquid.jpg',
    dispScale: 0.35
});

Promise.all([trans1.ready, trans2.ready, trans3.ready, trans4.ready])
    .then(() => {
        ticker.start();
    });
