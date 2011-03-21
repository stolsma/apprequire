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