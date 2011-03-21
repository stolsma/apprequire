/*-------------------------------------------------------------------------------------\
	Copyright (c) 2010-2011 Sander Tolsma/TTC
	All rights reserved.

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions
	are met:
	1. Redistributions of source code must retain the above copyright
	   notice, this list of conditions and the following disclaimer.
	2. Redistributions in binary form must reproduce the above copyright
	   notice, this list of conditions and the following disclaimer in the
	   documentation and/or other materials provided with the distribution.
	3. Neither the name of Sander Tolsma nor the names of its contributors
	   may be used to endorse or promote products derived from this software
	   without specific prior written permission.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND
	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
	ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
	FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
	DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
	OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
	HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
	LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
	OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
	SUCH DAMAGE.
\-------------------------------------------------------------------------------------*/
/**
 * Testing an implementation of the CommonJS Environment Framework (http://code.tolsma.net/blog/commonjs)
 * This is an implementation of the Bootstrap System
 *
 * Based on CommonJS (http://www.commonjs.org) specs, discussions on the Google Groups CommonJS lists 
 * (http://groups.google.com/group/commonjs), RequireJS 0.14.5 (James Burke, http://requirejs.org), 
 * FlyScript.js (copyright Kevin H. Smith, https://github.com/khs4473), BravoJS (copyright Wes Garland,
 * http://code.google.com/p/bravojs/), Pinf/Loader (copyright Christoph Dorn, https://github.com/pinf/loader-js)
 * and utility code of Ext Core / ExtJS 3.2.1. (copyright Sencha, http://www.sencha.com)
 *
 * For documentation how to use this: http://code.tolsma.net/apprequire
 */

/**
 * Bootstrap System definition
 */
// define require and exports
var require, exports;
// Check for an existing version of an exports object. If that does not exists then define a new exports reference.
if (typeof exports === "undefined")
	exports = {};

// create the api namespace if not already available
if (typeof exports.api === "undefined")
	exports.api = {};

// define the Bootstrap System API
exports.api.boot = function(window, commonjs){
	var UNDEF,													// undefined constant for comparison functions
		API = { test: 'test'};
	
	/********************************************************************************************
	* Utility functions																			*
	********************************************************************************************/
	/**
	 * Simple function to mix in properties from source into target,
	 * but only if target does not already have a property of the same name.
	 * @param {object} target
	 * @param {object} source
	 * @param {bool} force (optional) Force addition from source to target
	 */
	function mixin(target, source, force) {
		for (var prop in source) {
			if (!(prop in target) || force) {
				target[prop] = source[prop];
			}
		}
	}
	
	/**
	 * Cut the last term from a URI string
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Path without last term
	 */
	function cutLastTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(0, uri.length-1);
		return uri.join("/"); 
	}
	
	/**
	 * Get the last term from a URI string and return it
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Last term
	 */
	function getLastTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(uri.length-1);
		return uri[0];
	}
	
	/********************************************************************************************
	* Bootstrap functions																		*
	********************************************************************************************/
	function getSystemInfo(document, baseUrlMatch){
		var scriptList,	script,	src, i, main,
			result = {main: '', location: ''};

		// Get list of all <script> tags to check
		scriptList = document.getElementsByTagName("script");
		//Figure out if there is a 'data-main' attribute value. Get it from the script tag with cfg.baseUrlMatch as regexp.
		for (i = scriptList.length - 1; i > -1 && (script = scriptList[i]); i--) {
			//Using .src instead of getAttribute to get an absolute URL.
			src = script.src;
			if (src) {
				if (src.match(baseUrlMatch)) {
					//Look for a data-main attribute to set main script for the page to load.
					main = script.getAttribute('data-main');
					break;
				}
			}
		}
		if (main){
			if (main.charAt(main.length) === '/') {
				result.location = main;
			} else {
				result.location = cutLastTerm(main);
				result.main = getLastTerm(main);
			}
		}
		return result;
	}

	function setupConfig(api) {
		var	defaultcfg = {
				mainFunction: null,
				deps: [],
				directories: {
					lib: './lib'
				},
				debug: true,
				waitSeconds: 6000,
				baseUrlMatch: /apprequire\.js/i
			},
			cfg = {};
		
		// get given cfg if it exists
		if (api.cfg !== UNDEF)
			mixin(cfg, api.cfg);
		// mix defaultcfg with cfg
		mixin(cfg, defaultcfg);
		// put result back
		api.cfg = cfg;
				
		// check if window is defined else throw
		if (window === UNDEF) 
			throw new Error("Invalid environment in bootstrap! ");
			
		// then get possible script attribute configuration option for main and location
		if (window.document !== UNDEF) 
			mixin(cfg, getSystemInfo(window.document, cfg.baseUrlMatch));
		else // set default empty values for main and location
			mixin(cfg, {
				main: '',
				location: ''
			});
	
		// cfg has preference over datamain over location.href
		if (cfg.location == '')
			cfg.location = cutLastTerm(window.location.href);
		
		// give debug environment
		if (api.debug === UNDEF) 
			api.debug = {};
			
		// and return config
		return cfg;
	}
	
	function startupCMS(api){
		// give cms instance
		var cms = api.debug.cms = api.cms({}, api.cfg.debug);
		
		// create extra module environment require
		window.require = cms.require;
		window.require.memoize = cms.memoize;
		window.require.isMemoized = cms.isMemoized;
	}
	
	function boot(api, commonjs){
		// make the config
		setupConfig(api);
		
		// first see if a context system is available, if so start it with giving it the api
		if (api.context !== UNDEF) {
			// startup with context, package and module system
		} else if (api.package !== UNDEF) {
			// startup with package and module system
		} else if (api.cms !== UNDEF) {
			// startup with module system only
			startupCMS(api);
		} else 
			throw new Error("BOOT: No main CommonJS layer (context, package or core module) defined in the API to start with!");
			
		// return myself for later use
		return boot;
	}
	
	/********************************************************************************************
	* Bootstrap code																			*
	********************************************************************************************/
	// TODO
	// Build exports.api with all modules when in commonjs environment
	
	
	// return the Bootstrap System API
	return boot(exports.api, commonjs);
};

/********************************************************************************************
* Bootstrap in the correct way depending on the environment									*
********************************************************************************************/
// Check if in a CommonJS Module Environment
if (typeof require !== "undefined") {
	// call bootstrap with a provisioned window scope because we are in a CommonJS Module Environment
	exports.api.boot = exports.api.boot({
		location: {
			protocol: "memory:",
			href: "memory:/" + "/apprequire/"
		}
	}, true);
} else {
	// other environment, probably browser (CommonJS Extra Module Environment)
	exports.api.boot = exports.api.boot(window, false);
}
