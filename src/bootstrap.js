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
// define require, exports, module and window
var require, exports, module, window;

// define the Bootstrap System as a self starting function closure
(function(env) {
	var UNDEF,													// undefined constant for comparison functions
		contextList = [],
		
		// default context config
		defaultcfg = {
			directories: {
				lib: './lib'
			},
			commonjsAPI: {},
			modules: {},
			debug: true,
			timeout: 6000,
			baseUrlMatch: /apprequire/i
		},
					
		// default commonjs API:
		commonjsAPI = {
			contextPlugins: [
				"genericPackage"
			],
			loader: "scriptLoader",
			loaderPlugins: [
				"moduleTransport"
			],
			systemModules: [
				"system"
			]
		},
		system,
		CMLCreate;
		
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
	* Specific Browser Bootstrap code															*
	********************************************************************************************/
	/**
	 * Get specific first context configuration from the script element
	 * @param {document} document Reference to window.document in a browser environment.
	 * @param {string} baseUrlMatch RegExp definition to find this scriptfile.
	 * @return {object} Object with defined context configuration parsed from the scripts context attribute
	 */
	function getContextConfig(document, baseUrlMatch){
		var scriptList,	script,	src, i, result;

		// Get list of all <script> tags to check
		scriptList = document.getElementsByTagName("script");
		//Figure out if there is a 'context' attribute value. Get it from the script tag with cfg.baseUrlMatch as regexp.
		for (i = scriptList.length - 1; i > -1 && (script = scriptList[i]); i--) {
			//Using .src instead of getAttribute to get an absolute URL.
			src = script.src;
			if (src) {
				if (src.match(baseUrlMatch)) {
					//Look for a context attribute to configure the first context.
					result = script.getAttribute('data-context');
					break;
				}
			}
		}
		
		// parse result if there is a result
		if (result){
			if (JSON)
				// Standaard JSON functions available? then use them
				result = JSON.parse(result);
			else
				// no JSON functions available then use RFC recommended eval
				result = !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(result.replace(/"(\\.|[^"\\])*"/g, ''))) && eval('(' + result + ')');
		}
		return result;
	}

	/**
	 * Checks if all the required CommonJS system API modules are loaded
	 * @param {object} api Object with the config.commonjsAPI information.
	 * @param {object} modules Object with the loaded CommonJS System modules.
	 * @return {bool} True when all required modules are loaded false if not
	 */
	function bootstrapReady(api, modules){
		for (var prop in api) {
			if (!(api[prop] in modules)) {
				// nope this system modules is not declared yet 
				return false;
			}
		}
		// all required system modules are loaded
		return true;
	}

	/**
	 * Handles CommonJS system API module adding to the environment, only available in bootstrap phase.
	 * Bootstrap phase is followed by Extra Module Environment Phase (EME Phase). Changeover to EME phase is 
	 * accomplished when all modules defined in CommonjsAPI are 'loaded' via module.declare   
	 * @param {array} dep Object with the modules dependency list.
	 * @param {function} factoryFn Function to define the exports of this module.
	 * @param {object} contextCfg Object with the configuration for the context to create.
	 */
	function addModule(id, dep, factoryFn, contextCfg){
		var modules = contextCfg.modules,
			commonjsAPI = contextCfg.commonjsAPI,
			context;
		
		if ((typeof id == 'string') && (id !== UNDEF)) {
			// save this api information
			modules[id] = {
				dep: dep,
				factoryFn: factoryFn
			};
			// check if all modules are now loaded. If true then startup first context
			if (bootstrapReady(commonjsAPI, modules)){
				// delete declare because only in use for bootstrap...
				delete contextCfg.env.module.declare;

				// if context API exists then create context with current cfg, and the System Module list. If something goes wrong then throw error
				if (!CMLCreate || !(context = CMLCreate(contextCfg))) throw new Error("No correct CommonJS Module API declaration!!");
				// save context for later use ??
				contextList.push(context);
			}
		} else {
		// non CommonJS system API module is declared, throw error
			throw new Error("Invalid bootstrap module declaration!!");
		}
	}
	
	function bootExtraModuleEnvironment(contextCfg){
		contextCfg.modules.execute = function(id){
			var exports = {};
			// if this module exists then execute factoryFn
			if (this[id]) {
				mixin(exports, this[id].factoryFn.call(null, null, exports, null));
				return exports;
			} else 
				throw new Error('(bootstrap.modules.execute) Module for given id doesnt exists!');
			// return nothing
			return UNDEF;
		};
		contextCfg.env.module = {
			declare: function(id, deb, factoryFn){
				addModule(id, deb, factoryFn, contextCfg);
			},
			class: function(clsCfg){
				system = clsCfg.system;
				CMLCreate = clsCfg.create;
			}
		};
	}
	
	/********************************************************************************************
	* First boot code																			*
	********************************************************************************************/
	
	function setupConfig(env, cfg){
		// check if environment is defined else throw
		if (env === UNDEF) 
			throw new Error("Invalid environment in setupConfig bootstrap! ");
			
		// mix defaultcfg with cfg
		mixin(cfg, defaultcfg);
				
		// then get possible script attribute configuration option if in browser env. Those have preference!!!
		if (env.document !== UNDEF) 
			mixin(cfg, getContextConfig(env.document, cfg.baseUrlMatch), true);
		
		// create location propertie if not already defined	
		mixin(cfg, {
			location: ''
		});
	
		// previous configuration has preference over environment location.href
		if (cfg.location == '')
			cfg.location = cutLastTerm(env.location.href);
		
		// mixin not defined framework standard CommonJS Framework Systems
		mixin(cfg.commonjsAPI, commonjsAPI);
		
		// and return config
		return cfg;
	}
	
	/********************************************************************************************
	* Bootstrap startup																			*
	********************************************************************************************/
	/**
	 * Boot the whole commonjs extr amodule environment depending on given options. 
	 * @param {object} env Description of the current environment
	 */
	bootExtraModuleEnvironment(setupConfig(env, {env: env}));
	
	// end of selfstarting bootstrap closure
})(window);
