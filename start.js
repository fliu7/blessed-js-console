const jsConsole = require('./index.js');

jsConsole.start(Object.create(global), null, "help text goes here");

process.on('uncaughtException', function onError(error) {
    jsConsole.debug(error);
});

/**
 * Example: 
 *
 * Use a custom evaluate function and run script inside a fiber.
 * This simulates Luna server environment. 
 */
/*
var Fiber = require('fibers');
var vm = require('vm');

function initEnv() {
    global.foo = 'bar';
}

function runInFiber(fn) {
    return new Promise(function(resolve, reject) {
        Fiber(function() {
            try {
                const result = fn();
                resolve(result);
            } catch (err) {
                reject(err);
            }
        }).run();
    });
}

runInFiber(function() {
    initEnv();
    return vm.createContext(Object.create(global));
}).then(function(vmContext) {

    js2.start(vmContext, function evaluate(code) {
        return runInFiber(function() {
            const script = new vm.Script(code,  { filename: 'console-code' });
            return script.runInContext(vmContext);
        });
    });
});
*/
