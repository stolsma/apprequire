module.declare(["test", "a"], function(require, exports, module) {
	var test = require('test');
	var a = require("a");
	var b = require("b");
	
	test.assert(a.message === b.message, 'exceptions do not block loading');
	test.print('DONE', 'info');
});