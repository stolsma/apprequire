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
	
	/**
	 * @class ModuleSystem
	 * Default CommonJS Module System definition.
	 */
	ModuleSystem = {
		/**
		 * Store of the defined modules for this Module System
		 * @property store
		 * @type Store
		 */
		/**
		 * Module System class definition
		 * @constructor
		 * @param {System} sys The CommonJS System this ModuleSystem is working in.
		 * @param {cfgObject} cfg The standard cfg object.
		 */
		constructor: function(sys, cfg) {
			var me = this;
			
			// save the system we depend on
			me.system = sys; 
			// Classname for modules
			me.mClass = cfg.system.module;
			// create the module store for this module system
			me.store = me.system.instantiate(cfg.system.store, sys);
		},

		/**
		 * API hook to get the requested module
		 * @param {string} id The module system top level id of the module exports to return.
		 * @return {exports} Requested module exports or undef if not there
		 */
		require: function MSRequire(id){
			var mod;
			// exists this module in this system?
			if (mod = this.store.get(id)) {
				return mod.createModule();
			} 
			
			// return undefined because maybe in another system ??
			return UNDEF;
		},
		
		/**
		 * API hook to create a module in this Module System
		 * @param {string} id The full top level id of the module in this module system.
		 * @param {array} deps Array of full top level dependency id's in this module system.
		 * @param {function} factoryFn The factory function of the module.
		 * @return {bool} True if ok, false if module already exists
		 */
		memoize: function MSMemoize(id, deps, factoryFn){
			// create Module Instance and save in module store if not already exists
			if (!this.store.exist(id)) {
				this.store.set(id, this.system.instantiate(this.mClass, this.system, id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		/**
		 * API hook to check if a module exists in this system
		 * @param {string} id The full top level id of the module in this module system.
		 * @return {bool} True if module with id exists, false if module with id doesn't exists
		 */
		isMemoized: function MSIsMemoized(id){
			return this.store.exist(id);
		},
		
		/**
		 * API hook to provide not available modules in this system
		 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
		 * @param {function} cb Callback function called when all given deps are in INIT state
		 */
		provide: function MSProvide(deps, cb){
			// return nothing done = false
			return false;
		},
		
		/**
		 * API hook to return the exports of the main module of the Main Module System
		 * @param {string} id The full top level id of the module who wants to know its context main module exports
		 * @return {exports} The exports of the context main module 
		 */
		getMain: function MSGetMain(id){
			// if not overridden then the module with id=='' is the main module, so get its exports
			return this.require('');
		},

		/**
		 * API hook to return a Context wide canonical module id
		 * @param {string} id The full top level id for which the Context wide canonical id is requested   
		 * @return {string} The Context wide canonical id version of the given id
		 */
		id: function MSId(id){
			// if not overridden this system IS the context so just return this given full top level id
			return id;
		},
		
		/**
		 * Resolve the given relative id to the current id or if not relative just give it back
		 * @param {string} curId The full module id to resolve from
		 * @param {string} id The id to resolve
		 * @return {string} resolved and sanatized id.
		 */
		resolveId: function MSResolveId(curId, id) {
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
	};

	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'ModuleSystem',
			ModuleSystem: ModuleSystem	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.ModuleSystem = ModuleSystem;
})();
