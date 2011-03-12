module.declare("a", ["./b"], function(require, exports, module) {
	exports.foo = "bar";
});

module.declare("b", function(require, exports, module) {
});
