var JS2 = require('./dist/js2.js');

JS2.start(function onReady(err) {

	JS2.setTitle('JS2');
});

process.on('uncaughtException', function onError(error) {
	JS2.debug('Found error...');
	JS2.debug(error);
});
