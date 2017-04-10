/* global describe, it, before, after, beforeEach, afterEach */
const fork = require('..');
const expect = require('chai').expect;

describe('fork', () => {
    it('should fork the given file', async () => {
        let testModule = fork('./testmodule');
        expect(await testModule.method()).to.equal('this is a test function');
        expect(await testModule()).to.equal('This is a "constructor"');
    });

    it('should throw errors from the original stack location', async () => {
        let caught = false;
        try {
            let testModule = fork('./testmodule');
            await testModule.error();
        } catch (err) {
            caught = true;
        }
        expect(caught).to.be.true;
    });

    it('should throw an error if the file doesn\'t exist', done => {
        process.prependOnceListener('uncaughtException', () => done());
        fork('./nothing');
    });
});