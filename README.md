# fork-require
Allows to "require" a file, while forking it into a child process.

[![npm version](https://badge.fury.io/js/fork-require.svg)](http://badge.fury.io/js/fork-require)
[![Build Status](https://travis-ci.org/mallocator/fork-require.svg?branch=master)](https://travis-ci.org/mallocator/fork-require)
[![Coverage Status](https://coveralls.io/repos/mallocator/fork-require/badge.svg?branch=master&service=github)](https://coveralls.io/github/mallocator/fork-require?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/fork-require.svg)](https://david-dm.org/mallocator/fork-require)


## About

This nifty little library makes spawning processes and interacting with them super easy. It will automatically
fork any file you give it and proxy all method calls to the forked child process. All responses are returned
via Promises and make it really easy to read with the async/await syntax.


## Example

An example might make it easier to understand. This will fork a new module and allow you to call any method on it.

```Javascript
const fork = require('fork-require');

let otherModule = fork('./otherModule');

let response = await otherModule.doSomething('Hello');
// => will print "Hello World" in a separate process.
```


The file you want to fork-require would look like this:

```Javascript
/*** otherModule.js ***/

exports.doSomething = function(val) {
    console.log(val, 'World');
}
```


## Installation

In your npm project directory run

```
npm i --save fork-require
```


## API

There's only one method call available:

### fork( file, \[options\] )

* file <string>
* options <object>
  * args <string[]> Allows you to set the arguments with which to spawn the process (Default: process.args)
  * env <object> Allows you to set the environment properties with which to spawn the process (Default: process.env)
  * cwd <string> Allows you to set the current working directory in which to spawn the process (Default: process.cwd())
  * execArgv <string[]> Allows you to set the executable (most likely node) arguments with which to spawn the process (Default: process.execArgv)
  * execPath <string> Allows you to set the path to the executable with which to spawn the process (Default: process.execPath)
  * fixStack <boolean> Allows you to see the original stack trace on errors instead of the adapted ones(Default: true)


## Caveats

There is no support for properties on target modules, so if you're trying to access those that won't work.
Also you need to handle the response via Promises. If you don't use await/then() you will not get results, so don't forget.

Additionally don't forget that you are invoking inter process communication here which is much slower than directly calling
a method in a module (simple performance test shows a difference of factor 150-200). While the overhead might be negligible
in most cases it will have an impact on high frequency interactions (overhead is about 0.00005ms per call for small payloads
and will go up for larger payloads).


## Tests

To run the tests you must install the development dependencies along with the production dependencies

	npm install fork-require

After that you can just run ```npm test``` to see an output of all existing tests.


## Bugs and Feature Requests

I try to find all the bugs and have tests to cover all cases, but since I'm working on this project alone, it's easy to miss something.
Also I'm trying to think of new features to implement, but most of the time I add new features because someone asked me for it.
So please report any bugs or feature request to mallox@pyxzl.net or file an issue directly on [Github](https://github.com/mallocator/fork-require/issues).
Thanks!
