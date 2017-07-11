/* global describe, it, beforeEach, afterEach */

const fork = require('../../');
const same = require('./child');
const other = fork('./child');
const payload = require('./payload');
const NS_PER_SEC = 1e9;
const ITERATIONS = 10000;

describe.skip("Performance Tests", () => {
    let timer;
    beforeEach(() => {
        timer = process.hrtime();
    });
    afterEach(() => {
        const diff = process.hrtime(timer);
        const ns = diff[0] * NS_PER_SEC + diff[1];
        console.log(`Benchmark took ${ns} nanoseconds (${ns / ITERATIONS} per iteration)`);
    });

    describe('primitives', () => {
        it('test same process', () => {
            for (let i = 0; i < ITERATIONS; i++) {
                same.test(1);
            }
        });

        it('test forked process', async () => {
            for (let i = 0; i < ITERATIONS; i++) {
                await other.test(1);
            }
        });
    });

    describe('objects', () => {
        it('test same process', () => {
            for (let i = 0; i < ITERATIONS; i++) {
                same.test({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10});
            }
        });

        it('test forked process', async () => {
            for (let i = 0; i < ITERATIONS; i++) {
                await other.test({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10});
            }
        });
    });

    describe('payload', () => {
        it('test same process', () => {
            // faster than primitives because objects are passed by reference
            for (let i = 0; i < ITERATIONS; i++) {
                same.test(payload);
            }
        });

        it('test forked process', async () => {
            // File size of payload is 19KB
            for (let i = 0; i < ITERATIONS; i++) {
                await other.test(payload);
            }
        }).timeout(10000);
    });
});
