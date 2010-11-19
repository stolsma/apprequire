define(["test", "a"], function(require, exports, module){
	var test = require('test');
	try {
		require('a');
		test.print('FAIL require throws error when module is not declared', 'fail');
	} catch (exception) {
		test.print('PASS require throws error when module is not declared', 'pass');
	}
	test.print('DONE', 'info');
});