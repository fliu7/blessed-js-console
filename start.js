var JsConsole = require('./index.js');

JsConsole.start(function onReady(err) {

	JsConsole.setTitle('JsConsole');
});

process.on('uncaughtException', function onError(error) {
	JsConsole.debug('Found error...');
	JsConsole.debug(error);
});
