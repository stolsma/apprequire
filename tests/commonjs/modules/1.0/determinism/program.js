module.declare(["test","submodule/a"], function(require, exports, module) {
	var test = require('test');
	require('submodule/a');
	test.print('DONE', 'info');
});
