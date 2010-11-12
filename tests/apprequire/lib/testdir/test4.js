//my/shirt.js now does setup work
//before returning its module definition.
define(['testdir/test5'], function (require, exports, module) {
    //Do setup work here

    return {
		test5: require('./test5'),
		modname: 'main module testdir/test4',
		require: require,
		exports: exports,
		module: module
    }
});

define('testdir/test5', function (require, exports, module) {
    //Do setup work here

    return {
		modname: 'main module testdir/test5',
		require: require,
		exports: exports,
		module: module
    }
});