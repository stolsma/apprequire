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
 * and utility code of Ext Core / ExtJS 3.2.1. (copyright Sencha, http://www.sencha.com)
 *
 * For documentation how to use this: http://code.tolsma.net/apprequire
 */
 
/**
 * Closure definition with 'this' refering to 'window' or current scope
 */
(function () {
	var global = this,											// 'window' or current scope
		UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		CMS,													// The Core Module System
		
		//The following are module state constants
		INIT = 'INIT',
		READY = 'READY';
		
	/**
	 * Returns true if the passed value is a JavaScript array, otherwise false.
	 * @param {Mixed} value The value to test
	 * @return {Boolean}
	 */
	function isArray(v){
		var tString = Object.prototype.toString;				// short version of toString for isxxxx functions
		return tString.apply(v) === '[object Array]';
	}
	
	/**
	 * <p>Returns true if the passed value is empty.</p>
	 * <p>The value is deemed to be empty if it is<div class="mdetail-params"><ul>
	 * <li>null</li>
	 * <li>undefined</li>
	 * <li>an empty array</li>
	 * <li>a zero length string (Unless the <tt>allowBlank</tt> parameter is <tt>true</tt>)</li>
	 * </ul></div>
	 * @param {Mixed} value The value to test
	 * @param {Boolean} allowBlank (optional) true to allow empty strings (defaults to false)
	 * @return {Boolean}
	 */
	function isEmpty(v, allowBlank){
		return v === null || v === undefined || ((isArray(v) && !v.length)) || (!allowBlank ? v === '' : false);
	}

	/**
	 * Iterates an array calling the supplied function.
	 * @param {Array/NodeList/Mixed} array The array to be iterated. If this
	 * argument is not really an array, the supplied function is called once.
	 * @param {Function} fn The function to be called with each item. If the
	 * supplied function returns false, iteration stops and this method returns
	 * the current <code>index</code>. This function is called with
	 * the following arguments:
	 * <div class="mdetail-params"><ul>
	 * <li><code>item</code> : <i>Mixed</i>
	 * <div class="sub-desc">The item at the current <code>index</code>
	 * in the passed <code>array</code></div></li>
	 * <li><code>index</code> : <i>Number</i>
	 * <div class="sub-desc">The current index within the array</div></li>
	 * <li><code>allItems</code> : <i>Array</i>
	 * <div class="sub-desc">The <code>array</code> passed as the first
	 * argument to <code>Ext.each</code>.</div></li>
	 * </ul></div>
	 * @param {Object} scope The scope (<code>this</code> reference) in which the specified function is executed.
	 * Defaults to the <code>item</code> at the current <code>index</code>
	 * within the passed <code>array</code>.
	 * @return See description for the fn parameter.
	 */
	function each(array, fn, scope) {
		if (isEmpty(array, true)) {
			return;
		}
		for (var i = 0, len = array.length; i < len; i++) {
			if (fn.call(scope || array[i], array[i], i, array) === false) {
				return i;
			};
		}
	}

	/**
	 * Iterates either the elements in an array, or each of the properties in an object.
	 * <b>Note</b>: If you are only iterating arrays, it is better to call {@link #each}.
	 * @param {Object/Array} object The object or array to be iterated
	 * @param {Function} fn The function to be called for each iteration.
	 * The iteration will stop if the supplied function returns false, or
	 * all array elements / object properties have been covered. The signature
	 * varies depending on the type of object being interated:
	 * <div class="mdetail-params"><ul>
	 * <li>Arrays : <tt>(Object item, Number index, Array allItems)</tt>
	 * <div class="sub-desc">
	 * When iterating an array, the supplied function is called with each item.</div></li>
	 * <li>Objects : <tt>(String key, Object value, Object)</tt>
	 * <div class="sub-desc">
	 * When iterating an object, the supplied function is called with each key-value pair in
	 * the object, and the iterated object</div></li>
	 * </ul></div>
	 * @param {Object} scope The scope (<code>this</code> reference) in which the specified function is executed. Defaults to
	 * the <code>object</code> being iterated.
	 */
	function iterate(obj, fn, scope) {
		if (isEmpty(obj)) {
			return;
		}
		if (isArray(obj) || obj.callee) {
			each(obj, fn, scope);
			return;
		} else if (typeof obj == 'object') {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					if (fn.call(scope || obj, prop, obj[prop], obj) === false) {
						return;
					};
				}
			}
		}
	}
	
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

	/**
	 * Cut the first term from a / delimited string
	 * @param {string} uri The path string to cut the first term off.
	 * @return {string} Path without first term
	 */
	function cutFirstTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(1, uri.length);
		return uri.join("/"); 
	}
	
	/**
	 * Get the first term from a / delimited string and return it
	 * @param {string} uri The path string to cut the first term off.
	 * @return {string} First term
	 */
	function getFirstTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(0);
		return uri[0];
	}
	
	/**
	 * Cut the last term from a URI string
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Path without last term
	 */
	function cutLastTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(0, uri.length-1);
		return uri.join("/"); 
	}
	
	/**
	 * Get the last term from a URI string and return it
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Last term
	 */
	function getLastTerm(uri) {
		uri = uri.split('/');
		uri = uri.slice(uri.length-1);
		return uri[0];
	}
	
	/********************************************************************************************
	* Core Module System implemented as Singleton												*
	********************************************************************************************/

	CMS = function(){
		var modules = {},						// The modules store
			mappings = {};						// The mappings store
			
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
		*	mappings store functions													*
		\*******************************************************************************/	
		/**
		 * Get the requested mapping URI
		 * @param {string} id Id of the mapping URI to return.
		 * @return {URI} Requested mapping URI or undef if not there
		 */
		function getMapping(id) {
			// prepend with constant to circumvent standard Object properties
			if ((id.length>0) && (id.charAt(id.length-1) !== '/')) id = id + '/';
			return mappings[objEscStr + id];
		}
		
		/**
		 * Set the requested mapping in the mapping list
		 * @param {string} id Id of the mapping to save.
		 * @param {URI} value The URI value.
		 * @return {URI} The set URI value
		 */
		function setMapping(id, value) {
			// prepend with constant to circumvent standard Object properties
			if ((id.length>0) && (id.charAt(id.length-1) !== '/')) id = id + '/';
			return mappings[objEscStr + id] = value;
		}
		
		/**
		 * Resolve from an id the root URI via mappings tree. Recursive function!! 
		 * @param {string} id Canonicalized id 
		 * @return object Object with URI and cut back id
		 */	
		function getURIid(id, mapped) {
			// initialize recursion..
			if (!mapped) mapped='';
			
			// look if next added term is a mapping
			if (getMapping(mapped + getFirstTerm(id) + '/')) {
				mapped = mapped + getFirstTerm(id) + '/';
				id = cutFirstTerm(id);
				return getURIid(id, mapped);
			}
			
			// return the result 
			return {
				URI: getMapping(mapped) + id,
				id: id
			};
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
					modules: modules,
					mappings: mappings
				}
			},
			
			/**
			 * Get the requested module
			 * @param {string} id The canonicalized id of the module exports to return.
			 * @return {exports} Requested module exports or undef if not there
			 */
			requireModule: function(id) {
			},
			
			/**
			 * create a module in the modules list
			 * @param {string} id The fully canonicalized id of the module.
			 * @param {array} deps Array of fully canonicalized dependency id's.
			 * @param {function} factoryFn The factory function of the module.
			 * @return {bool} True if ok, false if failure
			 */
			memoize: function(id, deps, factoryFn) {
				// replace mapping part with the root uri and module id
				var URIid = getURIid(id).URI;
				
				// if not possible to create reference return false
				if (!URIid) return false;
				
				// create Module Instance and save in module store if not already exists
				if (!existModule(URIid)) setModule(URIid, new Module(id, deps, factoryFn, URIid));
				
				// all ok
				return true;
			},
			
			addMapping: function(id, URI){
				setMapping(id, URI);
			},
			
			/**
			 * ensure function
			 * @param {array] deps Modules that need to be INIT state before cb is called
			 * @param {function} cb Callback function called when all deps are in INIT state
			 */
			ensure: function(deps, cb){
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
	function Module(id, deps, factoryFn, uri) {
		this.id = id;																// The fully resolved id of this module in this package
		this.deps = deps;															// The module dependencies (full canonilized id's)
		this.factoryFn = factoryFn;													// Factory Function
		this.uri = uri;																// location of this module
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
			// normalize id if not empty
			id = (id === '') ? id : this.resolveId(id);
			
			// get requested module
			var mod = CMS.requireModule(id);
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
			CMS.ensure(ldeps, cb)
			
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
					id: this.id,
					uri: this.uri
				}
			}
			return this.module;
		}
	};
	
	/********************************************************************************************
	* Environment Initialization																*
	********************************************************************************************/

    /**
	 * Check for an existing version of a module object. If that does not exists then define
	 * a new 'global' module object. After that use the module object to set my own init function.  
	 */
	if (!global.module) {
		global.module = {
			api: CMS.api()
		};
	} else global.module.api = CMS.api();
	
}).call(typeof window === 'undefined' ? this : window); // take care that 'this' is 'window' and else the current 'this' scope...

