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
 * @author Sander Tolsma <code@tolsma.net>
 * @docauthor Sander Tolsma <code@tolsma.net>
 */
(function() {
	var UNDEF,													// undefined constant for comparison functions
		system,													// system singleton definition in this private scope
		
	/**
	 * @class Context
	 * Default CommonJS Context environment definition.
	 */
	ContextClass = {
		/**
		 * The Context Class Constructor
		 * @constructor
		 * @param {cfgObject} cfg The standard cfg object.
		 * @param {Array} modules Array of standard modules to add to the Core Module System
		 */
		constructor: function(cfg, modules) {
			var me = this,
				cfgSystem = cfg.system;
			
			// save the config
			me.cfg = cfg;
			me.env = cfg.env;
			me.msClass = cfgSystem.moduleSystem;
			me.storeClass = cfgSystem.store;
			
			// create a store for loading resources
			me.loading = system.instantiate(me.storeClass);
			
			// create core module system
			me.startupCMS(modules);
		},
		
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		/**
		 * Creates the core module system, adds the given standard modules and installs the loaders for the CMS
		 * @param {Array} modules Array of standard modules to add to the main Module System
		 */
		startupCMS: function(modules) {
			var me = this,
				ms;
			
			// TODO Check if cfg.location is there else throw with error ??
			// create the Main Module System
			ms = system.instantiate(me.msClass, me.cfg);
			// save the main Module System with other system info for later retrieval
			me.setMS(ms, me.cfg.location);
			// extend Main Module System API
			ms.provide = function ContextProvide(deps, cb) {
				me.provide(me.getMS(), deps, cb);
			};
			// add default system modules to the main module system
			me.addSystemModules(ms, modules);
			
			// generate loaders and the plugins
			me.startupLoaders(ms, this.cfg.loaders);
												
			// create extra module environment require
			me.env.require = function wrapperRequire(){
				return ms.require.apply(ms, arguments);
			};
			// create extra module environment module.provide
			me.env.module.provide = function wrapperProvide(deps, cb){
				ms.provide(deps, cb);
			};
			
			// main module given to startup with??
			if (me.cfg.main) {
				ms.provide(me.cfg.main, function contextConstructorInitLoadCB(){
					 ms.require(me.cfg.main);
				})
			}
		},
		
		/**
		 * Add an array of module definitions to the given Module System
		 * @param {ModuleSystem} ms the Module System to add the modules to
		 * @param {Array} modules Array of modules to add to the Module System
		 */
		addSystemModules: function(ms, modules){
			var mod;
			for (mod in modules){
				ms.memoize(mod, modules[mod].deps, modules[mod].factoryFn);				
			}
		},
		
		/**
		 * From an array of loader definitions create loaders and add to the given Module System
		 * @param {ModuleSystem} ms the Module System to add the loaders to
		 * @param {Array} modules Array of loader definitions to add to the Module System
		 */
		startupLoaders: function(ms, loaders){
			var base, loader, loaderMod, i;
			// create interface layer to keep track of multiple loaders
			base = this.loaderBase = system.instantiate(this.cfg.system.loaderBase);
			// add the defined loaders
			for (i=0; loader = loaders[i]; i++) {
				// create loaderbase and add loader
				loaderMod = ms.require(loader.loader);
				base.addLoader(loader.type, loaderMod.create(this.cfg, loader.plugins));
			}
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		/**
		 * First load all dependencies if not available in given Module System and then call the given callback function
		 * @param {Module System Descriptor Object} The Module System Descriptor Object of the Module System the dependencies are asked for
		 * @param {Array/String} deps String or Array of Strings of dependency module IDs
		 * @param {Function} cb Callback function to call when dependencies are loaded
		 */
		provide: function(msDescr, deps, cb){
			var i, dep, depDescr
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies and if needed create dependency descriptor
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by cloning
				depDescr = system.getUtils().clone(msDescr);
				// create url from uri and dependency id
				depDescr.url = depDescr.uri + dep;
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(depDescr.url)) && (!depDescr.ms.isMemoized(dep))) {
					// create module system specific Loader API
					depDescr.api = this.createAPI(dep, depDescr);
					// add to loading list
					this.loading.set(depDescr.url, depDescr);
					// add normalized dependency to resource list
					resources.push(depDescr);
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
		 * Returns Function called when one resource of the resourcelist created by provide is loaded. 
		 * When all resources are loaded the Callback function will be called
		 * @param {Array} resources Array of resource objects that are going to be loaded
		 * @param {Function} cb Callback function to call when resources are loaded
		 * @return {Function} Resource check callback function which accepts the resource object of the resource loaded and 
		 * an array of arguments for the callback function
		 */
		provideCallback: function(resources, cb){
			var i, res, 
				that = this,
				reslist = [];
				
			// generate fresh resourcelist	
			for (i=0; res = resources[i]; i++){
				reslist.push(res.url)
			}
			// return callback function
			return function contextProvideCallback(resource, args){
				var i, res;
				
				// ready loading this resource so remove from context global loading list
				that.loading.remove(resource.url);
				
				// check if all given resources are recursively loaded
				for (i=0; res = reslist[i]; i++){
					if (res == resource.url)
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
		 * Gets module system descriptor for this context, can be overridden in later child classes to extend with packages 
		 * @return {Module System Descriptor Object} The retrieved Module System Descriptor Object
		 */
		getMS: function() {
			return this.ms;
		},
		
		/**
		 * Save the given module system in this context as a module system descriptor, can be overridden in later child classes to extend with packages
		 * @param {ModuleSystem} ms The module system object to set
		 * @param {String} uri The location of the modules of this Module System
		 * @return {Module System Descriptor Object} The created Module System Descriptor Object
		 */
		setMS: function(ms, uri) {
			return this.ms = {
				ms: ms,
				uri: uri
			};
		},
		
		/**
		 * Create an API object as defined in the Loader specs
		 * @param {string} mId The standard ModuleID (resolved to the given Module System) to use 
		 * @param {Module System Descriptor Object} msDescriptor The module system descriptor this API is requested for
		 * @return {LoaderAPI Object} The API as defined by the Loader specs
		 */
		createAPI: function(mId, msDescriptor){
			var ms = msDescriptor.ms;
			return {
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
