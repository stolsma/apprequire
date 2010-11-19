module.declare(["test", "a"], function(require, exports, module) {
	var test = require('test');
	try {
		require('a');
		test.print('PASS dependency is available through a transport file', 'pass');
	} catch (exception) {
		test.print('FAIL dependency is available through a transport file', 'fail');
	}
	test.print('DONE', 'info');
});