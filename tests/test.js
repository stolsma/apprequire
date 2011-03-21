define(["system"], function(require, exports, module) {
	var system = require("system");
	
	exports.print = function () {
		var stdio = system.stdio;
		stdio.print.apply(stdio, arguments);
	};
	
	exports.assert = function (guard, message) {
		if (guard) exports.print("PASS " + message, "pass");
		else exports.print("FAIL " + message, "fail");
	};
});
