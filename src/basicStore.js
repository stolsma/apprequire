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
		objEscStr = '_',										// Object property escape string

	/********************************************************************************************
	* Generic Store implemented as Class														*
	********************************************************************************************/
	StoreClass = {
		/**
		 * Constructor
		 */
		constructor: function() {
			this.store = {};										// initialize store
		},
	
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
	};
	
	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	function addClass(sys) {
		system = sys;
		system.addClass('Store', StoreClass);
	};
	
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'Store',
			addClass: addClass	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.addClass = addClass;
})();
