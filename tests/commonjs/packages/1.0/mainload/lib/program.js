define(["test", "pack1"], function(require, exports, module) {
	var test = require('test');
	
	try {
		require('pack1');
		test.print('FAIL require throws error when main module of package1 missing', 'fail');
	} catch (exception) {
		console.log(exception);
		test.print('PASS require throws error when main module of package1 missing', 'pass');
	}
	test.print('DONE', 'info');
});
