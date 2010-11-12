//my/shirt.js now does setup work
//before returning its module definition.
define(['./test4'], function (require, exports, module) {
    //Do setup work here

    return {
		test4: require('./test4'),
		modname: 'main module testdir/test2',
		require: require,
		exports: exports,
		module: module
    }
});