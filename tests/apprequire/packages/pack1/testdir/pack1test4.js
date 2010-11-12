//my/shirt.js now does setup work
//before returning its module definition.
define(['require', 'exports', 'module', 'testdir/pack1test5'], function (requireArg, exportsArg, moduleArg, pack1test5) {
    //Do setup work here

    return {
		pack1test5: pack1test5,
		modname: 'pack1test4',
		require: requireArg,
		exports: exportsArg,
		module: moduleArg
    }
});

define('testdir/pack1test5', ['require', 'exports', 'module'], function (requireArg, exportsArg, moduleArg) {
    //Do setup work here

    return {
		modname: 'pack1test5',
		require: requireArg,
		exports: exportsArg,
		module: moduleArg
    }
});