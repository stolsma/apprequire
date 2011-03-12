module.declare(['test', 'a', 'b', 'c'], function(require, exports, module){
	var test = require('test');
	try {
		var a = require('a');
		test.assert(a.test === 'a', 'PASS implicit dependency with single quotes loaded');
	} catch (exception) {
		test.print('FAIL implicit dependency with single quotes loaded', 'fail');
	}
	try {
		var b = require("b");
		test.assert(b.test === 'b', 'PASS implicit dependency with double quotes loaded');
	} catch (exception) {
		test.print('FAIL implicit dependency with double quotes loaded', 'fail');
	}
	try {
		var c = require('\c');
		test.assert(c.test === 'c', 'PASS implicit dependency with escaped string loaded');
	} catch (exception) {
		test.print('FAIL implicit dependency with escaped string loaded', 'fail');
	}
	test.print('DONE', 'info');
});