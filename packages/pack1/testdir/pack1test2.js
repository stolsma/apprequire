//my/shirt.js now does setup work
//before returning its module definition.
define(['require', 'exports', 'module', './pack1test4'], function (requireArg, exportsArg, moduleArg, pack1test4) {
    //Do setup work here

    return {
		pack1test4: pack1test4,
		modname: 'pack1test2',
		require: requireArg,
		exports: exportsArg,
		module: moduleArg
    }
});