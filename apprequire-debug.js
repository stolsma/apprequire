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
 
// define require, exports, module and window
var require, exports, module, window;

// define the Bootstrap System as a self starting function closure
(function(env) {
	var UNDEF,													// undefined constant for comparison functions
		
		// default context config
		defaultcfg = {
			directories: {
				lib: './lib'
			},
			location: './',
			commonjsAPI: {},
			modules: {},
			debug: true,
			timeout: 6000,
			baseUrlMatch: /apprequire/i
		},
					
		// default commonjs API:
		commonjsAPI = {
			loader: "scriptLoader",
			loaderPlugins: [
				"moduleTransport"
			],
			systemModules: [
				"system",
				"test"
			]
		},
		system;
		
	/********************************************************************************************
	* Utility functions																			*
	********************************************************************************************/
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
	 * Returns true if the passed value is a JavaScript Array, false otherwise.
	 * @param {Mixed} target The target to test
	 * @return {Boolean}
	 */
	function isArray(value) {
		return Object.prototype.toString.apply(value) === '[object Array]';
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
	
	/********************************************************************************************
	* Specific Browser Bootstrap code															*
	********************************************************************************************/
	/**
	 * Get specific first context configuration from the script element
	 * @param {document} document Reference to window.document in a browser environment.
	 * @param {string} baseUrlMatch RegExp definition to find this scriptfile.
	 * @return {object} Object with defined context configuration parsed from the scripts context attribute
	 */
	function getContextConfig(document, baseUrlMatch){
		var scriptList,	script,	src, i, result;

		// Get list of all <script> tags to check
		scriptList = document.getElementsByTagName("script");
		//Figure out if there is a 'context' attribute value. Get it from the script tag with cfg.baseUrlMatch as regexp.
		for (i = scriptList.length - 1; i > -1 && (script = scriptList[i]); i--) {
			//Using .src instead of getAttribute to get an absolute URL.
			src = script.src;
			if (src) {
				if (src.match(baseUrlMatch)) {
					//Look for a context attribute to configure the first context.
					result = script.getAttribute('data-context');
					break;
				}
			}
		}
		
		// parse result if there is a result
		if (result){
			if (JSON)
				// Standaard JSON functions available? then use them
				result = JSON.parse(result);
			else
				// no JSON functions available then use RFC recommended eval
				result = !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(result.replace(/"(\\.|[^"\\])*"/g, ''))) && eval('(' + result + ')');
		}
		return result;
	}

	/**
	 * Checks if all the required CommonJS system API modules are loaded
	 * @param {object} api Object with the config.commonjsAPI information.
	 * @param {object} modules Object with the loaded CommonJS System modules.
	 * @return {bool} True when all required modules are loaded false if not
	 */
	function bootstrapReady(api, modules){
		for (var prop in api) {
			if (isArray(api[prop])) {
				if (!bootstrapReady(api[prop], modules))
					// nope one of the deep modules is not declared yet
					return false;
			} else if (!(api[prop] in modules)) 
				// nope this system modules is not declared yet 
				return false;
		}
		// all required system modules are loaded
		return true;
	}

	/**
	 * Handles CommonJS system API module adding to the environment, only available in bootstrap phase.
	 * Bootstrap phase is followed by Extra Module Environment Phase (EME Phase). Changeover to EME phase is 
	 * accomplished when all modules defined in CommonjsAPI are 'loaded' via module.declare   
	 * @param {array} dep Object with the modules dependency list.
	 * @param {function} factoryFn Function to define the exports of this module.
	 * @param {object} contextCfg Object with the configuration for the context to create.
	 */
	function addModule(id, dep, factoryFn, contextCfg){
		var modules = contextCfg.modules,
			commonjsAPI = contextCfg.commonjsAPI,
			context;
		
		if ((typeof id == 'string') && (id !== UNDEF)) {
			// save this api information
			modules[id] = {
				dep: dep,
				factoryFn: factoryFn
			};
			// check if all modules are now loaded. If true then startup first context
			if (bootstrapReady(commonjsAPI, modules)){
				// delete declare and addClass because only in use for bootstrap...
				delete contextCfg.env.module.declare;
				delete contextCfg.env.module.addClass;

				// create context with current cfg, and the System Module list.
				context = system.instantiate('Context', contextCfg);
				
				// debug info ??
				if (contextCfg.debug) {
					contextCfg.env.module.debug = {
						system: system,
						context: context,
						cfg: contextCfg
					}
				}
			}
		} else {
		// non CommonJS system API module is declared, throw error
			throw new Error("Invalid bootstrap module declaration!!");
		}
	}
	
	function bootExtraModuleEnvironment(contextCfg){
		contextCfg.modules.execute = function(id){
			var exports = {};
			// if this module exists then execute factoryFn
			if (this[id]) {
				mixin(exports, this[id].factoryFn.call(null, null, exports, null));
				return exports;
			} else 
				throw new Error('(bootstrap.modules.execute) Module for given id doesnt exists!');
			// return nothing
			return UNDEF;
		};
		contextCfg.env.module = {
			declare: function(id, deb, factoryFn){
				addModule(id, deb, factoryFn, contextCfg);
			},
			addClass: function(cls){
				if (cls.name == 'System')
					system = cls.system;
				else
					cls.addClass(system);
			}
		};
	}
	
	/********************************************************************************************
	* First boot code																			*
	********************************************************************************************/
	
	function setupConfig(env, cfg){
		// check if environment is defined else throw
		if (env === UNDEF) 
			throw new Error("Invalid environment in setupConfig bootstrap! ");
			
		// mix defaultcfg with cfg
		mixin(cfg, defaultcfg);
				
		// then get possible script attribute configuration option if in browser env. Those have preference!!!
		if (env.document !== UNDEF) 
			mixin(cfg, getContextConfig(env.document, cfg.baseUrlMatch), true);
		
		// create location propertie if not already defined	
		mixin(cfg, {
			location: ''
		});
	
		// previous configuration has preference over environment location.href
		if (cfg.location == '')
			cfg.location = cutLastTerm(env.location.href);
		
		// mixin not defined framework standard CommonJS Framework Systems
		mixin(cfg.commonjsAPI, commonjsAPI);
		
		// and return config
		return cfg;
	}
	
	/********************************************************************************************
	* Bootstrap startup																			*
	********************************************************************************************/
	/**
	 * Boot the whole commonjs extr amodule environment depending on given options. 
	 * @param {object} env Description of the current environment
	 */
	bootExtraModuleEnvironment(setupConfig(env, {env: env}));
	
	// end of selfstarting bootstrap closure
})(window);

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
		objEscStr = '_',										// Object property escape string
		Base,													// Base class... All other classes created with system functions inherit from this class
		system = {},											// system singleton definition in this private scope
		objectPrototype = Object.prototype,
		enumerables = true,
		enumerablesTest = { toString: 1 },
		i;
		
	/********************************************************************************************
	* System Singleton methods definition and system env sniffing								*
	********************************************************************************************/
	for (i in enumerablesTest) {
		enumerables = null;
	}

	if (enumerables) {
		enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable',
					   'toLocaleString', 'toString', 'constructor'];
	}

	/**
	 * @class System
	 * AppRequire core utilities and functions.
	 * @singleton
	 */
	/**
	 * Put it into system namespace so that we can reuse outside this
	 * @type Array
	 */
	system.enumerables = enumerables;
		
	/**
	 * Copies all the properties of config to the specified object.
	 * IMPORTANT: Note that it doesn't take care of recursive merging and cloning without referencing the original objects / arrays
	 * Use system.merge instead if you need that.
	 * @param {Object} object The receiver of the properties
	 * @param {Object} config The source of the properties
	 * @param {Object} defaults A different object that will also be applied for default values
	 * @return {Object} returns obj
	 */
	system.apply = function(object, config, defaults) {
		if (defaults) {
			system.apply(object, defaults);
		}

		if (object && config && typeof config === 'object') {
			var i, j, k;

			for (i in config) {
				object[i] = config[i];
			}

			if (enumerables) {
				for (j = enumerables.length; j--;) {
					k = enumerables[j];
					if (config.hasOwnProperty(k)) {
						object[k] = config[k];
					}
				}
			}
		}
		return object;
	};

	/**
	 * A full set of static methods to do type checking
	 * @ignore
	 */
	system.apply(system, {
		/**
		 * Returns true if the passed value is empty. The value is deemed to be empty if it is:
		 * <ul>
		 * <li>null</li>
		 * <li>undefined</li>
		 * <li>an empty array</li>
		 * <li>a zero length string (Unless the <tt>allowBlank</tt> parameter is <tt>true</tt>)</li>
		 * </ul>
		 * @param {Mixed} value The value to test
		 * @param {Boolean} allowBlank (optional) true to allow empty strings (defaults to false)
		 * @return {Boolean}
		 */
		isEmpty: function(value, allowBlank) {
			return (value === null) || (value === undefined) || ((system.isArray(value) && !value.length)) || (!allowBlank ? value === '' : false);
		},

		/**
		 * Returns true if the passed value is a JavaScript Array, false otherwise.
		 * @param {Mixed} target The target to test
		 * @return {Boolean}
		 */
		isArray: function(value) {
			return objectPrototype.toString.apply(value) === '[object Array]';
		},

		/**
		 * Returns true if the passed value is a JavaScript Date object, false otherwise.
		 * @param {Object} object The object to test
		 * @return {Boolean}
		 */
		isDate: function(value) {
			return objectPrototype.toString.apply(value) === '[object Date]';
		},

		/**
		 * Returns true if the passed value is a JavaScript Object, false otherwise.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isObject: function(value) {
			return !!value && !value.tagName && objectPrototype.toString.call(value) === '[object Object]';
		},

		/**
		 * Returns true if the passed value is a JavaScript 'primitive', a string, number or boolean.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isPrimitive: function(value) {
			return system.isString(value) || system.isNumber(value) || system.isBoolean(value);
		},

		/**
		 * Returns true if the passed value is a JavaScript Function, false otherwise.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isFunction: function(value) {
			return objectPrototype.toString.apply(value) === '[object Function]';
		},

		/**
		 * Returns true if the passed value is a number. Returns false for non-finite numbers.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isNumber: function(value) {
			return objectPrototype.toString.apply(value) === '[object Number]' && isFinite(value);
		},

		/**
		 * Validates that a value is numeric.
		 * @param {Mixed} value Examples: 1, '1', '2.34'
		 * @return {Boolean} True if numeric, false otherwise
		 */
		isNumeric: function(value) {
			return !isNaN(parseFloat(value)) && isFinite(value);
		},

		/**
		 * Returns true if the passed value is a string.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isString: function(value) {
			return typeof value === 'string';
		},

		/**
		 * Returns true if the passed value is a boolean.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isBoolean: function(value) {
			return objectPrototype.toString.apply(value) === '[object Boolean]';
		},

		/**
		 * Returns true if the passed value is an HTMLElement
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isElement: function(value) {
			return value ? !! value.tagName : false;
		},

		/**
		 * Returns true if the passed value is defined.
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isDefined: function(value) {
			return typeof value !== 'undefined';
		},

		/**
		 * Returns true if the passed value is iterable, false otherwise
		 * @param {Mixed} value The value to test
		 * @return {Boolean}
		 */
		isIterable: function(value) {
			if (!value) {
				return false;
			}
			//check for array or arguments
			if (system.isArray(value) || value.callee) {
				return true;
			}
			//check for node list type
			if (/NodeList|HTMLCollection/.test(objectPrototype.toString.call(value))) {
				return true;
			}

			//NodeList has an item and length property
			//IXMLDOMNodeList has nextNode method, needs to be checked first.
			return ((typeof value.nextNode !== 'undefined' || value.item) && system.isNumber(value.length)) || false;
		}
	});
	
	/**
	 * A full set of static methods to do variable handling
	 * @ignore
	 */
	system.apply(system, {
		/**
		 * Clone almost any type of variable including array, object and Date without keeping the old reference
		 * @param {Mixed} item The variable to clone
		 * @return {Mixed} clone
		 */
		clone: function(item) {
			if (!item) {
				return item;
			}

			// Date
			if (item instanceof Date) {
				return new Date(item.getTime());
			}

			var i, j, k, clone, key;

			// Array
			if (system.isArray(item)) {
				i = item.length;

				clone = new Array(i);

				while (i--) {
					clone[i] = system.clone(item[i]);
				}
			}
			// Object
			else if (system.isObject(item) && item.constructor === Object) {
				clone = {};

				for (key in item) {
					clone[key] = system.clone(item[key]);
				}

				if (enumerables) {
					for (j = enumerables.length; j--;) {
						k = enumerables[j];
						clone[k] = item[k];
					}
				}
			}

			return clone || item;
		},
		
		/**
		 * Merges any number of objects recursively without referencing them or their children.
		 * @param {Object} source,...
		 * @return {Object} merged The object that is created as a result of merging all the objects passed in.
		 */
		merge: function(source, key, value) {
			if (system.isString(key)) {
				if (system.isObject(value) && system.isObject(source[key])) {
					if (value.constructor === Object) {
						system.merge(source[key], value);
					} else {
						source[key] = value;
					}
				}
				else if (system.isObject(value) && value.constructor !== Object){
					source[key] = value;
				}
				else {
					source[key] = system.clone(value);
				}
	
				return source;
			}
	
			var i = 1,
				len = arguments.length,
				obj, prop;
	
			for (; i < len; i++) {
				obj = arguments[i];
				for (prop in obj) {
					if (obj.hasOwnProperty(prop)) {
						system.merge(source, prop, obj[prop]);
					}
				}
			}
	
			return source;
		},
		
		/**
		 * Simple function to mix in properties from source into target,
		 * but only if target does not already have a property of the same name.
		 * @param {object} target
		 * @param {object} source
		 * @param {bool} force (optional) Force addition from source to target
		 */
		mixin: function(target, source, force) {
			for (var prop in source) {
				if (!(prop in target) || force) {
					target[prop] = source[prop];
				}
			}
		},
		
		/**
		 * Converts any iterable (numeric indices and a length property) into a true array
		 * Don't use this on strings. IE doesn't support "abc"[0] which this implementation depends on.
		 * For strings, use this instead: <code>"abc".match(/./g) => [a,b,c];</code>
		 * @param {Iterable} array the iterable object to be turned into a true Array.
		 * @param {Number} start a number that specifies where to start the selection.
		 * @param {Number} end a number that specifies where to end the selection.
		 * @return {Array} array
		 */
		toArray: function(array, start, end) {
			return Array.prototype.slice.call(array, start || 0, end || array.length);
		},

		/**
		 * Converts a value to an array if it's not already an array. Note that `undefined` and `null` are ignored.
		 * @param {Array/Mixed} value The value to convert to an array if it is defined and not already an array.
		 * @return {Array} array
		 */
		from: function(value) {
			if (system.isIterable(value)) {
				return system.toArray(value);
			}

			if (system.isDefined(value) && value !== null) {
				return [value];
			}

			return [];
		},
		
		/**
		 * It acts as a wrapper around another method which originally accepts 2 arguments 
		 * for <code>name</code> and <code>value</code>.
		 * The wrapped function then allows "flexible" value setting of either:
		 *
		 * <ul>
		 *      <li><code>name</code> and <code>value</code> as 2 arguments</li>
		 *      <li>one single object argument with multiple key - value pairs</li>
		 * </ul>
		 *
		 * For example:
		 * <pre><code>
	var setValue = Ext.Function.flexSetter(function(name, value) {
		this[name] = value;
	});
	
	// Afterwards
	// Setting a single name - value
	setValue('name1', 'value1');
	
	// Settings multiple name - value pairs
	setValue({
		name1: 'value1',
		name2: 'value2',
		name3: 'value3'
	});
		 * </code></pre>
		 * @param {Function} setter
		 * @returns {Function} flexSetter
		 */
		flexSetter: function(fn) {
			return function(a, b) {
				var k, i;
	
				if (a === null) {
					return this;
				}
	
				if (typeof a !== 'string') {
					for (k in a) {
						if (a.hasOwnProperty(k)) {
							fn.call(this, k, a[k]);
						}
					}
	
					if (system.enumerables) {
						for (i = system.enumerables.length; i--;) {
							k = system.enumerables[i];
							if (a.hasOwnProperty(k)) {
								fn.call(this, k, a[k]);
							}
						}
					}
				} else {
					fn.call(this, a, b);
				}
	
				return this;
			};
		},
	
	   /**
		 * Create a new function from the provided <code>fn</code>, change <code>this</code> to the provided scope, optionally
		 * overrides arguments for the call. (Defaults to the arguments passed by the caller)
		 *
		 * @param {Function} fn The function to delegate.
		 * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
		 * <b>If omitted, defaults to the browser window.</b>
		 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
		 * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
		 * if a number the args are inserted at the specified position
		 * @return {Function} The new function
		 */
		bind: function(fn, scope, args, appendArgs) {
			var method = fn,
				applyArgs;
	
			return function() {
				var callArgs = args || arguments;
	
				if (appendArgs === true) {
					callArgs = Array.prototype.slice.call(arguments, 0);
					callArgs = callArgs.concat(args);
				}
				else if (system.isNumber(appendArgs)) {
					callArgs = Array.prototype.slice.call(arguments, 0); // copy arguments first
					applyArgs = [appendArgs, 0].concat(args); // create method call params
					Array.prototype.splice.apply(callArgs, applyArgs); // splice them in
				}
	
				return method.apply(scope || window, callArgs);
			};
		},
	
		/**
		 * Create a new function from the provided <code>fn</code>, the arguments of which are pre-set to `args`.
		 * New arguments passed to the newly created callback when it's invoked are appended after the pre-set ones.
		 * This is especially useful when creating callbacks.
		 * For example:
		 *
		var originalFunction = function(){
			alert(Ext.Array.from(arguments).join(' '));
		};
	
		var callback = Ext.Function.pass(originalFunction, ['Hello', 'World']);
	
		callback(); // alerts 'Hello World'
		callback('by Me'); // alerts 'Hello World by Me'
	
		 * @param {Function} fn The original function
		 * @param {Array} args The arguments to pass to new callback
		 * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
		 * @return {Function} The new callback function
		 */
		pass: function(fn, args, scope) {
			if (args) {
				args = system.from(args);
			}
	
			return function() {
				return fn.apply(scope, args.concat(system.toArray(arguments)));
			};
		}
		
	});
	
	/**
	 * A full set of methods to do CommonJS class inheritance
	 * @ignore
	 */
	system.apply(system, {
		/**
		 * Classes repository
		 * @property
		 * @private
		 */
		classes: {},
		
		/**
		 * Creates a new class based on the given superclass and an object with overrides
		 * @function
		 * @param {string} name Name for this new class to create. Can be used to get an instantiated version
		 * @param {string} superclass The superclass where the new class will be based on
		 * @param {Object} overrides The overrides that need to be applied to this class
		 * @return {Function} The subclass constructor from the <tt>overrides</tt> parameter, or a generated one if not provided.
		 */
		addClass: function(name, superclass, overrides) {
			var classes = system.classes,
				tmp = function(){};
			
			// check if superclass is string else use 'Base' as superclass
			if (!system.isString(superclass)) { 
				overrides = superclass;
				superclass = 'Base';
			};
			
			// check if new class and parent class already exists
			if ((classes[objEscStr + name]) || !(classes[objEscStr + superclass]))
				return false;
			
			// save name
			overrides.$className = name;
			// get superclass
			superclass = classes[objEscStr + superclass];
			// create new class using the superclass and save in classes list
			return classes[objEscStr + name] = system.extend(superclass, overrides);
		},
		
		/**
		 * Instantiates a requested class with given arguments and returns it
		 * @function
		 * @param {string} name Name for this class to instantiate.
		 * @param {list of variables} arguments list of variables to apply to the class constructor function
		 * @return {Base} The instantiated class.
		 */
		instantiate: function() {
			var args = system.toArray(arguments),
				name = args.shift(),
				temp = function() {},
				cls, constructor, instanceCls;

			// get class
			cls = system.classes[objEscStr + name];
			

			constructor = cls.prototype.constructor;
			instanceCls = function() {
				return constructor.apply(this, args);
			};

			temp.prototype = cls.prototype;
			instanceCls.prototype = new temp();
			instanceCls.prototype.constructor = instanceCls;

			return new instanceCls();
		},

		/**
		 * @private
		 * @function
		 * @param {Function} superclass
		 * @param {Object} overrides
		 * @return {Function} The subclass constructor from the <tt>overrides</tt> parameter, or a generated one if not provided.
		 */
		extend: function(superclass, overrides) {
			var extend = superclass,
				base = Base,
				temp = function() {},
				parent, i, k, ln, staticName, parentStatics,
				cls = function() {
					return this.constructor.apply(this, arguments);
				},
				staticProp;
				
			// copy the standard static properties from Base to new class
			for (staticProp in Base) {
				if (Base.hasOwnProperty(staticProp)) {
					cls[staticProp] = Base[staticProp];
				}
			}
			
			// which class to extend, given one or the basic Base class
			if (typeof extend === 'function' && extend !== Object) {
				parent = extend;
			}
			else {
				parent = base;
			}

			temp.prototype = parent.prototype;
			cls.prototype = new temp();

			// if the given parent class doesn't have the correct basic properties copy them from the Base class
			if (!('$class' in parent)) {
				for (i in base.prototype) {
					if (!parent.prototype[i]) {
						parent.prototype[i] = base.prototype[i];
					}
				}
			}

			// create reference to this class for later use by inheriting classes
			cls.prototype.self = cls;

			// which constructor to use to create this new class
			if (overrides.hasOwnProperty('constructor')) {
				cls.prototype.constructor = cls;
			}
			else {
				cls.prototype.constructor = parent.prototype.constructor;
			}

			// which class was the parent of this new class
			cls.superclass = cls.prototype.superclass = parent.prototype;
			
			// extend the new class with the given new properties
			cls.extend(overrides);
			
			// and return the new class
			return cls;
		}
	});
	
	/********************************************************************************************
	* Base Class	All other classes inherit from Base											*
	********************************************************************************************/
	/**
	 * @class Base
	 * The root of all classes created with {@link System#addClass}
	 * All prototype and static members of this class are inherited by any other class
	 */
	// add base class to classes list. 
	Base = system.classes[objEscStr + 'Base'] = function(){};
	// and extend the prototype in the classical way
	Base.prototype = {
		$className: 'Ext.Base',

		$class: Base,

		/**
		 * Get the reference to the current class from which this object was instantiated. 
		 * @type Class
		 * @protected
		 */
		self: Base,

		/**
		 * Default constructor, simply returns `this`
		 * @constructor
		 * @protected
		 * @return {Object} this
		 */
		constructor: function() {
			return this;
		},

		/**
		 * Call the overridden superclass' method.
		 * @protected
		 * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
		 * from the current method, for example: `this.callParent(arguments)`
		 * @return {Mixed} Returns the result from the superclass' method
		 */
		callParent: function(args) {
			var method = this.callParent.caller,
				parentClass, methodName;

			if (!method.$owner) {

				method = method.caller;
			}

			parentClass = method.$owner.superclass;
			methodName = method.$name;


			return parentClass[methodName].apply(this, args || []);
		},

		/**
		 * Call the original method that was previously overridden with {@link Base#override}
		 * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
		 * @return {Mixed} Returns the result after calling the overridden method
		 */
		callOverridden: function(args) {
			var method = this.callOverridden.caller;


			return method.$previous.apply(this, args || []);
		}
	};
	
	// These static Base properties will be copied to every newly created class
	system.apply(Base, {
		/**
		 * @private
		 */
		ownMethod: function(name, fn) {
			var originalFn, className;

			if (fn === system.emptyFn) {
				this.prototype[name] = fn;
				return;
			}

			if (fn.$isOwned) {
				originalFn = fn;

				fn = function() {
					return originalFn.apply(this, arguments);
				};
			}

			fn.$owner = this;
			fn.$name = name;
			fn.$isOwned = true;

			this.prototype[name] = fn;
		},

		/**
		 * @private
		 */
		borrowMethod: function(name, fn) {
			if (!fn.$isOwned) {
				this.ownMethod(name, fn);
			}
			else {
				this.prototype[name] = fn;
			}
		},

		/**
		 * Add / override prototype properties of this class. This method is a {@link Ext.Function#flexSetter flexSetter}.
		 * It can either accept an object of key - value pairs or 2 arguments of name - value.
		 * @property implement
		 * @static
		 * @type Function
		 * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
		 * @param {Mixed} value See {@link Ext.Function#flexSetter flexSetter}
		 * @markdown
		 */
		extend: system.flexSetter(function(name, value) {
			if (system.isObject(this.prototype[name]) && system.isObject(value)) {
				system.merge(this.prototype[name], value);
			}
			else if (system.isFunction(value)) {
				this.ownMethod(name, value);
			}
			else {
				this.prototype[name] = value;
			}
		}),

		/**
		 * Add / override prototype properties of this class. This method is similar to {@link Base#extend},
		 * except that it stores the reference of the overridden method which can be called later on via {@link Base#callOverridden}
		 * @property override
		 * @static
		 * @type Function
		 * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
		 * @param {Mixed} value See {@link Ext.Function#flexSetter flexSetter}
		 * @markdown
		 */
		override: system.flexSetter(function(name, value) {
			if (system.isObject(this.prototype[name]) && system.isObject(value)) {
				system.merge(this.prototype[name], value);
			}
			else if (system.isFunction(value)) {
				if (system.isFunction(this.prototype[name])) {
					var previous = this.prototype[name];
					this.ownMethod(name, value);
					this.prototype[name].$previous = previous;
				}
				else {
					this.ownMethod(name, value);
				}
			}
			else {
				this.prototype[name] = value;
			}
		})
	});
	
	/********************************************************************************************
	* API generation																			*
	********************************************************************************************/
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'System',
			system: system	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.system = system;
})();

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

	/**
	 * @class Store
	 * @extends Base
	 * A generic store for objects/id combinations
	 */
	StoreClass = {
		/**
		 * The location where the objects are stored
		 * @type Object
		 * @property store
		 */
		/**
		 * The constructor of this class
		 * @constructor
		 */
		constructor: function() {
			this.store = {};										// initialize store
		},
	
		/**
		 * Get the requested stored object
		 * @param {String} id The id of the object to return.
		 * @return {Object} Requested object or undef if not there
		 */
		get: function(id) {
			return this.store[objEscStr + id];
		},
		
		/**
		 * Save the given object in the store
		 * @param {String} id The id of the object to save.
		 * @param {Object} value The object to store.
		 * @return {Object} The stored object
		 */
		set: function(id, value) {
			return this.store[objEscStr + id] = value;
		},
		
		/**
		 * Remove the given object from the store
		 * @param {String} id The id of the object to remove.
		 * @return {Object} The removed object or UNDEF if not existing
		 */
		remove: function(id) {
			var tmp = this.store[objEscStr + id];
			// check if requested object exists then delete
			if (tmp)
				delete this.store[objEscStr + id];
			return tmp;
		},
		
		/**
		 * Check if the requested object already exists in the store.
		 * @param {String} id The fid of the object to check.
		 * @return {Boolean} True when object exists, false if not
		 */
		exist: function(id) {
			return this.store[objEscStr + id] !== UNDEF;
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
		constructor: function(id, deps, factoryFn, cms) {
			this.id = id;																// The full top level id of this module in this system
			this.deps = deps;															// The module dependencies (The full top level id's)
			this.factoryFn = factoryFn;													// Factory Function
			this.cms = cms;																// The core module system this module is defined in
			
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
			id = (id === '') ? id : this.cms.resolveId(this.id, id);
			
			// get requested module exports
			var exports = this.cms.require(id);
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
				lDeps.push(this.cms.resolveId(this.id, deps[i]));
			};
			
			// Call Core Module System to load the requested modules and if ready call the callback function
			this.cms.provide(lDeps, cb)
			
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
				system.mixin(this.exports, this.factoryFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
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
					id: this.cms.id(this.id),
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
	* Module System implemented as Class														*
	********************************************************************************************/
	ModuleSystemClass = {
		/**
		 * @property uid
		 */
		/**
		 * @property store
		 */
		/**
		 * Module System class definition
		 * @constructor
		 * @param {string} uid The uid of this module system
		 */
		constructor: function(uid) {
			// save the uri for this module system
			this.uid = uid;
			// create the module store for this module system
			this.store = system.instantiate('Store');
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
		 * API hook to create a module in this systems modules list
		 * @param {string} id The full top level id of the module in this module system.
		 * @param {array} deps Array of full top level dependency id's in this module system.
		 * @param {function} factoryFn The factory function of the module.
		 * @return {bool} True if ok, false if module already exists
		 */
		memoize: function MSMemoize(id, deps, factoryFn){
			// create Module Instance and save in module store if not already exists
			if (!this.store.exist(id)) {
				this.store.set(id, system.instantiate('Module', id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		// API hook
		isMemoized: function MSIsMemoized(id){
			return this.store.exist(id);
		},
		
		/**
		 * API hook for for higher layers to provide not available modules in this system
		 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
		 * @param {function} cb Callback function called when all given deps are in INIT state
		 */
		provide: function MSProvide(deps, cb){
			// return nothing done = false
			return false;
		},
		
		/**
		 * API hook to return the exports of the main module of the root system
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
	function addClass(sys) {
		system = sys;
		system.addClass('ModuleSystem', ModuleSystemClass);
	};
	
	// call module.class if that function exists to signal addition of a class (for Modules/2.0 environment)
	if (module.addClass !== UNDEF)
		module.addClass({
			name: 'ModuleSystem',
			addClass: addClass	
		})
	// check if exports variable exists (when called as CommonJS 1.1 module)
	else if (exports !== UNDEF)
		exports.addClass = addClass;
})();

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
		
		// CommonJS ID Types
		CJS_TYPE_LOADER = 'loader',
		
	/********************************************************************************************
	* Generic Context implemented as Class														*
	********************************************************************************************/
	ContextClass = {
		/**
		 * The Context Class Constructor
		 * @constructor
		 * @param {cfgObject} cfg The standard cfg object. For this class the following properties are important:
		 */
		constructor: function(cfg) {
			var me = this;
			
			// save the config
			me.cfg = cfg;
			// create a store for all the module subsystems that are to be created in this context
			me.moduleSubs = system.instantiate('Store');
			// create a store for loading resources
			me.loading = system.instantiate('Store');
			
			// generate loaders and the plugins
			me.startupLoader(cfg);
												
			// and create environment hooks
			me.startupCMS(cfg);
			
			// main module given to startup with??
			if (cfg.location && cfg.main) {
				me.provide('commonjs.org', cfg.main, function contextConstructorInitLoadCB(){
					 me.moduleSubs.get('commonjs.org').ms.require(cfg.main);
				})
			}
		},
		
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		/**
		 *
		 * @param {cfgObject} cfg The standard cfg object. This function uses the following properties:
		 * cfg.location
		 * cfg.commonjsAPI
		 * cfg.modules
		 */
		startupCMS: function(cfg){
			var env = cfg.env,
				that = this,
				ms;
			
			// create the Main Module System
			ms = system.instantiate('ModuleSystem', 'commonjs.org');
			// save the main Module System with other system info for later retrieval
			this.moduleSubs.set('commonjs.org', {
				ms: ms,
				uri: cfg.location
			});
			
			// extend cms API
			ms.provide = function ContextProvide(deps, cb){
				that.provide(this.uid, deps, cb);
			};
			
			// add default system modules to the main module system
			this.addSystemModules(ms, cfg.commonjsAPI, cfg.modules);
			
			// create extra module environment require
			env.require = function wrapperRequire(){
				return ms.require.apply(ms, arguments);
			};
		},
		
		/**
		 *
		 */
		addSystemModules: function(ms, commonjsAPI, modules){
			var i, id;
			
			for (i=0; id = commonjsAPI.systemModules[i]; i++){
				ms.memoize(id, modules[id].deps, modules[id].factoryFn);				
			}
		},
		
		/**
		 *
		 */
		startupLoader: function(cfg){
			var modules = cfg.modules,
				commonjsAPI = cfg.commonjsAPI,
				loader; 
			
			loader = modules.execute(commonjsAPI[CJS_TYPE_LOADER]);
			// create the loader from the given CommonJS API modules
			if (!loader || !(loader = loader.create(cfg))) throw new Error("No correct CommonJS Loader Layer declaration!!");
			
			// create loaderbase and add loader
			this.loaderBase = system.instantiate('LoaderBase');
			this.loaderBase.addLoader('http', loader);
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		/**
		 *
		 */
		provide: function(uid, deps, cb){
			var i, dep,
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by calling getMSId
				dep = this.getMSId(uid, dep);
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(dep.uri + dep.id)) && (!dep.ms.isMemoized(dep.id))) {
					// create module system specific Loader API
					dep.api = this.createAPI(dep.id, dep.uid);
					// add to loading list
					this.loading.set(dep.uri + dep.id, dep);
					// add normalized dependency to resource list
					resources.push(dep);
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
		 *
		 */
		provideCallback: function(resources, cb){
			var i, res, 
				that = this,
				reslist = [];
				
			// generate fresh resourcelist	
			for (i=0; res = resources[i]; i++){
				reslist.push(res.uri + res.id)
			}
			// return callback function
			return function contextProvideCallback(resource, args){
				var i, res;
				
				// ready loading this resource so remove from context global loading list
				that.loading.remove(resource.uri + resource.id);
				
				// check if all given resources are recursively loaded
				for (i=0; res = reslist[i]; i++){
					if (res == resource.uri + resource.id)
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
		 *
		 */
		getMS: function() {
		},
		
		/**
		 *
		 */
		setMS: function() {
		},
		
		/**
		 * Return all the relevant information from a given Module System identified with its uid
		 * @param {string} uid The uid of the Module system information is requested from
		 * @param {dep} dep
		 * @return {object} An object with all relevant Module System information
		 */
		getMSId: function(uid, dep){
			var ms = this.moduleSubs.get(uid);
			return {
				ms: ms.ms,
				uid: uid,
				uri: ms.uri,
				id: dep
			}
		},
		
		/**
		 * Create an API object as defined in the Loader specs
		 * @param {string} mId The standard ModuleID (resolved to the given Module System) to use 
		 * @param {string} ms The module system id this API is requested for
		 * @return {LoaderAPI Object} The API as defined by the Loader specs
		 */
		createAPI: function(mId, ms){
			var ms = this.moduleSubs.get(ms).ms;
			return {
				msuri: ms.uri,
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
				loader.load(res.uri + res.id, res.api, this.createLoadedCb(res, cb));
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
 * This is a Generic Package System
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
 * Generic Package System definition
 */
module.declare('genericPackage', [], function(require, exports, module){
	var UNDEF;													// undefined constant for comparison functions

	var	mappings = {};						// The mappings store

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
	
	function procesPackageCfg(cfg) {
		var map;

		// see if uid is defined in new cfg, and check if it is the same as created;
		if (cfg.uid && cfg.uid !== this.uid) {
			// change to new uid and save extra ref as this package must be known under previuos uid and new uid
			this.uid = cfg.uid;
			setPackage(cfg.uid, this);
		}
		
		// save module id that acts as main package module for parent package and add a defer call to 'require' 
		// that module when ready by calling startUp
		this.mainId = (cfg.main) ? this.uid + packageDelimiter + cfg.main : null;
		if (this.mainId) {
			addDefer(this.mainId, this.startUp, this);
		};
		
		// add lib dir to module uri location if available in cfg else use standard 'lib'
		this.moduleUri = (cfg.directories && cfg.directories.lib) ? resolveUri(this.uri, cfg.directories.lib) : resolveUri(this.uri, 'lib');

		// iterate through all the paths to create new path references for this package
		iterate(cfg.paths, function(newId, pathcfg) {
			this.setPath(newId, resolvePath(this.moduleUri, pathcfg));						// resolve the new path against the current lib package path
		}, this);
		
		// iterate through all the mappings to create and load new packages
		this.createMappings(cfg.mappings);
		
		return this;																		// ready for next function on this package
	}
	
	/**
	 * Map new package to short id and if the package is not already loaded define and load it
	 * @param (object) mappings Standard mapping object
	 */
	function createMappings(mappings){
		// iterate through all the mappings to create and load new packages
		iterate(mappings, function(newId, mapcfg) {
			var mapping = {}; 
			mapping.uri = (mapcfg.location) ? resolvePath(this.uri, mapcfg.location) : '';	// get the location of the mapped package
			mapping.uid = (mapcfg.uid) ? mapcfg.uid : mapping.uri;							// get the uid of the mapped package
			this.setMapping(newId, mapping);												// and add to mappings definitions
			if (!getPackage(mapping.uid)) {
				if (mapping.uri === '') throw 'No mapping location for package: ' + this.uid + ' and mapping: '+ newId;
				(new Package(mapping.uid, mapping.uri)).loadPackageDef();					// if not already defined then define this new package and start loading def
			}
		}, this);
	}
		
	/********************************************************************************************
	* Package System API generation																*
	********************************************************************************************/
	exports.commonjs = {
		create: function(cfg){
		}
	};
});
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
 * This is an implementation of a Specific Loader System 
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
 * Specific Loader System definition
 */
module.declare('scriptLoader', [], function(require, exports, module){
	var UNDEF;													// undefined constant for comparison functions
	
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

	/********************************************************************************************
	* ScriptLoader implemented as Class															*
	********************************************************************************************/
	function ScriptLoader(cfg) {
		var loaderPlugins, transport, plugin,
			modules = cfg.modules;
		
		this.env = cfg.env;
		this.testInteractive = !!cfg.env.ActiveXObject;				// test if IE for onload workaround... 
		this.timeout = cfg.timeout;
		this.scripts = [];
		this.transports = [];
		
		// create the transports plugins
		if ((loaderPlugins = cfg.commonjsAPI.loaderPlugins) !==UNDEF) {
			for (var i=0; transport = loaderPlugins[i]; i++) {
				plugin = modules.execute(transport);
				if (!plugin || !(plugin = plugin.create(cfg, this))) throw new Error("No correct CommonJS loaderPlugin: " + transport + " declaration!!");
				this.transports.push(plugin);
			}
		}
	}
	
	ScriptLoader.prototype = {
		/**
		 * Local module/transport load function, defines script tag with ready as callback function if file loaded. 
		 * @param {string} uri URI of resource to be loaded
		 * @param {object} api Generic functions that need to be used to add data from resource to the corresponding context
		 * @param {function} cb Callback function that needs to be called when resource loading is ready
		 * @return {bool} True if load request is running (async) or is fulfilled (sync), false if something went wrong
		 */
		load: function(uri, api, cb){
			// this plugin only loads async so return error if synchronous load request
			if (cb === UNDEF) return false;
			
			// from here on only js files are loaded so add .js extension
			uri += ".js";
			
			// make the environment thats available on load ready.
			// Must be done on each load because of possibility of multiple contexts using the same environment (like in browsers)
			this.callTransports('initEnv', [this.env, uri, api]);
			
			// start loading from the given resource location
			this.insertScriptTag(uri, [uri, api, cb], this.ready, this);
			
			// request is running so return true
			return true;
		},
		
		
		/**
		 * Callled when a script file is loaded
		 * @param {array} cbData Extra data inserted by the calling load function, i.e. [uri, api, cb]
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
		 */
		ready: function(cbData, script, state){
			var cb;
			
			// do nothing because already parsed this scriptload
			if (script._done) { 
				throw new error('2nd time script ready call!!');
				return;
			}
			
			// clean script var of callback functions etc.
			this.cleanScriptTag(script);
	
			// push script state
			cbData.push(state);
			
			// give the Transport Plugin a signal that scriptload is ready
			this.callTransports('loadReady', cbData);
		},
		
		/**
		 * Callled when a transport plugin wants to know which URI is active (needed in IE <9)
		 * @return {string} The URI of the current active script tag (if IE<9) or UNDEF if not known
		 */
		getActiveURI: function(){
			var i, script;
			// From the techniques in RequireJS (requirejs.org) by James Burke and Kris Zyp
			// If in IE 6-8 do the interactive concurrently Adding Script stuff.
			if (this.testInteractive) {
				for (i=0; script = this.scripts[i]; i++){
					if (script.readyState === "interactive") {
						return script._moduleURI;
					}
				};
			};
			return UNDEF;
		},
		
		/**
		 * Call a function in all transport plugins with given arguments
		 * @param {string} fnName name of the function to call on all transport plugins
		 * @param {array} arguments The arguments to use in the function call
		 */
		callTransports: function(fnName, arguments){
			var len = this.transports.length,
				i, plugin;
			
			// call the fnName in all the transport plugins
			for (i=0; plugin = this.transports[i]; i++) {
				if (plugin[fnName] == UNDEF) 
					throw new error("Transport plugin: " + plugin.name + " doesn't have function: " + fnName)
				else
					plugin[fnName].apply(plugin, arguments);
			}
		},
		
		/**
		 * Create scripttag for given id, uri and callback/scope function
		 * @param {string} uri The full uri to the resource to load
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call
		 * @param {object} scope Scope of the Callback function
		 */
		insertScriptTag: function(uri, cbData, cb, scope){
			var	doc = this.env.document,															// DOM document reference
				horb = doc.getElementsByTagName("head")[0] || doc.getElementsByTagName("body")[0], 	// get location of scripts in DOM
				file = doc.createElement("script"); 												// create file tag from scripttag

			file._moduleURI = uri; // save for later use because browsers change src field sometimes (like IE does)
			file._timer = setTimeout(this.scriptTimer(file, cbData, cb, scope), this.timeout);
			file.type = "text/javascript";
			file.onload = file.onreadystatechange = this.scriptLoad(file, cbData, cb, scope);
			file.onerror = this.scriptError(file, cbData, cb, scope);
			file.src = uri;
			
			// tag save for later use
			this.scripts.push(file);
			
			// insert scripttag
			horb.insertBefore(file, horb.firstChild);
		},
		
		/**
		 * clean all temporary vars to prevent possible memory leaking
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 */
		cleanScriptTag: function(script){
			script._done = true;
			delete script._moduleURI;
			script.onload = script.onreadystatechange = new Function("");
			script.onerror = new Function("");
			if (script._timer) clearTimeout(script._timer);
			
			// remove script tag from queue
			each(this.scripts, function(s, index){
				if (script === s) this.scripts.splice(index, 1);
			}, this)
		},
		
		/**
		 * Returns a closure function that will be called when the script is loaded
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when the script is loaded
		 * @param {object} scope Scope of the Callback function
		 */
		scriptLoad: function(script, cbData, cb, scope){
			return function(){
				if (script._done || (typeof script.readyState != "undefined" && !((script.readyState == "loaded") || (script.readyState == "complete")))) {
					return;							// not yet ready loading
				}
				cb.call(scope, cbData, script, true);		// call the callback function with the correct scope, data and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when there is an loaderror for a script
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when error happens
		 * @param {object} scope Scope of the Callback function
		 */
		scriptError: function(script, cbData, cb, scope){
			return function(){
				cb.call(scope, cbData, script, false);		// call the callback function with the correct scope, data and error indication
			};
		},
		
		/**
		 * Returns a closure function that will be called when a script insertion times out
		 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
		 * @param {array} cbData Data needed by cb function
		 * @param {function} cb Callback function to call when timer expires
		 * @param {object} scope Scope of the Callback function
		 */
		scriptTimer: function(script, cbData, cb, scope){
			return function(){
				script._timer = 0;							// timer is already used else I wouldn't be here... ;-)
				cb.call(scope, cbData, script, false);		// call the callback function with the correct scope, data and error indication
			};
		}
	}
	
	/********************************************************************************************
	* Loader System API generation																*
	********************************************************************************************/
	exports.create = function(cfg){
		return new ScriptLoader(cfg);
	};
});
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
module.declare('system', [], function(require, exports, module){

	var worker = (typeof importScripts === "function");

	function sendMessage(msg, a, b) {
		if (worker)	{
			postMessage([msg, a, b]);
		} else {
			var w = window;
			
			if (window.parent && window.parent[msg])
				w = window.parent;
			
			if (w[msg]) w[msg](a, b);
		}
	}

	exports.stdio =	{
		print: function(txt, style)	{
			sendMessage("printResults", txt, style);
		}
	};
});

module.declare('test', ["system"], function(require, exports, module) {
	var system = require("system");
	
	exports.print = function () {
		var stdio = system.stdio;
		stdio.print.apply(stdio, arguments);
	};
	
	exports.assert = function (guard, message) {
		if (guard) exports.print("PASS " + message, "pass");
		else exports.print("FAIL " + message, "fail");
	};
});

