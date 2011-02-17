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
// Check for an existing version of an exports object. If that does not exists then define a new exports reference.
var exports;
if (typeof exports === "undefined")
	exports = {};

// create the api namespace if not already available
if (typeof exports.api === "undefined")
	exports.api = {};

// define the Generic Loader System API
exports.api.loader['generic'] = function(){
	var UNDEF;													// undefined constant for comparison functions
	
	function Loader(api, debug) {
		this.api = api;
		this.debug = debug;
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
	
	// return the Core Module System API
	return function(api, debug) { 
		return new Loader(api, debug);
	}
}();