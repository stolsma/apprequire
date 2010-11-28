define(["a", "root/a"], function (require, exports, module) {
	exports.test = 'a module from pack1';
	exports.testPackAGlobal = require('a').test;
	exports.testLibARelative = require('root/a').test;
	var require = require;
	exports.mainModule = function() {
		return require(require.main.id);
	};
});