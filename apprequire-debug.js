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
		system,													// system singleton interface point
		systemModules = {},										// declared system modules (loaders, transports and general modules)
		
	/********************************************************************************************
	* Startup configs																			*
	********************************************************************************************/
		// default context config
		defaultcfg = {
			directories: {
				lib: './lib'
			},
			location: './',
			system: {},
			loaders: [],
			modules: [],
			debug: true,
			timeout: 6000,
			baseUrlMatch: /apprequire/i
		},
					
		// default system class names
		systemcfg = {
			context: "Context",
			loaderBase: "LoaderBase",
			moduleSystem: "ModuleSystem",
			module: "Module",
			store: "Store",
		},
		
		// default Loaders:
		loaderscfg = [{
			loader: "scriptLoader",
			type: "http",
			plugins: [
				"moduleTransport"
			]
		}],
		
		// default modules
		modulescfg = [
			"system",
			"test"
		];
		
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
	function getContextConfig(document, baseUrlMatch) {
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
	 * Create a new CommonJS context
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 * @param {Array} modules Array of standard modules to add to the main Module System
	 * @return {Context} The created context
	 */
	function createNewContext(cfg, modules) {
		modules = (modules || systemModules);
		return system.instantiate(cfg.system.context, cfg, modules);
	}
	
	/**
	 * Setup the extra module environment by using the defined CommonJS system environment
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 */
	function createExtraModuleEnv(cfg) {
		var context;

		// delete declare and addClass because only in use for bootstrap phase...
		delete cfg.env.module.declare;
		delete cfg.env.module.addClass;

		// create context with current cfg, and the System Module list.
		context = createNewContext(cfg, systemModules);
			
		// debug info ??
		if (cfg.debug) {
			cfg.env.module.debug = {
				system: system,
				context: context,
				cfg: cfg
			}
		}
	}
	
	/**
	 * Check if all classes are available in the CommonJS system
	 * @param {object} classes Object with name value pairs
	 * @return {bool} True when all required classes are defined, false if not
	 */
	function systemReady(classes) {
		for (var prop in classes) {
			if (!system.exists(classes[prop])) 
				return false
		}
		return true;
	}
	
	/**
	 * Check if all loader modules are available in the CommonJS system
	 * @param {Array of objects} loaders Array of loader objects with loader name strings and a transports array
	[{
		loader: "loader1",
		plugins: ["plugin1", "plugin2"]
	},{
		loader: "loader2",
		plugins: ["plugin3"]
	}]
	 * @return {bool} True when all required modules are defined, false if not
	 */
	function loadersReady(loaders) {
		var i1, i2, loader, plugin;
		for (i1 = 0; loader = loaders[i1]; i1++) {
			// does the loader itself exists?
			if (!systemModules[loader.loader])
				return false;
			// check if all plugins exist.
			if (!modulesReady(loader.plugins))
				return false;
		}
		// all required loader modules are loaded
		return true;
	}
	
	/**
	 * Check if all system modules are available in the CommonJS system
	 * @param {Array} mods Array of module name strings
	 * @return {bool} True when all required modules are defined, false if not
	 */
	function modulesReady(mods) {
		var prop;
		for (prop in mods) {
			if (!systemModules[mods[prop]]) 
				return false
		}
		return true;
	}
	
	/**
	 * Checks if all the required CommonJS system classes and modules are loaded and if so configures the Extra Module Environment
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 * @return {bool} True when all required modules and classes are loaded and first context is defined, false if not
	 */
	function bootstrapReady(cfg) {
		if (systemReady(cfg.system) && loadersReady(cfg.loaders) && modulesReady(cfg.modules)) { 
			createExtraModuleEnv(cfg);
			return true;
		}
		return false;
	}

	/**
	 * Handles CommonJS module adding to the environment, only available in bootstrap phase.
	 * Bootstrap phase is followed by Extra Module Environment Phase (EME Phase). Changeover to EME phase is 
	 * accomplished when all modules and classes are 'loaded' and first context is defined.   
	 * @param {string} id ID of the module.
	 * @param {array} dep Object with the modules dependency list.
	 * @param {function} factoryFn Function to define the exports of this module.
	 * @param {object} cfg Object with the configuration for the CommonJS system to create.
	 */
	function addModule(id, dep, factoryFn, cfg) {
		if ((typeof id == 'string') && (id !== UNDEF)) {
			// save this api information
			systemModules[id] = {
				dep: dep,
				factoryFn: factoryFn
			};
			// check if all modules and classes are now loaded. If true then startup first context
			bootstrapReady(cfg);
		} else {
		// non CommonJS system API module is declared, throw error
			throw new Error("Invalid bootstrap module declaration!!");
		}
	}
	
	/**
	 * Add Class to CommonJS system. First call to this function MUST give a CommonJS System. Continuing calls
	 * 
	 * @param {Object} cls Object with name and system or addClass function
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 */
	function addClass(cls, cfg) {
		if ((cls.name == 'System') && (system === UNDEF)) {
			system = cls.system;
			return;
		} else if (system !== UNDEF) {
			cls.addClass(system);
			// check if all modules and classes are now loaded. If true then startup first context
			bootstrapReady(cfg);
		} else
			throw new Error("Invalid bootstrap class declaration!! Class System is not yet defined!");
	}
	
	/**
	 * Creates the setup in the global environment to make it possible to reach the Extra Module Environment Phase
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 */
	function bootstrap(cfg) {
		// create global module and class declare functions for the Bootstrap phase. Those functions
		// will be deleted when all required modules and classes are added/declared
		cfg.env.module = {
			declare: function(id, deb, factoryFn){
				addModule(id, deb, factoryFn, cfg);
			},
			addClass: function(cls){
				addClass(cls, cfg);
			}
		};
	}
	
	/**
	 * Creates a normalized cfg object from mixing cfg info defined in script tag and default cfg's
	 * @param {Object} env The environment (in ua bootstrap this will be window...)
	 * @return {Object} the normalized cfg object with all possible cfg items filled with correct settings
	 */
	function setupConfig(env){
		// empty config object with only the environment declared
		var cfg = {
			env: env
		};
		
		// check if environment is defined else throw
		if (env === UNDEF) 
			throw new Error("Invalid environment in setupConfig bootstrap! ");
			
		// mix defaultcfg with cfg
		mixin(cfg, defaultcfg);
				
		// then get possible script attribute configuration option if in browser env. Those have preference!!!
		if (env.document !== UNDEF) 
			mixin(cfg, getContextConfig(env.document, cfg.baseUrlMatch), true);
		
		// create location property if not already defined	
		mixin(cfg, {
			location: ''
		});
	
		// previous configuration has preference over environment location.href
		if (cfg.location == '')
			cfg.location = cutLastTerm(env.location.href);
		
		// mixin not defined framework standard CommonJS Framework Systems
		mixin(cfg.system, systemcfg);
		mixin(cfg.loaders, loaderscfg);
		mixin(cfg.modules, modulescfg);
		
		// and return config
		return cfg;
	}
	
	/********************************************************************************************
	* Bootstrap startup																			*
	********************************************************************************************/
	/**
	 * Boot into the commonjs bootstrap phase depending on given options. 
	 * @param {object} env Description of the current environment, in this case window...
	 */
	bootstrap(setupConfig(env));
	
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
		utils = {},												// utils singleton definition in this private scope
		objectPrototype = Object.prototype,
		enumerables = true,
		enumerablesTest = { toString: 1 },
		i;
		
	/********************************************************************************************
	* Utils Singleton methods definition 														*
	********************************************************************************************/
	for (i in enumerablesTest) {
		enumerables = null;
	}

	if (enumerables) {
		enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable',
					   'toLocaleString', 'toString', 'constructor'];
	}

	/**
	 * @class Utils
	 * AppRequire utility functions.
	 * @singleton
	 */
	/**
	 * Put it into utils namespace so that we can reuse outside this closure
	 * @type Array
	 */
	utils.enumerables = enumerables;
		
	/**
	 * Copies all the properties of config to the specified object.
	 * IMPORTANT: Note that it doesn't take care of recursive merging and cloning without referencing the original objects / arrays
	 * Use utils.merge instead if you need that.
	 * @param {Object} object The receiver of the properties
	 * @param {Object} config The source of the properties
	 * @param {Object} defaults A different object that will also be applied for default values
	 * @return {Object} returns obj
	 */
	utils.apply = function(object, config, defaults) {
		if (defaults) {
			utils.apply(object, defaults);
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
	utils.apply(utils, {
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
			return (value === null) || (value === undefined) || ((utils.isArray(value) && !value.length)) || (!allowBlank ? value === '' : false);
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
			return utils.isString(value) || utils.isNumber(value) || utils.isBoolean(value);
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
			if (utils.isArray(value) || value.callee) {
				return true;
			}
			//check for node list type
			if (/NodeList|HTMLCollection/.test(objectPrototype.toString.call(value))) {
				return true;
			}

			//NodeList has an item and length property
			//IXMLDOMNodeList has nextNode method, needs to be checked first.
			return ((typeof value.nextNode !== 'undefined' || value.item) && utils.isNumber(value.length)) || false;
		}
	});
	
	/**
	 * A full set of static methods to do variable handling
	 * @ignore
	 */
	utils.apply(utils, {
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
			if (utils.isArray(item)) {
				i = item.length;

				clone = new Array(i);

				while (i--) {
					clone[i] = utils.clone(item[i]);
				}
			}
			// Object
			else if (utils.isObject(item) && item.constructor === Object) {
				clone = {};

				for (key in item) {
					clone[key] = utils.clone(item[key]);
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
			if (utils.isString(key)) {
				if (utils.isObject(value) && utils.isObject(source[key])) {
					if (value.constructor === Object) {
						utils.merge(source[key], value);
					} else {
						source[key] = value;
					}
				}
				else if (utils.isObject(value) && value.constructor !== Object){
					source[key] = value;
				}
				else {
					source[key] = utils.clone(value);
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
						utils.merge(source, prop, obj[prop]);
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
			if (utils.isIterable(value)) {
				return utils.toArray(value);
			}

			if (utils.isDefined(value) && value !== null) {
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
	
					if (utils.enumerables) {
						for (i = utils.enumerables.length; i--;) {
							k = utils.enumerables[i];
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
				else if (utils.isNumber(appendArgs)) {
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
				args = utils.from(args);
			}
	
			return function() {
				return fn.apply(scope, args.concat(utils.toArray(arguments)));
			};
		}
		
	});
	
	/********************************************************************************************
	* System Singleton methods definition 														*
	********************************************************************************************/
	/**
	 * @class System
	 * AppRequire's CommonJS System environment functions.
	 * @singleton
	 */
	/**
	 * A full set of methods to do CommonJS class inheritance
	 * @ignore
	 */
	utils.apply(system, {
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
			if (!utils.isString(superclass)) { 
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
			var args = utils.toArray(arguments),
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
		 * Does the class with the requested name exist in the class table
		 * @param {String} name The name of the class
		 * @return {Boolean} True if the class exists, false if not.
		 */
		exists: function(name) {
			return !!(system.classes[objEscStr + name]);
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
		},
		
		/**
		 *
		 * @return {Object} Object with all utils functions
		 */
		getUtils: function() {
			var result = {};
			// copy util functions to new object to create save environment 
			utils.apply(result, utils);
			// and give new utils object back
			return result;
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
	utils.apply(Base, {
		/**
		 * @private
		 */
		ownMethod: function(name, fn) {
			var originalFn, className;

			if (fn === utils.emptyFn) {
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
		extend: utils.flexSetter(function(name, value) {
			if (utils.isObject(this.prototype[name]) && utils.isObject(value)) {
				utils.merge(this.prototype[name], value);
			}
			else if (utils.isFunction(value)) {
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
		override: utils.flexSetter(function(name, value) {
			if (utils.isObject(this.prototype[name]) && utils.isObject(value)) {
				utils.merge(this.prototype[name], value);
			}
			else if (utils.isFunction(value)) {
				if (utils.isFunction(this.prototype[name])) {
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
		system,													// system singleton definition in this private scope
	
	/**
	 * @class ModuleSystem
	 * Default CommonJS Module System definition.
	 */
	ModuleSystemClass = {
		/**
		 * Store of the defined modules for this Module System
		 * @property store
		 * @type Store
		 */
		/**
		 * Module System class definition
		 * @constructor
		 * @param {cfgObject} cfg The standard cfg object.
		 */
		constructor: function(cfg) {
			var me = this;
			
			// Classname for modules
			me.mClass = cfg.system.module;
			// create the module store for this module system
			me.store = system.instantiate(cfg.system.store);
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
				this.store.set(id, system.instantiate(this.mClass, id, deps, factoryFn, this));
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
 * @author Sander Tolsma <code@tolsma.net>
 * @docauthor Sander Tolsma <code@tolsma.net>
 */
(function() {
	var UNDEF,													// undefined constant for comparison functions
		system,													// system singleton definition in this private scope
		
	/**
	 * @class Context
	 * Default CommonJS Context environment definition.
	 */
	ContextClass = {
		/**
		 * The Context Class Constructor
		 * @constructor
		 * @param {cfgObject} cfg The standard cfg object.
		 * @param {Array} modules Array of standard modules to add to the Core Module System
		 */
		constructor: function(cfg, modules) {
			var me = this,
				cfgSystem = cfg.system;
			
			// save the config
			me.cfg = cfg;
			me.env = cfg.env;
			me.msClass = cfgSystem.moduleSystem;
			me.storeClass = cfgSystem.store;
			
			// create a store for loading resources
			me.loading = system.instantiate(me.storeClass);
			
			// create core module system
			me.startupCMS(modules);
		},
		
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		/**
		 * Creates the core module system, adds the given standard modules and installs the loaders for the CMS
		 * @param {Array} modules Array of standard modules to add to the main Module System
		 */
		startupCMS: function(modules) {
			var me = this,
				ms;
			
			// create the Main Module System
			ms = system.instantiate(me.msClass, me.cfg);
			// save the main Module System with other system info for later retrieval
			me.setMS(ms, me.cfg.location);
			
			// extend Module System API
			ms.provide = function ContextProvide(deps, cb) {
				me.provide(me.getMS(), deps, cb);
			};
			
			// add default system modules to the main module system
			me.addSystemModules(ms, modules);
			
			// create extra module environment require
			me.env.require = function wrapperRequire(){
				return ms.require.apply(ms, arguments);
			};
			// create extra module environment module.provide
			me.env.module.provide = function wrapperProvide(deps, cb){
				me.provide(me.getMS(), deps, cb);
			};
			
			// generate loaders and the plugins
			me.startupLoaders(ms, this.cfg.loaders);
												
			// main module given to startup with??
			if (me.cfg.location && me.cfg.main) {
				me.provide(me.getMS(), me.cfg.main, function contextConstructorInitLoadCB(){
					 me.getMS().ms.require(me.cfg.main);
				})
			}
		},
		
		/**
		 * Add an array of module definitions to the given Module System
		 * @param {ModuleSystem} ms the Module System to add the modules to
		 * @param {Array} modules Array of modules to add to the Module System
		 */
		addSystemModules: function(ms, modules){
			var mod;
			for (mod in modules){
				ms.memoize(mod, modules[mod].deps, modules[mod].factoryFn);				
			}
		},
		
		/**
		 * From an array of loader definitions create loaders and add to the given Module System
		 * @param {ModuleSystem} ms the Module System to add the loaders to
		 * @param {Array} modules Array of loader definitions to add to the Module System
		 */
		startupLoaders: function(ms, loaders){
			var base, loader, loaderMod, i;
			// create interface layer to keep track of multiple loaders
			base = this.loaderBase = system.instantiate(this.cfg.system.loaderBase);
			// add the defined loaders
			for (i=0; loader = loaders[i]; i++) {
				// create loaderbase and add loader
				loaderMod = ms.require(loader.loader);
				base.addLoader(loader.type, loaderMod.create(this.cfg, loader.plugins));
			}
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		/**
		 * First load all dependencies if not available in given Module System and then call the given callback function
		 * @param {Module System Descriptor Object} The Module System Descriptor Object of the Module System the dependencies are asked for
		 * @param {Array/String} deps String or Array of Strings of dependency module IDs
		 * @param {Function} cb Callback function to call when dependencies are loaded
		 */
		provide: function(msDescr, deps, cb){
			var i, dep, depDescr
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies and if needed create dependency descriptor
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by cloning
				depDescr = system.getUtils().clone(msDescr);
				// create url from uri and dependency id
				depDescr.url = depDescr.uri + dep;
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(depDescr.url)) && (!depDescr.ms.isMemoized(dep))) {
					// create module system specific Loader API
					depDescr.api = this.createAPI(dep, depDescr);
					// add to loading list
					this.loading.set(depDescr.url, depDescr);
					// add normalized dependency to resource list
					resources.push(depDescr);
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
		 * Returns Function called when one resource of the resourcelist created by provide is loaded. 
		 * When all resources are loaded the Callback function will be called
		 * @param {Array} resources Array of resource objects that are going to be loaded
		 * @param {Function} cb Callback function to call when resources are loaded
		 * @return {Function} Resource check callback function which accepts the resource object of the resource loaded and 
		 * an array of arguments for the callback function
		 */
		provideCallback: function(resources, cb){
			var i, res, 
				that = this,
				reslist = [];
				
			// generate fresh resourcelist	
			for (i=0; res = resources[i]; i++){
				reslist.push(res.url)
			}
			// return callback function
			return function contextProvideCallback(resource, args){
				var i, res;
				
				// ready loading this resource so remove from context global loading list
				that.loading.remove(resource.url);
				
				// check if all given resources are recursively loaded
				for (i=0; res = reslist[i]; i++){
					if (res == resource.url)
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
		 * Gets module system descriptor for this context, can be overridden in later child classes to extend with packages 
		 * @return {Module System Descriptor Object} The retrieved Module System Descriptor Object
		 */
		getMS: function() {
			return this.ms;
		},
		
		/**
		 * Save the given module system in this context as a module system descriptor, can be overridden in later child classes to extend with packages
		 * @param {ModuleSystem} ms The module system object to set
		 * @param {String} uri The location of the modules of this Module System
		 * @return {Module System Descriptor Object} The created Module System Descriptor Object
		 */
		setMS: function(ms, uri) {
			return this.ms = {
				ms: ms,
				uri: uri
			};
		},
		
		/**
		 * Create an API object as defined in the Loader specs
		 * @param {string} mId The standard ModuleID (resolved to the given Module System) to use 
		 * @param {Module System Descriptor Object} msDescriptor The module system descriptor this API is requested for
		 * @return {LoaderAPI Object} The API as defined by the Loader specs
		 */
		createAPI: function(mId, msDescriptor){
			var ms = msDescriptor.ms;
			return {
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
	function ScriptLoader(cfg, plugins) {
		var transport, plugin;
		
		this.env = cfg.env;
		this.testInteractive = !!cfg.env.ActiveXObject;				// test if IE for onload workaround... 
		this.timeout = cfg.timeout;
		this.scripts = [];
		this.transports = [];
		
		// create the transports plugins
		for (var i=0; transport = plugins[i]; i++) {
			plugin = require(transport);
			if (!plugin || !(plugin = plugin.create(cfg, this))) throw new Error("No correct CommonJS loaderPlugin: " + transport + " declaration!!");
			this.transports.push(plugin);
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
	exports.create = function(cfg, plugins){
		return new ScriptLoader(cfg, plugins);
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

