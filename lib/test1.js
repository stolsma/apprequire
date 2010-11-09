/** 
 * test.js now does setup work
 * Two modules are defined. For the first one the '/test' id is used
 *
 */
define(['./testdir/test2', 'test3'], function (require, exports, module) {
    //Do setup work here
	
    return {
		test2: require('./testdir/test2'),
		test3: require('./test3'),
		modname: 'main module test',
		require: require,
		exports: exports,
		module: module
    }
});

/**
 * define can be used to 'define' new modules in the same .js file. Because the require code is calling the available module init functions 
 * in required order after the whole .js file is loaded, module defines can be placed everywhere in the .js file!!!
 *
 * Following module is defined with explicit id name '/test3'
 */

define('test3', function (require, exports, module) {
    //Do setup work here

    return {
		modname: 'main module test3',
		require: require,
		exports: exports,
		module: module
    }
});