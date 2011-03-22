module.declare(["b"], function(require, exports, module) {
	exports.foo = function () {
		return require('b');
	};
});
