define(["system"], function(require, exports, module) {

exports.print = function () {
    var system = require("system");
    var stdio = system.stdio;
//    stdio.print.apply(stdio, arguments);
//	console.log(arguments);
//	stdio.print( Array.prototype.slice.call(arguments) );
	console.log(arguments[0], arguments[1] );
};

exports.assert = function (guard, message) {
    if (guard) {
        console.log('PASS ' + message);
    } else {
        console.error('FAIL ' + message);
    }
};


});
