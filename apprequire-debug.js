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
var require, exports, module;
// Check for an existing version of an exports object. If that does not exists then define a new exports reference.
if (typeof exports === "undefined")
	exports = {};

// define the Bootstrap System API
exports.boot = function(){
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
			waitSeconds: 6000,
			baseUrlMatch: /apprequire\.js/i
		},
					
		// default commonjs API:
		commonjsAPI = {
			cml: "coreModuleLayer",
			context: "genericContext",
			package: "genericPackage",
			loader: "genericLoader",
		},
		
		// CommonJS Context ID Type
		CJS_TYPE_Context = 'context';
		
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
	* Specific CommonJS environment Bootstrap code												*
	********************************************************************************************/
	function bootCommonJS(contextCfg){
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
					result = script.getAttribute('context');
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
	function addModule(dep, factoryFn, contextCfg){
		var exports = {},
			modules = contextCfg.modules,
			commonjsAPI = contextCfg.commonjsAPI,
			api, context;
		
		// Execute factory function to get commonjs api information
		mixin(exports, factoryFn.call(null, null, exports, null));
		
		if (exports.commonjs !== UNDEF) {
		// exports comes back with commonjs api information
			api = exports.commonjs;
			if (api.type && api.create){
				// save this api information
				modules[api.type] = api.create;
				// check if all modules are now loaded. If true then startup first context
				if (bootstrapReady(commonjsAPI, modules)){
					// delete declare because only in use for bootstrap...
					delete contextCfg.env.module.declare;
					// if context API exists then create context with current cfg, and the System Module list. If something goes wrong then throw error
					if (!modules[commonjsAPI[CJS_TYPE_Context]] || !(context = modules[commonjsAPI[CJS_TYPE_Context]](contextCfg))) throw new Error("No correct CommonJS Module API declaration!!");
					// save context for later use ??
					contextList.push(context)
				}
			}
		} else {
		// non CommonJS system API module is declared, throw error
			throw new Error("Invalid bootstrap module declaration!!");
		}
	}
	
	function bootExtraModuleEnvironment(contextCfg){
		contextCfg.env.module = {
			declare: function(deb, factoryFn){
				addModule(deb, factoryFn, contextCfg);
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
				
		// then get possible script attribute configuration option if in browser env
		if (env.document !== UNDEF) 
			mixin(cfg, getContextConfig(env.document, cfg.baseUrlMatch));
		
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
	
	/**
	 * Boot the whole commonjs environment depending on the environment. 
	 * @param {object} env Description of the current environment
	 * @param {bool} commonjs True if the current host environment already as some sort of commonjs module environment implemented
	 * @return {?} The information returned by the specific environment boot procedure
	 */
	function boot(env, commonjs){
		// get the context config
		var contextCfg = setupConfig(env, {env: env});
		
		// select flow of bootstrap on commonjs env
		if (commonjs) 
			return bootCommonJS(contextCfg);
		else
			return bootExtraModuleEnvironment(contextCfg);
	}
	
	/********************************************************************************************
	* Bootstrap API definition																	*
	********************************************************************************************/
	// return the Bootstrap System API
	return boot;
}();

/********************************************************************************************
* Bootstrap in the correct way depending on the environment									*
********************************************************************************************/
// Check if in a CommonJS Module Environment
if (typeof require !== "undefined") {
	// call bootstrap with a provisioned window scope because we are in a CommonJS Module Environment
	exports.boot = exports.boot({
			location: {
				protocol: "memory:",
				href: "memory:/" + "/apprequire/"
			},
			require: require,
			exports: exports,
			module: module
		}, 
		true
	);
} else {
	// other environment, probably browser (CommonJS Extra Module Environment)
	exports.boot(window, false);
}

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
module.declare([], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		api = exports.commonjs = {},							// create the commonjs api namespace
		
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
	function ModuleStore() {
		this.modules = {};								// initialize module store
	}
	
	ModuleStore.prototype = {
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
	 */
	function CMS() {
		this.store = new ModuleStore();
	}

	CMS.prototype = {
		/**
		 * API hook to get the requested module
		 * @param {string} id The full top level id of the module exports to return.
		 * @return {exports} Requested module exports or undef if not there
		 */
		require: function CMSRequire(id){
			var mod;
			// exists this module in this system?
			if (mod = this.store.getModule(id)) {
				return mod.createModule();
			} 
			
			// return undefined because maybe in another system ??
			return UNDEF;
		},
		
		/**
		 * API hook to create a module in this systems modules list
		 * @param {string} id The full top level id of the module in this module system.
		 * @param {array} deps Array of full top level dependency id's in this module system.
		 * @param {function} factoryFn The factory function of the module.
		 * @return {bool} True if ok, false if module already exists
		 */
		memoize: function CMSMemoize(id, deps, factoryFn){
			// create Module Instance and save in module store if not already exists
			if (!this.store.existModule(id)) {
				this.store.setModule(id, new Module(id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		// API hook
		isMemoized: function CMSIsMemoized(id){
			return this.store.existModule(id);
		},
		
		/**
		 * API hook for for higher layers to provide not available modules in this system
		 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
		 * @param {function} cb Callback function called when all given deps are in INIT state
		 */
		provide: function CMSProvide(deps, cb){
			// return nothing done = false
			return false;
		},
		
		/**
		 * API hook to return the exports of the main module of the root system
		 * @param {string} id The full top level id of the module who wants to know its context main module exports
		 * @return {exports} The exports of the context main module 
		 */
		getMain: function CMSGetMain(id){
			// if not overridden then the module with id=='' is the main module, so get its exports
			return this.require('');
		},

		/**
		 * API hook to return a Context wide canonical module id
		 * @param {string} id The full top level id for which the Context wide canonical id is requested   
		 * @return {string} The Context wide canonical id version of the given id
		 */
		id: function CMSId(id){
			// if not overridden this system IS the context so just return this given full top level id
			return id;
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
	
	/********************************************************************************************
	* Core Module Layer API generation															*
	********************************************************************************************/
	api.type = 'coreModuleLayer';
	api.create = function(cfg){ 
		return new CMS();
	}
})
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
 * This is a Generic Context System
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

- Need init function coupling to CMS
- initialize module cache 
- in init: analize cfg argument how to initialize
- in init: add main environment (id = "") mapping to module location
- in init: add standard loader for js modules
- in init: add other loaders as described in cfg argument
-  
*/
 
/**
 * Generic Context System definition
 */
module.declare([], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		api = exports.commonjs = {};							// create the commonjs api namespace
		
	/********************************************************************************************
	* Generic Store implemented as Class														*
	********************************************************************************************/
	function Store() {
		this.store = {};										// initialize store
	}
	
	Store.prototype = {
		/*******************************************************************************\
		*	Store functions																*
		\*******************************************************************************/	
		/**
		 * Get the requested stored object
		 * @param {string} id The id of the object to return.
		 * @return {Object} Requested object or undef if not there
		 */
		get: function(id) {
			// prepend with constant to circumvent standard Object properties
			return this.store[objEscStr + id];
		},
		
		/**
		 * Save the given object in the store
		 * @param {string} id The id of the object to save.
		 * @param {Object} value The object to store.
		 * @return {Object} The stored object
		 */
		set: function(id, value) {
			// prepend with constant to circumvent standard Object properties
			return this.store[objEscStr + id] = value;
		},
		
		/**
		 * Check if the requested object already exists in the store.
		 * @param {string} id The fid of the object to check.
		 * @return {bool} True when object exists, false if not
		 */
		exist: function(id) {
			return (this.store[objEscStr + id] !== UNDEF);
		}
	}
	
	/********************************************************************************************
	* Generic Context implemented as Class														*
	********************************************************************************************/
	function Context(cfg) {
		var modules = cfg.modules,
			commonjsAPI = cfg.commonjsAPI,
			cml,
					
			// CommonJS Context ID Type
			CJS_TYPE_CML = 'cml';
			
		// save the config
		this.cfg = cfg;
		// create a store for all the module subsystems that are to be created in this context
		this.moduleSubs = new Store();
		// create the Main Module System from the given CommonJS API modules
		if (!modules[commonjsAPI[CJS_TYPE_CML]] || !(cml = modules[commonjsAPI[CJS_TYPE_CML]](cfg))) throw new Error("No correct CommonJS Module Layer declaration!!");
		// save the main Module System for later retrieval
		this.moduleSubs.set('commonjs.org', cml);
		// and create environment hooks
		this.startupCML(cml);										
	}
	
	Context.prototype = {
		startupCML: function(cml){
			// give cml instance
			var env = this.cfg.env;
			
			// create extra module environment require
			env.require = function wrapperRequire(){
				return cml.require.apply(cml, arguments);
			};
			env.require.memoize = function wrapperMemoize(){
				return cml.memoize.apply(cml, arguments);
			};
			env.require.isMemoized = function wrapperIsMemoized(){
				return cml.isMemoized.apply(cml, arguments);
			};
		}
	}
	
	/********************************************************************************************
	* Context System API generation																*
	********************************************************************************************/
	api.type = 'genericContext';
	api.create = function(cfg){
		return new Context(cfg);
	}
})
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
 * This is a Generic Package System
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
 * Generic Package System definition
 */
module.declare([], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		api = exports.commonjs = {};							// create the commonjs api namespace
	

	var	mappings = {};						// The mappings store

	/*******************************************************************************\
	*	mappings store functions													*
	\*******************************************************************************/	
	/**
	 * Get the requested mapping URI
	 * @param {string} id Id of the mapping URI to return.
	 * @return {URI} Requested mapping URI or undef if not there
	 */
	function getMapping(id) {
		// prepend with constant to circumvent standard Object properties
		if ((id.length>0) && (id.charAt(id.length-1) !== '/')) id = id + '/';
		return mappings[objEscStr + id];
	}
	
	/**
	 * Set the requested mapping in the mapping list
	 * @param {string} id Id of the mapping to save.
	 * @param {URI} value The URI value.
	 * @return {URI} The set URI value
	 */
	function setMapping(id, value) {
		// prepend with constant to circumvent standard Object properties
		if ((id.length>0) && (id.charAt(id.length-1) !== '/')) id = id + '/';
		return mappings[objEscStr + id] = value;
	}
	
	/**
	 * Resolve from an id the root URI via mappings tree. Recursive function!! 
	 * @param {string} id Canonicalized id 
	 * @return object Object with URI and cut back id
	 */	
	function getURIid(id, mapped) {
		// initialize recursion..
		if (!mapped) mapped='';
		
		// look if next added term is a mapping
		if (getMapping(mapped + getFirstTerm(id) + '/')) {
			mapped = mapped + getFirstTerm(id) + '/';
			id = cutFirstTerm(id);
			return getURIid(id, mapped);
		}
		
		// return the result 
		return {
			URI: getMapping(mapped) + id,
			id: id
		};
	}
	
	function procesPackageCfg(cfg) {
		var map;

		// see if uid is defined in new cfg, and check if it is the same as created;
		if (cfg.uid && cfg.uid !== this.uid) {
			// change to new uid and save extra ref as this package must be known under previuos uid and new uid
			this.uid = cfg.uid;
			setPackage(cfg.uid, this);
		}
		
		// save module id that acts as main package module for parent package and add a defer call to 'require' 
		// that module when ready by calling startUp
		this.mainId = (cfg.main) ? this.uid + packageDelimiter + cfg.main : null;
		if (this.mainId) {
			addDefer(this.mainId, this.startUp, this);
		};
		
		// add lib dir to module uri location if available in cfg else use standard 'lib'
		this.moduleUri = (cfg.directories && cfg.directories.lib) ? resolveUri(this.uri, cfg.directories.lib) : resolveUri(this.uri, 'lib');

		// iterate through all the paths to create new path references for this package
		iterate(cfg.paths, function(newId, pathcfg) {
			this.setPath(newId, resolvePath(this.moduleUri, pathcfg));						// resolve the new path against the current lib package path
		}, this);
		
		// iterate through all the mappings to create and load new packages
		this.createMappings(cfg.mappings);
		
		return this;																		// ready for next function on this package
	}
	
	/**
	 * Map new package to short id and if the package is not already loaded define and load it
	 * @param (object) mappings Standard mapping object
	 */
	function createMappings(mappings){
		// iterate through all the mappings to create and load new packages
		iterate(mappings, function(newId, mapcfg) {
			var mapping = {}; 
			mapping.uri = (mapcfg.location) ? resolvePath(this.uri, mapcfg.location) : '';	// get the location of the mapped package
			mapping.uid = (mapcfg.uid) ? mapcfg.uid : mapping.uri;							// get the uid of the mapped package
			this.setMapping(newId, mapping);												// and add to mappings definitions
			if (!getPackage(mapping.uid)) {
				if (mapping.uri === '') throw 'No mapping location for package: ' + this.uid + ' and mapping: '+ newId;
				(new Package(mapping.uid, mapping.uri)).loadPackageDef();					// if not already defined then define this new package and start loading def
			}
		}, this);
	}
		
	/********************************************************************************************
	* Package System API generation																*
	********************************************************************************************/
	api.type = 'genericPackage';
	api.create = function(cfg){ 
	}
});
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
 * This is an implementation of a Generic Loader System 
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
 * Generic Loader System definition
 */
module.declare([], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		api = exports.commonjs = {};							// create the commonjs api namespace
	
	/********************************************************************************************
	* Generic Loader implemented as Class														*
	********************************************************************************************/
	function Loader() {
	}
	
	Loader.prototype = {
		/**
		 * Start loading a package definition in this package
		 * @param {string} file Specific location of the package.json definition file 
		 */
		loadPackageDef: function(file){
			var id;
			
			// check if other then standard definition path/filename is given
			if (file) {
				id = this.addUid(getLastTerm(file));
				file = resolveUri(this.moduleUri, file+'.js');
			} else {
				id = this.addUid('package');
				file = resolveUri(this.moduleUri,'package.js');
			}
			
			// insert the scripttag with the correct variables (id, uri, parentPackage, cb, cb scope)
			this.insertScriptTag(id, file, this, this.procesQueues, this);
		},
		
		/**
		 * Callled when a 'package', 'module' or 'transport' script file is loaded. Will clean scrip var and
		 * call procesPackageDef and procesModQueue to process all defined packages and modules in the Queues.
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
		 */
		procesQueues: function(script, state){
			// do nothing because already parsed this scriptload
			if (script._done) return;
			
			// handle erors in loading
			if (!state) {
				// see if this module is also the main of the parent package. If so, set that state to LOADERROR too...
				if (script._package.uid === this.uid) {
					// Set the state for this package to LOADERROR
					this.setState(LOADERROR);
				}
			}
			
			// clean script var of callback functions etc.
			this.cleanScriptTag(script);
	
			// process the package definition
			this.procesPackageDefs(script);
			
			// process the module defQueue
			this.procesModQueue(script, true);
			
			// see if main module is already defined else load it, can't do this check in procesPackageCfg
			// because waiting module defs loaded inline with the package def are not processed at that moment.
			if ((this.mainId !== null) && !getModule(this.mainId)) {
				this.moduleLoader(this.mainId);
			}
		},
		
		/**
		 * Process a package load by reading the package definition
		 * @param {} script The script 
		 */
		procesPackageDefs: function(script){
			var def;
	
			for (; def = defPackages.pop();){
				// if interactive then get package def specific script var
				if (testInteractive) script = def[1];
				
				// proces config and save also for later use
				script._package.procesPackageCfg(def[0]);
			}
		},
		
		/**
		 * Callled when a 'module' or 'transport' script file is loaded and declared inline module or transport modules need to be parsed
		 * for dependencies. If all dependencies are available all not parsed modules can be parsed with correct dependency paths.
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
		 */
		procesModQueue: function(script, state) {
			// move all new modules to modulelist
			var def,
				id,
				rootPackage,
				i,
				scriptModuleId = script._moduleId;
				
			// first handle all waiting modules to be defined	
			for (i=0; def = defQueue[i]; i++){
				// if interactive then get module def specific script var
				if (testInteractive && (def[3] !== null)) script = def[3];
				rootPackage = script._package;
				
				// get correct id.
				if (def[0]) {
					// Named module. normalize id to parent package
					id = rootPackage.addUid(def[0]);
				} else {
					// nameles module so use script module id (wich is already normalized) 
					id = script._moduleId;
				}
				
				// if module doesn't exist then create one 
				if (!getModule(id)) {
					setModule(id, new Module(rootPackage, id, script.src));
				}
				
				// check first if the module state is loading, that means double define, and thats not allowed !!
				if (getModule(id).state === LOADING) { 
					getModule(id).define(def[1], def[2]);
				}
			};
			// clear for next load
			defQueue = [];
			
			// handle erors in loading by checking if timeout (all browsers), script error (all except IE) or if script given is loaded but in reality isn't (IE)
			if (!state || ((getModule(scriptModuleId)) && (getModule(scriptModuleId).state === LOADING))) {
				// Set the state for this module to LOADERROR
				if (getModule(scriptModuleId)) getModule(scriptModuleId).setState(LOADERROR);
			}
			
			// resolve new dependencies if all scripts are loaded
			if (scripts.length == 0) {
				iterate(modules, function(key, mod) {
					// if module is loaded then look for dependencies to load
					if (mod.state === LOADED) {
						mod.resolveDependencies();
					}
				});
			}
			
			// while loading dependency scripts or all scripts loaded try to evaluate all elegible modules by checking dependency state
			iterate(modules, function(key, mod) {
				// if in dependency state then look if you can create the module
				if (mod.state === DEPENDENCY) {
					// recursive 
					mod.checkDependencyState();
				}
			});
			
			// check if one of the deferred functions waiting for a module is ready
			checkAllDeferred();
		},
		
		/**
		 * Route the module to load to the correct loader
		 * @param {string} loader The loader Module to use
		 * @param {string} id The module id to load.
		 */
		moduleLoader: function(id, loader) {
			var pPackage,
				uri,
				module;
			
			// if module not defined already then call correct loader and make module 
			if (!getModule(id)) {
				// get parent package of this id
				pPackage = this.resolvePackage(id);
				// get url path
				uri = pPackage.searchPath(id);
				// create module
				module = setModule(id, new Module(pPackage, id, uri));
				
				// if no loadername then just assume js load is requested
				if ((loader === UNDEF) || (loader === '')) this.loadJSModule(id, uri, pPackage)
				else {
					//call the correct loader module
					addDefer([loader], this.createLoaderCb(loader, id, module.returnRequire()), this)					
				}
			}
		},
		
		/**
		 * Create callback to used by the Defer waiting for the ModuleLoader module to be loaded.
		 * @param {string} loader Id of the loader module
		 * @param {string} id Id of the module to be loaded by the loader
		 * @param {function} mRequire The require function of the module that needs to be loaded by the ModuleLoader
		 * @return {function} Function closure that calls the ModuleLoader load function
		 */
		createLoaderCb: function(loader, id, mRequire) {
			return function() {
				var mod = getModule(loader);
				if (!mod.createModule() || (mod.state === LOADING) || (mod.state === LOADERROR)) {
					// module exists but is not loaded (when error loading file)
					throw "Module: " + id + " is not loaded or in error state!!";
				} else {
					var sid = id.substring(id.indexOf(packageDelimiter)+1);		
					// just a normal require call and return exports of requested module 
					if (mod.exports.load) mod.exports.load.call(null, sid, mRequire, this.createModuleLoadedCb(id))	
				}
			}
		},
		
		/**
		 * Create callback function for a ModuleLoader to call when the requested module is loaded
		 * by the module loader
		 * @param {string} id Id of the module to be loaded by the loader
		 * @return {function} Function closure that sets the exports and state of the requested module that is loaded by the ModuleLoader
		 */
		createModuleLoadedCb: function(id){
			var that = this;
			return function(exports) {
				// set requested module to loaded with exports to exports
				var mod = getModule(id);
				mod.setState(READY);
				mod.deps = [];
				mod.factoryFn = function(){};
				mixin(mod.exports, exports);
				
				// try to evaluate all elegible modules by checking dependency state
				iterate(modules, function(key, mod) {
					// if in dependency state then look if you can create the module now this module is loaded
					if (mod.state === DEPENDENCY) {
						// recursive 
						mod.checkDependencyState();
					}
				});
			
				// module is ready so call deferred to start depending callbacks
				checkAllDeferred();
			}
		},

		/**
		 * Local module/transport load function, defines script tag with procesQueues as callback function if file loaded. 
		 * @param {string} id Normalized id of module to be loaded
		 * @param {string} uri Normalized uri of module to be loaded
		 * @param {Package} pPackage Parent package of the module to be loaded
		 */
		loadJSModule: function(id, uri, pPackage) {
			this.insertScriptTag(id, uri + ".js", pPackage, pPackage.procesQueues, pPackage); // set the module to load!!
		},
		
		/**
		 * Create scripttag for given id, uri and callback/scope function
		 * @param {string} id Full id of the unnamed modules in this script to load
		 * @param {string} uri The full uri to the script to load
		 * @param {Package} parentPackage The package that requested the load 
		 * @param {function} cb Callback function to call
		 * @param {object} scope Scope of the Callback function
		 */
		insertScriptTag: function(id, uri, parentPackage, cb, scope) {
			// create file tag from scripttag
			var file = doc.createElement("script");
			file._moduleId = id;
			file._package = parentPackage;
			file._timer = setTimeout(this.scriptTimer(file, cb, scope), timeout);
			file.type = "text/javascript";
			file.onload = file.onreadystatechange = this.scriptLoad(file, cb, scope);
			file.onerror = this.scriptError(file, cb, scope);
			file.src = uri;
			
			// closure save for later use
			scripts.push(file);
			
			// insert scripttag
			horb.insertBefore(file, horb.firstChild);
		},
		
		/**
		 * clean all temporary vars to prevent possible memory leaking
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 */
		cleanScriptTag: function(script) {
			script._done = true;
			script.onload = script.onreadystatechange = new Function("");
			script.onerror = new Function("");
			if (script._timer) clearTimeout(script._timer);
			each(scripts, function(s, index){
				if (script === s) scripts.splice(index, 1);
			})
		},
		
		/**
		 * Returns a closure function that will be called when the script is loaded
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {function} cb Callback function to call when the script is loaded
		 * @param {object} scope Scope of the Callback function
		 */
		scriptLoad: function(script, cb, scope) {
			return function(){
				if (script._done || (typeof script.readyState != "undefined" && !((script.readyState == "loaded") || (script.readyState == "complete")))) {
					return;							// not yet ready loading
				}
				cb.call(scope, script, true);		// call the callback function with the correct scope and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when there is an loaderror for a script
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {function} cb Callback function to call when error happens
		 * @param {object} scope Scope of the Callback function
		 */
		scriptError: function(script, cb, scope) {
			return function(){
				cb.call(scope, script, false);		// call the callback function with the correct scope and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when a script insertion times out
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {function} cb Callback function to call when timer expires
		 * @param {object} scope Scope of the Callback function
		 */
		scriptTimer: function(script, cb, scope) {
			return function(){
				script._timer = 0;					// timer is already used else I wouldn't be here... ;-)
				cb.call(scope, script, false);		// call the callback function with the correct scope and error indication
			};
		}
	}
	
	/********************************************************************************************
	* Loader System API generation																*
	********************************************************************************************/
	api.type = 'genericLoader';
	api.create = function(cfg){ 
	}
});
