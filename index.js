const cp = require('child_process');
const path = require('path');
const util = require('util');

function getProcessArgs() {
    let args = process.argv.slice();
    args.splice(0, 2);
    return args;
}

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
                child.send({args});
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
                    child.send({prop, args});
                })
            }
        }
    });
    proxy._childProcess = child;
    return proxy;
};
