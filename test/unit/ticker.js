import test from 'ava';
import { Kampos, Ticker } from '../../src/index.js';
import {createCanvas, Image} from 'node-canvas-webgl';

test.skip('Ticker :: #start :: should start animation loop and call draw', t => {
    t.plan(1);

    const instance = new Ticker();
    const originalDraw = instance.draw;
    let calledTimes = 0;

    instance.draw = function () {
        calledTimes += 1;
        originalDraw.call(instance);
    };

    instance.start();

    window.requestAnimationFrame(() => {
        t.true(calledTimes === 1);
        instance.stop();
    });
});
//
//     describe('#stop', function () {
//         it('should stop a started animation loop', function (done) {
//             const instance = new Ticker();
//             const originalDraw = instance.draw;
//             let calledTimes = 0;
//
//             instance.draw = function () {
//                 calledTimes += 1;
//                 originalDraw.call(instance);
//             };
//
//             instance.start();
//
//             window.requestAnimationFrame(() => {
//                 assert(calledTimes === 1);
//
//                 instance.stop();
//
//                 window.requestAnimationFrame(() => {
//                     assert(calledTimes === 1);
//
//                     done();
//                 })
//             });
//         });
//     });
//
//     describe('#draw', function () {
//         it('should call draw on each instance in the pool', function (done) {
//             const instance = new Ticker();
//             const canvas = document.createElement('canvas');
//             const kampos1 = new Kampos({target: canvas, ticker: instance, effects: []});
//             const kampos2 = new Kampos({target: canvas, ticker: instance, effects: []});
//
//             let calledKampos1Times = 0;
//             let calledKampos2Times = 0;
//
//             kampos1.draw = function () {
//                 calledKampos1Times += 1;
//             };
//             kampos2.draw = function () {
//                 calledKampos2Times += 1;
//             };
//
//             instance.start();
//
//             window.requestAnimationFrame(() => {
//                 assert(calledKampos1Times === 1);
//                 assert(calledKampos2Times === 1);
//
//                 instance.stop();
//                 done();
//             });
//         });
//     });
//
//     describe('#add', function () {
//         it('should add an instance to the pool', function (done) {
//             const instance = new Ticker();
//             const canvas = document.createElement('canvas');
//             const kampos1 = new Kampos({target: canvas, effects: []});
//             const kampos2 = new Kampos({target: canvas, effects: []});
//
//             let calledKampos1Times = 0;
//             let calledKampos2Times = 0;
//
//             kampos1.draw = function () {
//                 calledKampos1Times += 1;
//             };
//             kampos2.draw = function () {
//                 calledKampos2Times += 1;
//             };
//
//             instance.start();
//
//             window.requestAnimationFrame(() => {
//                 assert(calledKampos1Times === 0);
//                 assert(calledKampos2Times === 0);
//
//                 instance.add(kampos1);
//                 instance.add(kampos2);
//
//                 window.requestAnimationFrame(() => {
//                     assert(calledKampos1Times === 1);
//                     assert(calledKampos2Times === 1);
//
//                     instance.stop();
//                     done();
//                 })
//             });
//         });
//     });
//
//     describe('#remove', function () {
//         it('should remove an instance from the pool', function (done) {
//             const instance = new Ticker();
//             const canvas = document.createElement('canvas');
//             const kampos1 = new Kampos({target: canvas, effects: []});
//             const kampos2 = new Kampos({target: canvas, effects: []});
//
//             let calledKampos1Times = 0;
//             let calledKampos2Times = 0;
//
//             kampos1.draw = function () {
//                 calledKampos1Times += 1;
//             };
//             kampos2.draw = function () {
//                 calledKampos2Times += 1;
//             };
//
//             instance.start();
//
//             window.requestAnimationFrame(() => {
//                 assert(calledKampos1Times === 0);
//                 assert(calledKampos2Times === 0);
//
//                 instance.add(kampos1);
//                 instance.add(kampos2);
//
//                 window.requestAnimationFrame(() => {
//                     assert(calledKampos1Times === 1);
//                     assert(calledKampos2Times === 1);
//
//                     instance.remove(kampos1);
//
//                     window.requestAnimationFrame(() => {
//                         assert(calledKampos1Times === 1);
//                         assert(calledKampos2Times === 2);
//
//                         instance.stop();
//                         done();
//                     });
//                 })
//             });
//         });
//     });
// });
