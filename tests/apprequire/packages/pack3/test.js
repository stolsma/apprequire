/**
 * This module is in normal circumstances not loaded !! If it is then the package.json path config is not working !!
 */

define(function (require, exports, module) {
    //Do setup work here
	exports.test = 'This is the test module from package/pack3/test.js so this must be wrongly loaded!!!';
});