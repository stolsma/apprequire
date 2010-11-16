define(["a", "../a"], function (require, exports, module) {
	exports.test = 'a module from pack1';
	exports.testPackAGlobal = require('a').test;
	exports.testLibARelative = require('../a').test;
	exports.mainModule = function() {
		return require(require.main.id);
	};
});