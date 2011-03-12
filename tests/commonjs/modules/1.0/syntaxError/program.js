module.declare(["test", "a"], function(require, exports, module) {
	var test = require('test');
	try {
		require('a');
		test.print('FAIL require throws error when module contains a syntax error', 'fail');
	} catch (exception) {
		test.print('PASS require throws error when module contains a syntax error', 'pass');
	}
	test.print('DONE', 'info');
});