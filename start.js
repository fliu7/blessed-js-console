const jsConsole = require('./index.js');

jsConsole.start(Object.create(global));

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
function init() {
    global.foo = 'bar';
}

let vmFiber;
let vmContext;
Fiber(function() {
    init();
    vmContext = Object.create(globalThis);
    vmFiber = Fiber.current;
    Fiber.yield();

    var vm = require('vm');
    while (vmFiber.code) {
        const script = new vm.Script(vmFiber.code,  { filename: 'evaluate.vm' });
        const result = script.runInThisContext();
        vmFiber.code = null;
        Fiber.yield(result);
    }
}).run();

jsConsole.start(vmContext, function evaluate(code) {
    vmFiber.code = code;
    return vmFiber.run();
});
*/
