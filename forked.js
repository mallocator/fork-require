let file = process.argv[2];
process.title = process.argv[3];
process.argv.splice(1, 1);
process.argv.splice(2, 1);


try {
    let forkedModule = require(file);
    process.on('message', async message => {
        try {
            if (message.prop) {
                if (!forkedModule[message.prop]) {
                    return process.send({error: 'TypeError: ' + message.prop + ' is not a function', stack: ''})
                }
                let response = await forkedModule[message.prop](...message.args);
                process.send({response});
            } else {
                let response = await forkedModule(...message.args);
                process.send({response});
            }
        } catch(err) {
            process.send({error: err.message, stack: err.stack});
        }
    });
} catch (err) {
    process.send({error: err.message, stack: err.stack, failed: true});
}

// Watch parent exit when it dies
process.stdout.resume();
process.stdout.on('end', () => process.exit());
