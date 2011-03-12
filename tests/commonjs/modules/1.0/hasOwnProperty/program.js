module.declare(["hasOwnProperty","toString","test"], function(require, exports, module) {
	var modulehasOwnProperty = require('hasOwnProperty');
	var moduletoString = require('toString');
	var test = require('test');
	
	test.assert(modulehasOwnProperty.test == 'hasOwnProperty', 'hasOwnProperty module loaded correctly');
	test.assert(moduletoString.test == 'toString', 'toString module loaded correctly');
	test.print('DONE', 'info');
});
