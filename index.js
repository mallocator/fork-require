const cp = require('child_process');
const path = require('path');


let children = [];

/**
 * Returns the client arguments that should be passed on to the child process
 * (by removing automatic values form the start).
 * @returns {Array.<*>}
 */
function getProcessArgs() {
    let args = process.argv.slice();
    args.splice(0, 2);
    return args;
}

/**
 * Handles the response of a child and calls the right promise resolution if given
 * @param {ChildProcess} process    The child process on which to listen for the message
 * @param {function} [resolve]      The promise resolve function to call on success
 * @param {function} [reject]       The promise reject function to on failure
 * @param {Error} [source]          An error object that has the stack needed to fix the process stack
 */
function handleResponse(process, resolve, reject, source)  {
    process.once('message', message => {
        if (message.error && !message.failed) {
            let error = new Error(message.error);
            error.stack = fixStack(message.stack, source);
            if (reject) {
                reject(error);
            } else {
                throw error;
            }
        }
        if (resolve && message.response) {
            resolve(message.response);
        }
    });
}

/**
 * Cleans up the stack that was thrown from the internal process. Instead it will simply replace the part
 * of the stack that was caught in the process and replace it with the part of the stack that was called
 * in the parent function.
 * @param {string} stack
 * @param {string} source
 * @returns {string}
 */
function fixStack(stack, source) {
    if (!stack) {
        return;
    }
    if (!source) {
        return stack;
    }
    let myStack = source.stack;
    let tail = myStack.substr(myStack.indexOf('\n', myStack.indexOf('\n') + 1));
    let head = stack.substr(0, stack.substr(0, stack.indexOf('forked.js')).lastIndexOf('\n'));
    return head + tail;
}

/**
 * Will try up to 3 times to send a message to the given process.
 * @param {ChildProcess} process    The process to send the message to
 * @param {object} message          The message to send
 * @param {number} [retries=0]      Automatically set when retrying
 */
function send(process, message, retries = 0) {
    try {
        process.send(message)
    } catch (err) {
        if (retries < 3) {
            return setImmediate(() => send(process, message, ++retries));
        }
        throw err;
    }
}

/**
 * The "fork" function that is made available externally. This is the only API entry point so far.
 * @param {string} file         The relative or absolute file path to load.
 * @param {object} [options]    A set of options that will determine how the child process is forked.
 * @returns {Proxy<Module>}     The proxy module that will forward all calls to the child process module
 */
module.exports = (file, options = {
    args: getProcessArgs(),
    env: process.env,
    cwd: process.cwd(),
    execArgv: process.execArgv,
    execPath: process.execPath,
    fixStack: true
}) => {
    let orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    let stack = new Error().stack;
    Error.prepareStackTrace = orig;
    let calleePath = path.dirname(stack[1].getFileName());
    let filePath = path.isAbsolute(file) ? file : path.join(calleePath, file);
    options.args.unshift(filePath, options.title || 'fork-require.js file ' + filePath);

    let child = cp.fork(path.join(__dirname, 'forked.js'), options.args , {
        env: options.env,
        cwd: options.cwd,
        execArgv: options.execArgv,
        execPath: options.execPath
    });
    let source = new Error();
    child.once('message', message => {
        if (message.failed) {
            let error = new Error(message.error);
            error.stack = fixStack(message.stack, options.fixStack && source);
            throw error;
        }
    });

    let proxy = new Proxy(() => { this.process = process }, {
        apply: (_, __, args) => {
            let source = new Error();
            return new Promise((resolve, reject) => {
                handleResponse(child, resolve, reject, options.fixStack && source);
                send(child, {args});
            });
        },
        get: (obj, prop) => {
            if (obj[prop]) {
                return obj[prop];
            }
            let source = new Error();
            return function (...args) {
                return new Promise((resolve, reject) => {
                    handleResponse(child, resolve, reject, options.fixStack && source);
                    send(child, {prop, args});
                })
            }
        }
    });
    proxy._childProcess = child;
    children.push(child);
    return proxy;
};

process.on('exit', () => children.forEach(child => child.kill()));
