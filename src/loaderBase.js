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
		
	/********************************************************************************************
	* Generic Loader implemented as Class														*
	********************************************************************************************/
	LoaderBaseClass = {
		/**
		 * Constructor
		 */
		constructor: function() {
			/**
			 * The store with the defined scheme / SpecificLoader combinations
			 */
			this.loaders = system.instantiate('Store');
		},
		
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
				loader.load(res.url, res.api, this.createLoadedCb(res, cb));
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
	};
	
	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	function addClass(sys) {
		system = sys;
		system.addClass('LoaderBase', LoaderBaseClass);
	};
	
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'LoaderBase',
			addClass: addClass	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.addClass = addClass;
})();
