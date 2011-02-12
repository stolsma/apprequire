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
 * Core Module Layer API definition
 */
// Check for an existing version of a module object. If that does not exists then define a new module reference.
if (typeof this.window == "undefined" || ""+this.window == "undefined") {
	// We are running on a server 
	// todo: define module in server environment
} else {
	// We are most likely running in a browser
	if (!window.module) window.module = {};
}

// define the Core Module Layer API
module.api = function(){
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		CMS,													// The Core Module System
		rootURIDelimiter = '#',									// The system root module id delimiter
		
		//The following are module state constants
		INIT = 'INIT',
		READY = 'READY';
		
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
	* Core Module System implemented as Singleton												*
	********************************************************************************************/
	CMS = function(){
		var modules = {};						// The modules store
			
		/*******************************************************************************\
		*	modules store functions														*
		\*******************************************************************************/	
		/**
		 * Get the requested module
		 * @param {string} id The fully resolved id of the module to return.
		 * @return {Module} Requested module or undef if not there
		 */
		function getModule(id) {
			// prepend with constant to circumvent standard Object properties
			return modules[objEscStr + id];
		}
		
		/**
		 * Set the requested module in the modules list
		 * @param {string} id The fully resolved id of the module to save.
		 * @param {Module} value The module.
		 * @return {Module} The set module
		 */
		function setModule(id, value) {
			// prepend with constant to circumvent standard Object properties
			return modules[objEscStr + id] = value;
		}
		
		/**
		 * Check if the requested module already exists in the modules list
		 * @param {string} id The fully resolved id of the module to save.
		 * @return {bool} True when module exists, false if not
		 */
		function existModule(id) {
			return (modules[objEscStr + id] !== UNDEF);
		}
		
		/*******************************************************************************\
		*	CMS API functions															*
		\*******************************************************************************/	
		return {
			/**
			 * Return the public API of the Core Module System
			 */
			api: function(){
				return {
					cms: CMS,
					modules: modules
				}
			},
			
			/**
			 * Get the requested module
			 * @param {string} id The canonicalized id of the module exports to return.
			 * @return {exports} Requested module exports or undef if not there
			 */
			requireModule: function(rootURI, id) {
			},
			
			/**
			 * create a module in the modules list
			 * @param {string} rootURI The URI of the module system root.
			 * @param {string} id The fully top level id of the module in the module system.
			 * @param {array} deps Array of fully top level dependency id's in the module system.
			 * @param {function} factoryFn The factory function of the module.
			 * @param {string} URL The URL (module location) of the module.
			 * @return {bool} True if ok, false if module already exists
			 */
			memoize: function(rootURI, id, deps, factoryFn, URL) {
				// create module identifier
				var modId = rootURI + id;
				
				// create Module Instance and save in module store if not already exists
				if (!existModule(modId)) {
					setModule(modId, new Module(rootURI, id, deps, factoryFn, URL));
					return true;
				}
				
				// Module already exists
				return false;
			},
			
			/**
			 * ensure function
			 * @param {array] deps Modules that need to be INIT state before cb is called
			 * @param {function} cb Callback function called when all deps are in INIT state
			 */
			ensure: function(rootURI, deps, cb){
				// check which deps are alrady in INIT or READY state
				
				// get the not available dep modules and give the callback function
			},
			
			/**
			 * return the exports of the main module of the root system
			 * @param {string} id The canonicalized id of the module who wants to know its main  
			 */
			getMain: function(id){
				return { empty: 'need to filled with exports of main module'}
			}
		}
	}()

	/********************************************************************************************
	* Generic Module System implemented as Module Class											*
	********************************************************************************************/
	/**
	 * Module class definition
	 * @param {string} id The global id of this Module
	 */
	function Module(rootURI, id, deps, factoryFn, URL) {
		this.rootURI = rootURI;														// The root Identifier URI
		this.id = id;																// The fully resolved id of this module in this package
		this.deps = deps;															// The module dependencies (full canonilized id's)
		this.factoryFn = factoryFn;													// Factory Function
		this.URL = URL;																// location of this module
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
			var rootURI = this.rootURI;
			
			// if rootURIDelimiter in id then dont need to resolve
			if (id.indexOf(rootURIDelimiter) === -1) {
				// normalize id if not empty
				id = (id === '') ? id : this.resolveId(id);
			} else {
				// split rootURI from id
				rootURI = id.substring(0, id.indexOf(rootURIDelimiter));
				id = id.substring(id.indexOf(rootURIDelimiter)+1);
			}
			
			// get requested module
			var mod = CMS.requireModule(rootURI, id);
			if (!mod) {
				// module doesn't exist so throw error
				throw "Module: " + id + " doesn't exist!!";
			} else if (!mod.createModule()) {
				// module exists but can't be initialized
				throw "Module: " + id + " can't be initialized!!";
			}		
			
			// just a normal require call and return exports of requested module 
			return mod.exports;
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
			CMS.ensure(this.rootURI, ldeps, cb)
			
			// return undefined at this moment, standard is not clear about this.
			return UNDEF;
		},
		
		/**
		 * Resolve the given relative id to the current id or if not relative only sanatize it
		 * @param {string} id The id to resolve
		 * @return {string} resolved and sanatized id.
		 */
		resolveId: function(id) {
		},
		
		/**
		 * Initialize Module.exports by calling creatorFn
		 * @return {Module} The ready module, null if factory call not possibele yet
		 */
		createModule: function() {
			if (this.state === INIT) {
				// need reference to require function
				// need reference to exports
				// need reference to module object with id and uri of this module
				// do mixin of result and this.exports
				this.setState(READY);		// set to true before initialization call because module can request itself.. (circular dep problems) 
				mixin(this.exports, this.factoryFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
			}
			
			// if READY then return this module else return null 
			return (this.state === READY) ? this : null;
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
			
			// add a reference to the main module for this id
			reqFunction.main = CMS.getMain(that.id);
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
					id: this.rootURI + rootURIDelimiter + this.id,
					url: this.URL
				}
			}
			return this.module;
		}
	};
	
	// return the Core Module Layer API
	return CMS.api();
}();
