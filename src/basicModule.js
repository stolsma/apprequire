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

		//The following are module state constants
		INIT = 'INIT',
		READY = 'READY',
		
	/********************************************************************************************
	* Generic Module implemented as Module Class												*
	********************************************************************************************/
	ModuleClass = {
		/**
		 * Module class definition
		 * @param {string} id The global id of this Module
		 */
		constructor: function(id, deps, factoryFn, ms) {
			this.id = id;																// The full top level id of this module in this system
			this.deps = deps;															// The module dependencies (The full top level id's)
			this.factoryFn = factoryFn;													// Factory Function
			this.ms = ms;																// The module system this module is defined in
			
			this.exports = {};															// The exports object for this module
			this.module = null;															// The module variable for the factory function
			
			this.state = INIT;															// Module instance is in INIT state.
		},
	
		/**
		 * Local require function
		 * @param {string} id
		 */
		require: function(id) {
			// resolve id to current environment
			id = (id === '') ? id : this.ms.resolveId(this.id, id);
			
			// get requested module exports
			var exports = this.ms.require(id);
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
				lDeps.push(this.ms.resolveId(this.id, deps[i]));
			};
			
			// Call Core Module System to load the requested modules and if ready call the callback function
			this.ms.provide(lDeps, cb)
			
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
				system.getUtils().mixin(this.exports, this.factoryFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
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
					id: this.ms.id(this.id),
				}
			}
			// return the module
			return this.module;
		}
	};
	
	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	function addClass(sys) {
		system = sys;
		system.addClass('Module', ModuleClass);
	};
	
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'Module',
			addClass: addClass	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.addClass = addClass;
})();
