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
								
			console.log('(moduleTransport.LoadReady) uri: ' + uri);
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
			console.log('(moduleTransport.LoadReady return) uri: ' + uri);
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