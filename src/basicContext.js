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
 *
 * Based on CommonJS (http://www.commonjs.org) specs, discussions on the Google Groups CommonJS lists 
 * (http://groups.google.com/group/commonjs), RequireJS 0.14.5 (James Burke, http://requirejs.org), 
 * FlyScript.js (copyright Kevin H. Smith, https://github.com/khs4473), BravoJS (copyright Wes Garland,
 * http://code.google.com/p/bravojs/), Pinf/Loader (copyright Christoph Dorn, https://github.com/pinf/loader-js)
 * and utility code of Ext Core 4 (copyright Sencha, http://www.sencha.com)
 *
 * For documentation how to use this: http://code.tolsma.net/apprequire
 */
(function() {
	var UNDEF,													// undefined constant for comparison functions
		system,													// system singleton definition in this private scope
		
		// CommonJS ID Types
		CJS_TYPE_LOADER = 'loader',
		
	/********************************************************************************************
	* Generic Context implemented as Class														*
	********************************************************************************************/
	ContextClass = {
		/**
		 * The Context Class Constructor
		 * @constructor
		 * @param {cfgObject} cfg The standard cfg object. For this class the following properties are important:
		 */
		constructor: function(cfg) {
			var me = this;
			
			// save the config
			me.cfg = cfg;
			// create a store for all the module subsystems that are to be created in this context
			me.moduleSubs = system.instantiate('Store');
			// create a store for loading resources
			me.loading = system.instantiate('Store');
			
			// generate loaders and the plugins
			me.startupLoader(cfg);
												
			// and create environment hooks
			me.startupCMS(cfg);
			
			// main module given to startup with??
			if (cfg.location && cfg.main) {
				me.provide('commonjs.org', cfg.main, function contextConstructorInitLoadCB(){
					 me.moduleSubs.get('commonjs.org').ms.require(cfg.main);
				})
			}
		},
		
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		/**
		 *
		 * @param {cfgObject} cfg The standard cfg object. This function uses the following properties:
		 * cfg.location
		 * cfg.commonjsAPI
		 * cfg.modules
		 */
		startupCMS: function(cfg){
			var env = cfg.env,
				that = this,
				ms;
			
			// create the Main Module System
			ms = system.instantiate('ModuleSystem', 'commonjs.org');
			// save the main Module System with other system info for later retrieval
			this.moduleSubs.set('commonjs.org', {
				ms: ms,
				uri: cfg.location
			});
			
			// extend cms API
			ms.provide = function ContextProvide(deps, cb){
				that.provide(this.uid, deps, cb);
			};
			
			// add default system modules to the main module system
			this.addSystemModules(ms, cfg.commonjsAPI, cfg.modules);
			
			// create extra module environment require
			env.require = function wrapperRequire(){
				return ms.require.apply(ms, arguments);
			};
		},
		
		/**
		 *
		 */
		addSystemModules: function(ms, commonjsAPI, modules){
			var i, id;
			
			for (i=0; id = commonjsAPI.systemModules[i]; i++){
				ms.memoize(id, modules[id].deps, modules[id].factoryFn);				
			}
		},
		
		/**
		 *
		 */
		startupLoader: function(cfg){
			var modules = cfg.modules,
				commonjsAPI = cfg.commonjsAPI,
				loader; 
			
			loader = modules.execute(commonjsAPI[CJS_TYPE_LOADER]);
			// create the loader from the given CommonJS API modules
			if (!loader || !(loader = loader.create(cfg))) throw new Error("No correct CommonJS Loader Layer declaration!!");
			
			// create loaderbase and add loader
			this.loaderBase = system.instantiate('LoaderBase');
			this.loaderBase.addLoader('http', loader);
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		/**
		 *
		 */
		provide: function(uid, deps, cb){
			var i, dep,
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by calling getMSId
				dep = this.getMSId(uid, dep);
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(dep.uri + dep.id)) && (!dep.ms.isMemoized(dep.id))) {
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
		
		/**
		 *
		 */
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
		
		/**
		 *
		 */
		getMS: function() {
		},
		
		/**
		 *
		 */
		setMS: function() {
		},
		
		/**
		 * Return all the relevant information from a given Module System identified with its uid
		 * @param {string} uid The uid of the Module system information is requested from
		 * @param {dep} dep
		 * @return {object} An object with all relevant Module System information
		 */
		getMSId: function(uid, dep){
			var ms = this.moduleSubs.get(uid);
			return {
				ms: ms.ms,
				uid: uid,
				uri: ms.uri,
				id: dep
			}
		},
		
		/**
		 * Create an API object as defined in the Loader specs
		 * @param {string} mId The standard ModuleID (resolved to the given Module System) to use 
		 * @param {string} ms The module system id this API is requested for
		 * @return {LoaderAPI Object} The API as defined by the Loader specs
		 */
		createAPI: function(mId, ms){
			var ms = this.moduleSubs.get(ms).ms;
			return {
				msuri: ms.uri,
				deps: [],
				memoize: function ContextAPIMemoize(id, deps, factoryFn){
					// no given id then use requested id
					if (id === null) id = mId;
					// no given deps then use empty array
					if (deps === UNDEF) deps = [];
			
					// normalize dependancy ids relative to the module requiring it
					for (var i=0; deps[i]; i++) {
						// resolve given dependency and save for load
						deps[i] = ms.resolveId(id, deps[i]);
						this.deps.push(deps[i]);
					};
					
					// add module to the requesting module system
					ms.memoize(id, deps, factoryFn);
					
				},
				loadReady: function ContextAPILoadReady(cb){
					// Call Core Module System to load the requested modules and if ready call the callback function
					ms.provide(this.deps, cb);
					this.deps = [];					
				}
			};
		}
	};
	
	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	function addClass(sys) {
		system = sys;
		system.addClass('Context', ContextClass);
	};
	
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'Context',
			addClass: addClass	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.addClass = addClass;
})();
