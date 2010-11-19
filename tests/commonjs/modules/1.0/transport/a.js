define("a", ["./b"], function(require, exports, module) {
	exports.foo = "bar";
});

define("b", function(require, exports, module) {
});
