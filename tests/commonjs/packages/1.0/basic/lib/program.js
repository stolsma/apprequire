define(["test", "pack1", "pack1/a"], function(require, exports, module) {
	var test = require('test');
	var pack1 = require('pack1');
	var pack1A = require('pack1/a');
	
	exports.test = "main module";
	
	test.assert(pack1.test === 'Main module for package pack1', 'require from global system works with absolute identifiers');
	test.assert(pack1A.test === 'a module from pack1', 'require a from pack1 works with absolute identifiers');
	test.assert(pack1A.testPackAGlobal === 'a module from pack1', 'require a from pack1/a works with absolute identifiers (returns pack1/a)');
	test.assert(pack1A.testLibARelative === 'a module from lib', 'require a from global system from pack1/a works with absolute identifiers(returns lib/a)');

	// test if a module in a package can require the main root module
	var mainMod = pack1A.mainModule();
	test.assert(mainMod.test === 'main module', 'require main module from pack1/a works (returns program)');
	test.print('DONE', 'info');
});
