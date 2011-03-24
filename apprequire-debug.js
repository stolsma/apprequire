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
			timeout: 6000,
			baseUrlMatch: /apprequire/i
		},
					
		// default commonjs API:
		commonjsAPI = {
			cml: "coreModuleLayer",
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
		
		// CommonJS Context ID Type
		CJS_TYPE_CML = 'cml';
		
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

				// Execute factory function to get commonjs api information
				context = modules.execute(commonjsAPI[CJS_TYPE_CML]);
				// if context API exists then create context with current cfg, and the System Module list. If something goes wrong then throw error
				if (!context || !(context = context.create(contextCfg))) throw new Error("No correct CommonJS Module API declaration!!");
				// save context for later use ??
				contextList.push(context)
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
module.declare('coreModuleLayer', [], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		
		// CommonJS ID Types
		CJS_TYPE_LOADER = 'loader';
		
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
		 * Remove the given object from the store
		 * @param {string} id The id of the object to remove.
		 * @return {Object} The removed object or UNDEF if not existing
		 */
		remove: function(id) {
			// see if object exists
			var temp = this.store[objEscStr + id];		
			// check if requested object exists
			if (temp !== UNDEF)
				// prepend with constant to circumvent standard Object properties and delete
				delete this.store[objEscStr + id];
			return temp;
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
	* Generic Loader implemented as Class														*
	********************************************************************************************/
	function LoaderBase() {
		/**
		 * The store with the defined scheme / SpecificLoader combinations
		 */
		this.loaders = new Store();
	}
	
	LoaderBase.prototype = {
		/**
		 * Add SpecificLoader to the list
		 * @param {string} scheme The URI scheme identifier the given SpecificLoader will handle (without : )
		 * @param {SpecificLoader} loader The SpecificLoader Instance
		 */
		addLoader: function(scheme, loader){
			// save this loader in the SpecificLoader store
			this.loaders.set(scheme, loader);
		},
		
		/**
		 * Route the resource to load to the correct SpecificLoader
		 * @param {array} resources An array of resource objects to load.
		 * @param {function} cb The callback function if an asynchronous load is requested.
		 * @return {bool} False if request couldn't be fulfilled, true if request is running
		 */
		load: function(resources, cb) {
			var i, res, scheme, loader;
			
			// run through all required dependencies
			for (i=0; res = resources[i]; i++) {
				// get scheme from resource (see: http://tools.ietf.org/html/rfc3986)
				scheme = this.getScheme(res.uri);
				
				// lookup corresponding SpecificLoader by using the retrieved scheme
				if ((loader = this.loaders.get(scheme)) === UNDEF) return false;
				
				// call load function of the SpecificLoader with resource, loader API and ready callback function
				loader.load(res.uri + res.id, res.api, this.createLoadedCb(res, cb));
			}
		},
		
		/**
		 * Will be called when the SpecificLoader is ready loading the specified resource
		 * @param {string} resource The URI of the resource that was loaded.
		 * @param {array} args The arguments given back by the used loader.
		 */
		loaded: function(resource, cb, args){
			// if callback function exists then call it with given arguments
			if (cb !== UNDEF) cb.call(null, resource, args);
		},
		
		/**
		 * Create callback function for a SpecificLoader to call when the requested 'item' is loaded by the SpecificLoader
		 * @param {string} resource URI of the resource to be loaded by the SpecificLoader
		 * @return {function} Function closure that calls this.loaded
		 */
		createLoadedCb: function(resource, cb){
			var that = this;
			return function contextLoadedCb(){
				that.loaded.call(that, resource, cb, arguments);
			};
		},
		
		getScheme: function(resource){
			return 'http';
		}
	}
	
	/********************************************************************************************
	* Generic Context implemented as Class														*
	********************************************************************************************/
	function Context(cfg) {
		var that = this;
		
		// save the config
		this.cfg = cfg;
		// create a store for all the module subsystems that are to be created in this context
		this.moduleSubs = new Store();
		// create a store for loading resources
		this.loading = new Store();
		// deferred list
		this.deferred = [];
		
		// generate loaders and the plugins
		this.startupLoader(cfg);
											
		// and create environment hooks
		this.startupCMS(cfg);
		
		// main module given to startup with??
		if (cfg.location && cfg.main) {
			this.provide('commonjs.org', cfg.main, function contextConstructorInitLoadCB(){
				 that.moduleSubs.get('commonjs.org').cms.require(cfg.main);
			})
		}
	}
	
	Context.prototype = {
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		startupCMS: function(cfg){
			var env = cfg.env,
				that = this,
				cms;
			
			// create the Main Module System
			cms = new CMS('commonjs.org');
			// save the main Module System with other system info for later retrieval
			this.moduleSubs.set('commonjs.org', {
				cms: cms,
				uri: cfg.location
			});
			
			// extend cms API
			cms.provide = function ContextProvide(deps, cb){
				that.provide(this.uid, deps, cb);
			};
			
			// add default system modules to the main module system
			this.addSystemModules(cms, cfg.commonjsAPI, cfg.modules);
			
			/**********************************************\
				Onderstaande alleen voor debug !!!!!!!!
			\**********************************************/
			env.module.cms = cms;
			// create extra module environment require
			env.require = function wrapperRequire(){
				return cms.require.apply(cms, arguments);
			};
			env.require.isMemoized = function wrapperIsMemoized(){
				return cms.isMemoized.apply(cms, arguments);
			};
		},
		
		addSystemModules: function(cms, commonjsAPI, modules){
			var i, id;
			
			for (i=0; id = commonjsAPI.systemModules[i]; i++){
				cms.memoize(id, modules[id].deps, modules[id].factoryFn);				
			}
		},
		
		startupLoader: function(cfg){
			var modules = cfg.modules,
				commonjsAPI = cfg.commonjsAPI,
				env = cfg.env,
				loader; 
			
			loader = modules.execute(commonjsAPI[CJS_TYPE_LOADER]);
			// create the loader from the given CommonJS API modules
			if (!loader || !(loader = loader.create(cfg))) throw new Error("No correct CommonJS Loader Layer declaration!!");
			
			// create loaderbase and add loader
			env.module.cfg = cfg;
			env.module.loaderBase = this.loaderBase = new LoaderBase();
			this.loaderBase.addLoader('http', loader);
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		provide: function(uid, deps, cb){
			var i, dep,
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by calling getCMSId
				dep = this.getCMSId(uid, dep);
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(dep.uri + dep.id)) && (!dep.cms.isMemoized(dep.id))) {
					// create module system specific Loader API
					dep.api = this.createAPI(dep.id, dep.uid);
					// add to loading list
					this.loading.set(dep.uri + dep.id, dep);
					// add normalized dependency to resource list
					resources.push(dep);
				}
			};
			
			// and if resources need to be loaded then load them
			if (resources.length) 
				this.loaderBase.load(resources, this.provideCallback(resources, cb));
			else
				// end of this loadtree so call cb
				cb.call(null);
		},
		
		provideCallback: function(resources, cb){
			var i, res, 
				that = this,
				reslist = [];
				
			// generate fresh resourcelist	
			for (i=0; res = resources[i]; i++){
				reslist.push(res.uri + res.id)
			}
			// return callback function
			return function contextProvideCallback(resource, args){
				var i, res;
				
				// ready loading this resource so remove from context global loading list
				that.loading.remove(resource.uri + resource.id);
				
				// check if all given resources are recursively loaded
				for (i=0; res = reslist[i]; i++){
					if (res == resource.uri + resource.id)
						break;
				}
				// if resource existed in list remove it
				if (res !== UNDEF) {
					reslist.splice(i, 1);
					// was last one so call the given callback
					if (reslist.length == 0)
						cb.call(null, args);
				} else
					// called with wrong resource, shouldn't happen but to be sure throw error if it happens
					throw new Error('Wrong resource returned for this callback!! (context.provideCallback)'); 
			}
		},
		
		getCMSId: function(uid, dep){
			var cms = this.moduleSubs.get(uid);
			return {
				cms: cms.cms,
				uid: uid,
				uri: cms.uri,
				id: dep
			}
		},
		
		createAPI: function(mid, cms){
			var cms = this.moduleSubs.get(cms).cms;
			return {
				cmsuri: cms.uri,
				deps: [],
				memoize: function ContextAPIMemoize(id, deps, factoryFn){
					// no given id then use requested id
					if (id === null) id = mid;
					// no given deps then use empty array
					if (deps === UNDEF) deps = [];
			
					// normalize dependancy ids relative to the module requiring it
					for (var i=0; deps[i]; i++) {
						// resolve given dependency and save for load
						deps[i] = cms.resolveId(id, deps[i]);
						this.deps.push(deps[i]);
					};
					
					// add module to the requesting module system
					cms.memoize(id, deps, factoryFn);
					
				},
				loadReady: function ContextAPILoadReady(cb){
					// Call Core Module System to load the requested modules and if ready call the callback function
					cms.provide(this.deps, cb);
					this.deps = [];					
				}
			};
		}
	}
	
	/********************************************************************************************
	* Module System implemented as Class														*
	********************************************************************************************/
	/**
	 * CMS class definition
	 */
	function CMS(uid) {
		// save the uri for this module system
		this.uid = uid;
		// create the module store for this module system
		this.store = new Store();
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
			if (mod = this.store.get(id)) {
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
			if (!this.store.exist(id)) {
				this.store.set(id, new Module(id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		// API hook
		isMemoized: function CMSIsMemoized(id){
			return this.store.exist(id);
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
		},
		
		/**
		 * Resolve the given relative id to the current id or if not relative just give it back
		 * @param {string} id The id to resolve
		 * @return {string} resolved and sanatized id.
		 */
		resolveId: function CMSResolveId(curId, id) {
			if (id.charAt(0) === '.') {
				// if relative start then resolve...
				id = curId + '/' + id;
				var oldId = id.split('/');
				var newId = [];
				var i;

				if (id.charAt(id.length - 1) === '/')
					oldId.push("INDEX");

				for (i = 0; i < oldId.length; i++) {
					if (oldId[i] == '.' || !oldId[i].length) {
						newId.pop();
						continue;
					}
					if (oldId[i] == '..') {
						if (!newId.length)
							throw new Error("Invalid module path: " + path);
						newId.pop();
						newId.pop();
						continue;
					}
					newId.push(oldId[i]);
				}
				id = newId.join('/');
			}
			return id;
		}		
	}

	/********************************************************************************************
	* Generic Module implemented as Module Class												*
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
			id = (id === '') ? id : this.cms.resolveId(this.id, id);
			
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
				lDeps.push(this.cms.resolveId(this.id, deps[i]));
			};
			
			// Call Core Module System to load the requested modules and if ready call the callback function
			this.cms.provide(lDeps, cb)
			
			// return undefined at this moment, standard is not clear about this.
			return UNDEF;
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
	exports.create = function(cfg){
		return new Context(cfg);
	};
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
module.declare('genericPackage', [], function(require, exports, module){
	var UNDEF;													// undefined constant for comparison functions

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
	exports.commonjs = {
		create: function(cfg){
		}
	};
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
 * This is an implementation of a Specific Loader System 
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
 * Specific Loader System definition
 */
module.declare('scriptLoader', [], function(require, exports, module){
	var UNDEF;													// undefined constant for comparison functions
	
	/********************************************************************************************
	* Utility functions																			*
	********************************************************************************************/
	/**
	 * Returns true if the passed value is a JavaScript array, otherwise false.
	 * @param {Mixed} value The value to test
	 * @return {Boolean}
	 */
	function isArray(v){
		var tString = Object.prototype.toString;				// short version of toString for isxxxx functions
		return tString.apply(v) === '[object Array]';
	}
	
	/**
	 * <p>Returns true if the passed value is empty.</p>
	 * <p>The value is deemed to be empty if it is<div class="mdetail-params"><ul>
	 * <li>null</li>
	 * <li>undefined</li>
	 * <li>an empty array</li>
	 * <li>a zero length string (Unless the <tt>allowBlank</tt> parameter is <tt>true</tt>)</li>
	 * </ul></div>
	 * @param {Mixed} value The value to test
	 * @param {Boolean} allowBlank (optional) true to allow empty strings (defaults to false)
	 * @return {Boolean}
	 */
	function isEmpty(v, allowBlank){
		return v === null || v === undefined || ((isArray(v) && !v.length)) || (!allowBlank ? v === '' : false);
	}

	/**
	 * Iterates an array calling the supplied function.
	 * @param {Array/NodeList/Mixed} array The array to be iterated. If this
	 * argument is not really an array, the supplied function is called once.
	 * @param {Function} fn The function to be called with each item. If the
	 * supplied function returns false, iteration stops and this method returns
	 * the current <code>index</code>. This function is called with
	 * the following arguments:
	 * <div class="mdetail-params"><ul>
	 * <li><code>item</code> : <i>Mixed</i>
	 * <div class="sub-desc">The item at the current <code>index</code>
	 * in the passed <code>array</code></div></li>
	 * <li><code>index</code> : <i>Number</i>
	 * <div class="sub-desc">The current index within the array</div></li>
	 * <li><code>allItems</code> : <i>Array</i>
	 * <div class="sub-desc">The <code>array</code> passed as the first
	 * argument to <code>Ext.each</code>.</div></li>
	 * </ul></div>
	 * @param {Object} scope The scope (<code>this</code> reference) in which the specified function is executed.
	 * Defaults to the <code>item</code> at the current <code>index</code>
	 * within the passed <code>array</code>.
	 * @return See description for the fn parameter.
	 */
	function each(array, fn, scope) {
		if (isEmpty(array, true)) {
			return;
		}
		for (var i = 0, len = array.length; i < len; i++) {
			if (fn.call(scope || array[i], array[i], i, array) === false) {
				return i;
			};
		}
	}

	/********************************************************************************************
	* ScriptLoader implemented as Class															*
	********************************************************************************************/
	function ScriptLoader(cfg) {
		var loaderPlugins, transport, plugin,
			modules = cfg.modules;
		
		this.env = cfg.env;
		this.testInteractive = !!cfg.env.ActiveXObject;				// test if IE for onload workaround... 
		this.timeout = cfg.timeout;
		this.scripts = [];
		this.transports = [];
		
		// create the transports plugins
		if ((loaderPlugins = cfg.commonjsAPI.loaderPlugins) !==UNDEF) {
			for (var i=0; transport = loaderPlugins[i]; i++) {
				plugin = modules.execute(transport);
				if (!plugin || !(plugin = plugin.create(cfg, this))) throw new Error("No correct CommonJS loaderPlugin: " + transport + " declaration!!");
				this.transports.push(plugin);
			}
		}
	}
	
	ScriptLoader.prototype = {
		/**
		 * Local module/transport load function, defines script tag with ready as callback function if file loaded. 
		 * @param {string} uri URI of resource to be loaded
		 * @param {object} api Generic functions that need to be used to add data from resource to the corresponding context
		 * @param {function} cb Callback function that needs to be called when resource loading is ready
		 * @return {bool} True if load request is running (async) or is fulfilled (sync), false if something went wrong
		 */
		load: function(uri, api, cb){
			// this plugin only loads async so return error if synchronous load request
			if (cb === UNDEF) return false;
			
			// from here on only js files are loaded so add .js extension
			uri += ".js";
			
			// make the environment thats available on load ready.
			// Must be done on each load because of possibility of multiple contexts using the same environment (like in browsers)
			this.callTransports('initEnv', [this.env, uri, api]);
			
			// start loading from the given resource location
			this.insertScriptTag(uri, [uri, api, cb], this.ready, this);
			
			// request is running so return true
			return true;
		},
		
		
		/**
		 * Callled when a script file is loaded
		 * @param {array} cbData Extra data inserted by the calling load function, i.e. [uri, api, cb]
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
		 */
		ready: function(cbData, script, state){
			var cb;
			
			// do nothing because already parsed this scriptload
			if (script._done) { 
				throw new error('2nd time script ready call!!');
				return;
			}
			
			// clean script var of callback functions etc.
			this.cleanScriptTag(script);
	
			// push script state
			cbData.push(state);
			
			// give the Transport Plugin a signal that scriptload is ready
			this.callTransports('loadReady', cbData);
		},
		
		/**
		 * Callled when a transport plugin wants to know which URI is active (needed in IE <9)
		 * @return {string} The URI of the current active script tag (if IE<9) or UNDEF if not known
		 */
		getActiveURI: function(){
			var i, script;
			// From the techniques in RequireJS (requirejs.org) by James Burke and Kris Zyp
			// If in IE 6-8 do the interactive concurrently Adding Script stuff.
			if (this.testInteractive) {
				for (i=0; script = this.scripts[i]; i++){
					if (script.readyState === "interactive") {
						return script._moduleURI;
					}
				};
			};
			return UNDEF;
		},
		
		/**
		 * Call a function in all transport plugins with given arguments
		 * @param {string} fnName name of the function to call on all transport plugins
		 * @param {array} arguments The arguments to use in the function call
		 */
		callTransports: function(fnName, arguments){
			var len = this.transports.length,
				i, plugin;
			
			// call the fnName in all the transport plugins
			for (i=0; plugin = this.transports[i]; i++) {
				if (plugin[fnName] == UNDEF) 
					throw new error("Transport plugin: " + plugin.name + " doesn't have function: " + fnName)
				else
					plugin[fnName].apply(plugin, arguments);
			}
		},
		
		/**
		 * Create scripttag for given id, uri and callback/scope function
		 * @param {string} uri The full uri to the resource to load
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call
		 * @param {object} scope Scope of the Callback function
		 */
		insertScriptTag: function(uri, cbData, cb, scope){
			var	doc = this.env.document,															// DOM document reference
				horb = doc.getElementsByTagName("head")[0] || doc.getElementsByTagName("body")[0], 	// get location of scripts in DOM
				file = doc.createElement("script"); 												// create file tag from scripttag

			file._moduleURI = uri; // save for later use because browsers change src field sometimes (like IE does)
			file._timer = setTimeout(this.scriptTimer(file, cbData, cb, scope), this.timeout);
			file.type = "text/javascript";
			file.onload = file.onreadystatechange = this.scriptLoad(file, cbData, cb, scope);
			file.onerror = this.scriptError(file, cbData, cb, scope);
			file.src = uri;
			
			// tag save for later use
			this.scripts.push(file);
			
			// insert scripttag
			horb.insertBefore(file, horb.firstChild);
		},
		
		/**
		 * clean all temporary vars to prevent possible memory leaking
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 */
		cleanScriptTag: function(script){
			script._done = true;
			delete script._moduleURI;
			script.onload = script.onreadystatechange = new Function("");
			script.onerror = new Function("");
			if (script._timer) clearTimeout(script._timer);
			
			// remove script tag from queue
			each(this.scripts, function(s, index){
				if (script === s) this.scripts.splice(index, 1);
			}, this)
		},
		
		/**
		 * Returns a closure function that will be called when the script is loaded
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when the script is loaded
		 * @param {object} scope Scope of the Callback function
		 */
		scriptLoad: function(script, cbData, cb, scope){
			return function(){
				if (script._done || (typeof script.readyState != "undefined" && !((script.readyState == "loaded") || (script.readyState == "complete")))) {
					return;							// not yet ready loading
				}
				cb.call(scope, cbData, script, true);		// call the callback function with the correct scope, data and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when there is an loaderror for a script
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when error happens
		 * @param {object} scope Scope of the Callback function
		 */
		scriptError: function(script, cbData, cb, scope){
			return function(){
				cb.call(scope, cbData, script, false);		// call the callback function with the correct scope, data and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when a script insertion times out
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when timer expires
		 * @param {object} scope Scope of the Callback function
		 */
		scriptTimer: function(script, cbData, cb, scope){
			return function(){
				script._timer = 0;							// timer is already used else I wouldn't be here... ;-)
				cb.call(scope, cbData, script, false);		// call the callback function with the correct scope, data and error indication
			};
		}
	}
	
	/********************************************************************************************
	* Loader System API generation																*
	********************************************************************************************/
	exports.create = function(cfg){
		return new ScriptLoader(cfg);
	};
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
 * This is an implementation of a Modules2.0 Transport plugin 
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
 * Specific Transport Plugin definition
 */
module.declare('moduleTransport', [], function(require, exports, module){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_';										// Object property escape string

	/********************************************************************************************
	* Utility functions																			*
	********************************************************************************************/
	/**
	 * Returns true if the passed value is a JavaScript array, otherwise false.
	 * @param {Mixed} value The value to test
	 * @return {Boolean}
	 */
	function isArray(v){
		var tString = Object.prototype.toString;				// short version of toString for isxxxx functions
		return tString.apply(v) === '[object Array]';
	}
	
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
		 * Remove the given object from the store
		 * @param {string} id The id of the object to remove.
		 * @return {Object} The removed object or UNDEF if not existing
		 */
		remove: function(id) {
			// see if object exists
			var temp = this.store[objEscStr + id];		
			// check if requested object exists
			if (temp !== UNDEF)
				// prepend with constant to circumvent standard Object properties and delete
				delete this.store[objEscStr + id];
			return temp;
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
	* Module Transport implemented as Class														*
	********************************************************************************************/
	function moduleTransport(cfg, parent) {
		this.defQueue = [];
		this.parent = parent;
		this.apiStore = new Store();
	}
	
	moduleTransport.prototype = {
		/**
		 * Name of this Transport Plugin
		 */
		name: 'moduleTransport',
		
		/**
		 * 
		 */
		initEnv: function(env, uri, api){
			var that = this;
			
			// add api for given uri to the store
			this.apiStore.set(uri, api);
			
			// if module propertie doesn't exists define one
			if (!env.module) env.module = {};
			
			env.module.declare = function scriptLoaderDeclare(){
				that.declare.apply(that, arguments);
			};
		},
		
		/**
		 * 
		 */
		loadReady: function(uri, api, cb, state){
			var def, i,
				moduleURI,
				moduleAPI,
				allDeps = [];
								
			// first handle all waiting modules to be defined	
			for (i=0; def = this.defQueue[i]; i++){
				// if module specific uri then use module specific uri else use function local uri
				if (def[3] !== UNDEF) 
					moduleURI = def[3];
				else 
					moduleURI = uri;
				
				// get the api for this moduleURI
				moduleAPI = this.apiStore.get(moduleURI);		// get api for given uri from the store
				
				// define module via the for this resource given API define call (id, deps, factoryFn)
				moduleAPI.memoize(def[0], def[1], def[2]);
			};
			
			// clear module queue for next load
			this.defQueue = [];
			
			// call loadRady on api to signal end of this resource loading to the api
			api.loadReady(cb);
			
			// remove api for given uri from the store
			this.apiStore.remove(uri);
		},
		
		/**
		 * Called when a module in a loaded modules javascript file is declared/defined
		 * @param {string} id (optional) Id of the module to declare
		 * @param {array} deps (optional) Array of module ids this defined module depends on
		 * @param {function} factoryFn The factory function to execute to fill the exports object
		 */
		declare: function(id, deps, factoryFn) {
			var commentRegExp = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;
			var	cjsRequireRegExp = /require\(["']([\w-_\.\/]+)["']\)/g;
			var activeURI;
	
			//Allow for anonymous functions
			if (typeof id !== 'string') {
				//Adjust args appropriately
				factoryFn = deps;
				deps = id;
				id = null;
			}
	
			//This module may not have dependencies
			if (!isArray(deps)) {
				factoryFn = deps;
				deps = [];
			}
	
			//If no name, no deps and delayFn is a function, then figure deps out by scraping code.
			if (!name && !deps.length && (typeof factoryFn === 'function')) {
				//Remove comments from the callback string, then look for require calls, and pull them into the dependencies.
				factoryFn.toString().replace(commentRegExp, "").replace(cjsRequireRegExp, function (match, dep) {
					deps.push(dep);
				});
			}
	
			// get active URI from parent Loader (for solving concurent loading in IE < 9)
			activeURI = this.parent.getActiveURI();
			
			//Always save off evaluating the def call until the script onload handler. This allows multiple modules to be in a file without prematurely
			//tracing dependencies, and allows for anonymous module support, where the module name is not known until the script onload event occurs.
			this.defQueue.push([id, deps, factoryFn, activeURI]);
		}
	}

	/********************************************************************************************
	* Module Transport API generation															*
	********************************************************************************************/
	exports.create = function(cfg, parent){
		return new moduleTransport(cfg, parent);
	};
});
module.declare('system', [], function(require, exports, module){

	var worker = (typeof importScripts === "function");

	function sendMessage(msg, a, b) {
		if (worker)	{
			postMessage([msg, a, b]);
		} else {
			var w = window;
			
			if (window.parent && window.parent[msg])
				w = window.parent;
			
			if (w[msg]) w[msg](a, b);
		}
	}

	exports.stdio =	{
		print: function(txt, style)	{
			sendMessage("printResults", txt, style);
		}
	};
});

module.declare('test', ["system"], function(require, exports, module) {
	var system = require("system");
	
	exports.print = function () {
		var stdio = system.stdio;
		stdio.print.apply(stdio, arguments);
	};
	
	exports.assert = function (guard, message) {
		if (guard) exports.print("PASS " + message, "pass");
		else exports.print("FAIL " + message, "fail");
	};
});

