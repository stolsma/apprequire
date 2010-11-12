/** 
 * pack1.js now does setup work
 * Two modules are defined. For the first one the '/test' id is used
 *
 */
define(['require', 'exports', 'module', './testdir/pack1test2'], function (requireArg, exportsArg, moduleArg, pack1test2, pack1test3) {
    //Do setup work here
	
    return {
		pack1test2: pack1test2,
		pack1test3: pack1test3,
		require: requireArg,
		exports: exportsArg,
		module: moduleArg
    }
});

/**
 * define can be used to 'define' new modules in the same .js file. Because the require code is calling the available module init functions 
 * in required order after the whole .js file is loaded, module defines can be placed everywhere in the .js file!!!
 *
 * Following module is defined with explicit id name 'pack1/test3'
 */

define('packk1test3', ['require', 'exports', 'module'], function (requireArg, exportsArg, moduleArg) {
    //Do setup work here

    return {
		modname: 'pack1/test3',
		require: requireArg,
		exports: exportsArg,
		module: moduleArg
    }
});