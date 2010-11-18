define(["test","bogus"], function(require, exports, module) {
	var test = require('test');
	try {
		require('bogus');
		test.assert(false, 'require throws error when module missing');
	} catch (exception) {
		test.assert(true, 'require throws error when module missing');
	}
	test.print('DONE', 'info');
});
 