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
 * Code in this file is an example implementation of the CommonJS Core Module Layer
 *
 * Based on CommonJS (http://www.commonjs.org) specs, discussions on the Google Groups CommonJS lists 
 * (http://groups.google.com/group/commonjs), RequireJS 0.14.5 (James Burke, http://requirejs.org), 
 * FlyScript.js (copyright Kevin H. Smith, https://github.com/khs4473), BravoJS (copyright Wes Garland,
 * http://code.google.com/p/bravojs/), Pinf/Loader (copyright Christoph Dorn, https://github.com/pinf/loader-js)
 * and utility code (mixin function) of Ext Core (copyright Sencha, http://www.sencha.com)
 *
 * For documentation how to use this: http://code.tolsma.net/apprequire
 */
 
/**
 * Core Module Layer definition
 */
// Check for an existing version of an exports object. If that does not exists then define a new exports reference.
var exports;
if (typeof exports === "undefined")
	exports = {};

// create the api namespace if not already available
if (typeof exports.api === "undefined")
	exports.api = {};

// define the Core Module Layer API
exports.api.cms = function(){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		
		//The following are module state constants
		INIT = 'INIT',
		READY = 'READY';
		
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
	
	/********************************************************************************************
	* Core Module System Module Store implemented as Class										*
	********************************************************************************************/
	function Store() {
		this.modules = {};								// initialize module store
	}
	
	Store.prototype = {
		/*******************************************************************************\
		*	modules store functions														*
		\*******************************************************************************/	
		/**
		 * Get the requested module
		 * @param {string} id The fully resolved id of the module to return.
		 * @return {Module} Requested module or undef if not there
		 */
		getModule: function(id) {
			// prepend with constant to circumvent standard Object properties
			return this.modules[objEscStr + id];
		},
		
		/**
		 * Set the requested module in the modules list
		 * @param {string} id The fully resolved id of the module to save.
		 * @param {Module} value The module.
		 * @return {Module} The set module
		 */
		setModule: function(id, value) {
			// prepend with constant to circumvent standard Object properties
			return this.modules[objEscStr + id] = value;
		},
		
		/**
		 * Check if the requested module already exists in the modules list
		 * @param {string} id The fully resolved id of the module to save.
		 * @return {bool} True when module exists, false if not
		 */
		existModule: function(id) {
			return (this.modules[objEscStr + id] !== UNDEF);
		}
	}
	
	/********************************************************************************************
	* Core Module System implemented as Class													*
	********************************************************************************************/
	/**
	 * CMS class definition
	 * @param {object} api Reference to the CommonJS API namespace to use for this Core Module System.
	 */
	function CMS(api, debug) {
		var that = this;
		
		that.api = api;
		that.store = new Store();
		
		mixin(api, {
			
			/***************************************************************************************\
			* Input functions																		*
			\***************************************************************************************/
			/**
			 * create a module in the modules list
			 * @param {string} id The full top level id of the module in the module system.
			 * @param {array} deps Array of fully top level dependency id's in the module system.
			 * @param {function} factoryFn The factory function of the module.
			 * @return {bool} True if ok, false if module already exists
			 */
			memoize: function() {
				return that.memoize.apply(that, arguments);
			},
			
			isMemoized: function() {
				return that.isMemoized.apply(that, arguments);
			},
			
			require: function() {
				return that.require.apply(that, arguments);
			},

			/***************************************************************************************\
			* Hook functions																		*
			\***************************************************************************************/
			/**
			 * API hook for for higher layers to return the requested module
			 * @param {string} id The full top level id of the module exports to return.
			 * @return {exports} Requested module exports or undef if not there
			 */
			requireHook: function(id){
				// empty hook so nothing to give back
				return UNDEF;
			},
			
			/**
			 * API hook for for higher layers to provide not available modules in this system
			 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
			 * @param {function} cb Callback function called when all given deps are in INIT state
			 */
			provideHook: function(deps, cb){
				// return nothing done = false
				return false;
			},
		
			/**
			 * API hook for for higher layers to return the exports of the main module of the root system
			 * @param {string} id The full top level id of the module who wants to know its context main module exports
			 * @return {exports} The exports of the context main module 
			 */
			getMainHook: function(id){
				// nothing there so return undefined
				return UNDEF;
			},
	
			/**
			 * API hook for for higher layers to return a Context wide canonical module id
			 * @param {string} id The full top level id for which the Context wide canonical id is requested   
			 * @return {string} The Context wide canonical id version of the given id
			 */
			idHook: function(id){
				// for now nothing to do so just return id
				return id;
			}
		}, true);
		
		// give debugging info back
		if (debug) api.store = that.store;
	}

	CMS.prototype = {
		/*******************************************************************************\
		*	CMS API functions															*
		\*******************************************************************************/	
		/**
		 * Get the requested module
		 * @param {string} id The full top level id of the module exports to return.
		 * @return {exports} Requested module exports or undef if not there
		 */
		require: function(id) {
			var mod;
			
			// exists this module in this system?
			if (mod = this.store.getModule(id)) {
				return mod.createModule();
			} 
			
			// call higher layer require because maybe in another system ??
			return this.api.requireHook(id);
		},
		
		/**
		 * create a module in the modules list
		 * @param {string} id The full top level id of the module in the module system.
		 * @param {array} deps Array of fully top level dependency id's in the module system.
		 * @param {function} factoryFn The factory function of the module.
		 * @return {bool} True if ok, false if module already exists
		 */
		memoize: function(id, deps, factoryFn) {
			// create Module Instance and save in module store if not already exists
			if (!this.store.existModule(id)) {
				this.store.setModule(id, new Module(id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		isMemoized: function(id) {
			return this.store.existModule(id);
		},
		
		/**
		 * provide function
		 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
		 * @param {function} cb Callback function called when all deps are in INIT state
		 */
		provide: function(deps, cb){
			// check which deps are already in INIT or READY state
			
			// get the not available dep modules and give the callback function
			this.api.provideHook(deps, cb);
		},
		
		/**
		 * return the exports of the main module of the root system
		 * @param {string} id The full top level id of the module who wants to know its context main module exports
		 * @return {exports} The exports of the context main module 
		 */
		getMain: function(id){
			var main;
			// if not overwritten then the module with id=='' is the main module, so get its exports
			if (main = this.api.getMainHook(id))
				return main;
			else
				return this.require('');
		},

		/**
		 * return a Context wide canonical module id
		 * @param {string} id The full top level id for which the Context wide canonical id is requested   
		 * @return {string} The Context wide canonical id version of the given id
		 */
		id: function(id){
			// if not overwritten this system IS the context so just return this given full top level id
			return this.api.idHook(id);
		}
	}

	/********************************************************************************************
	* Generic Module System implemented as Module Class											*
	********************************************************************************************/
	/**
	 * Module class definition
	 * @param {string} id The global id of this Module
	 */
	function Module(id, deps, factoryFn, cms) {
		this.id = id;																// The full top level id of this module in this system
		this.deps = deps;															// The module dependencies (The full top level id's)
		this.factoryFn = factoryFn;													// Factory Function
		this.cms = cms;																// The core module system this module is defined in
		
		this.exports = {};															// The exports object for this module
		this.module = null;															// The module variable for the factory function
		
		this.state = INIT;															// Module instance is in INIT state.
	}
	
	Module.prototype = {
		/**
		 * Local require function
		 * @param {string} id
		 */
		require: function(id) {
			// resolve id to current environment
			id = (id === '') ? id : this.resolveId(id);
			
			// get requested module exports
			var exports = this.cms.require(id);
			if (!exports) {
				// module doesn't exist so throw error
				throw "Module: " + id + " doesn't exist!!";
			} 
			
			// just a normal require call and return exports of requested module 
			return exports;
		},
		
		/**
		 * Local require.ensure function
		 * @param {array] deps Modules that need to be in DEFINED state before cb is called
		 * @param {function} cb Callback function called when deps are in DEFINED state
		 */
		ensure: function(deps, cb) {
			var lDeps = [];
				
			if (deps === UNDEF) deps = [];
			
			// normalize dependancy ids relative to the module requiring it
			for (var i=0; deps[i]; i++) {
				// resolve given dependency and save for load
				lDeps.push(this.resolveId(deps[i]));
			};
			
			// Call Core Module System to load the requested modules and if ready call the callback function
			this.cms.provide(ldeps, cb)
			
			// return undefined at this moment, standard is not clear about this.
			return UNDEF;
		},
		
		/**
		 * Resolve the given relative id to the current id or if not relative just give it back
		 * @param {string} id The id to resolve
		 * @return {string} resolved and sanatized id.
		 */
		resolveId: function(id) {
			if (id.charAt(0) === '.') {
				// if relative start then resolve...
				id = this.id + '/' + id;
				var oldId = id.split('/');
				var newId = [];
				var i;

				if (id.charAt(id.length - 1) === '/')
					oldId.push("INDEX");

				for (i = 0; i < oldId.length; i++) {
					if (oldId[i] == '.' || !oldId[i].length)
						continue;
					if (oldId[i] == '..') {
						if (!newId.length)
							throw new Error("Invalid module path: " + path);
						newId.pop();
						continue;
					}
					newId.push(oldId[i]);
				}
				id = newId.join('/');
			}
			return id;
		},
		
		/**
		 * Initialize Module.exports by calling creatorFn
		 * @return {exports} The exports of the ready module, null if factory call not possibele
		 */
		createModule: function() {
			if (this.state === INIT) {
				// need reference to require function
				// need reference to exports
				// need reference to module object with id and uri of this module
				// do mixin of result and this.exports
				this.state = READY;	// set to true before initialization call because module can request itself.. (circular dep problems) 
				mixin(this.exports, this.factoryFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
			}
			
			// if READY then return this module exports else return null 
			return (this.state === READY) ? this.exports : null;
		},
		
		/**
		 * Create a module specific require callback function with CommonJS defined properties
		 * @return {function object} module specific require function and properties
		 */
		returnRequire: function (){
			var that = this,
				reqFunction =  function(){
					return that.require.apply(that, arguments);
				}
			
			// also add require.ensure function	
			reqFunction.ensure = function(){
				return that.ensure.apply(that, arguments);
			};
			// return created require function
			return reqFunction;
		},
	
		/**
		 * Create a module specific module object with CommonJS defined properties
		 * @return {object} object with module specific properties
		 */
		returnModule: function (){
			// already created so return that
			if (!this.module) {
				// else fill new module
				this.module = {
					id: this.cms.id(this.id),
				}
			}
			// return the module
			return this.module;
		}
	}
	
	// return the Core Module System API
	return function(api, debug){ 
		new CMS(api, debug);
		return api;
	}
}();
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

