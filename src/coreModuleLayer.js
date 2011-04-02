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
 * and utility code of Ext Core 4 (copyright Sencha, http://www.sencha.com)
 *
 * For documentation how to use this: http://code.tolsma.net/apprequire
 */
 
/**
 * Core Module Layer definition
 */
(function() {
	var UNDEF,													// undefined constant for comparison functions
		objEscStr = '_',										// Object property escape string
		Base,													// Base class... All other classes created with system functions inherit from this class
		system = {},											// system singleton definition in this private scope
		objectPrototype = Object.prototype,
		enumerables = true,
		enumerablesTest = { toString: 1 },
		i,

		// CommonJS ID Types
		CJS_TYPE_LOADER = 'loader',
		
		//The following are module state constants
		INIT = 'INIT',
		READY = 'READY';
		
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
			
			//<debug error>
			if (!cls) {
				throw new Error("[system.instantiate] Cannot create an instance of unrecognized class name: " + name);
			}
			//</debug>

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
		 * @markdown
		 */
		self: Base,

		/**
		 * Default constructor, simply returns `this`
		 *
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
				//<debug error>
				if (!method.caller) {
					throw new Error("[callParent] Calling a protected method from the public scope");
				}
				//</debug>

				method = method.caller;
			}

			parentClass = method.$owner.superclass;
			methodName = method.$name;

			//<debug error>
			if (!(methodName in parentClass)) {
				throw new Error("[#" + methodName + "] this.callParent() was called but there's no such method (" + methodName + ") found in the parent class ()");
			}
			//</debug>

			return parentClass[methodName].apply(this, args || []);
		},

		/**
		 * Call the original method that was previously overridden with {@link Base#override}
		 * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
		 * @return {Mixed} Returns the result after calling the overridden method
		 */
		callOverridden: function(args) {
			var method = this.callOverridden.caller;

			//<debug error>
			if (!method.$owner) {
				throw new Error("[callOverridden] Calling a protected method from the public scope");
			}

			if (!method.$previous) {
				throw new Error("[] this.callOverridden was called in '" + method.$name + "' but this method has never been overridden");
			}
			//</debug>

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
	* Generic Store implemented as Class														*
	********************************************************************************************/
	system.addClass('Store', {
		/*******************************************************************************\
		*	Store functions																*
		\*******************************************************************************/	
	
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
	});
	
	/********************************************************************************************
	* Generic Loader implemented as Class														*
	********************************************************************************************/
	system.addClass('LoaderBase', {
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
	});
	
	/********************************************************************************************
	* Generic Context implemented as Class														*
	********************************************************************************************/
	system.addClass('Context', {
		constructor: function(cfg) {
			var that = this;
			
			// save the config
			this.cfg = cfg;
			// create a store for all the module subsystems that are to be created in this context
			this.moduleSubs = system.instantiate('Store');
			// create a store for loading resources
			this.loading = system.instantiate('Store');
			// deferred list
			this.deferred = [];
			
			// generate loaders and the plugins
			this.startupLoader(cfg);
												
			// and create environment hooks
			this.startupCMS(cfg);
			
			// main module given to startup with??
			if (cfg.location && cfg.main) {
				this.provide('commonjs.org', cfg.main, function contextConstructorInitLoadCB(){
					 that.moduleSubs.get('commonjs.org').cms.require(cfg.main);
				})
			}
		},
		
		/********************************************************************************************
		* Context Startup Functions																	*
		********************************************************************************************/
		startupCMS: function(cfg){
			var env = cfg.env,
				that = this,
				cms;
			
			// create the Main Module System
			cms = system.instantiate('CMS', 'commonjs.org');
			// save the main Module System with other system info for later retrieval
			this.moduleSubs.set('commonjs.org', {
				cms: cms,
				uri: cfg.location
			});
			
			// extend cms API
			cms.provide = function ContextProvide(deps, cb){
				that.provide(this.uid, deps, cb);
			};
			
			// add default system modules to the main module system
			this.addSystemModules(cms, cfg.commonjsAPI, cfg.modules);
			
			/**********************************************\
				Onderstaande alleen voor debug !!!!!!!!
			\**********************************************/
			env.module.cms = cms;
			// create extra module environment require
			env.require = function wrapperRequire(){
				return cms.require.apply(cms, arguments);
			};
			env.require.isMemoized = function wrapperIsMemoized(){
				return cms.isMemoized.apply(cms, arguments);
			};
		},
		
		addSystemModules: function(cms, commonjsAPI, modules){
			var i, id;
			
			for (i=0; id = commonjsAPI.systemModules[i]; i++){
				cms.memoize(id, modules[id].deps, modules[id].factoryFn);				
			}
		},
		
		startupLoader: function(cfg){
			var modules = cfg.modules,
				commonjsAPI = cfg.commonjsAPI,
				env = cfg.env,
				loader; 
			
			loader = modules.execute(commonjsAPI[CJS_TYPE_LOADER]);
			// create the loader from the given CommonJS API modules
			if (!loader || !(loader = loader.create(cfg))) throw new Error("No correct CommonJS Loader Layer declaration!!");
			
			// create loaderbase and add loader
			env.module.cfg = cfg;
			env.module.loaderBase = this.loaderBase = system.instantiate('LoaderBase');
			this.loaderBase.addLoader('http', loader);
		},
		
		/********************************************************************************************
		* Context API Functions																		*
		********************************************************************************************/
		provide: function(uid, deps, cb){
			var i, dep,
				resources = [];
				
			// convert string to array
			deps = (typeof deps == 'string') ? [deps] : deps;
			
			// run through all required dependencies
			for (i=0; dep = deps[i]; i++) {
				//normalize dependency by calling getCMSId
				dep = this.getCMSId(uid, dep);
				
				// does this id already exists in the module system or is this resource already loading?
				if ((!this.loading.exist(dep.uri + dep.id)) && (!dep.cms.isMemoized(dep.id))) {
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
		
		getCMSId: function(uid, dep){
			var cms = this.moduleSubs.get(uid);
			return {
				cms: cms.cms,
				uid: uid,
				uri: cms.uri,
				id: dep
			}
		},
		
		createAPI: function(mid, cms){
			var cms = this.moduleSubs.get(cms).cms;
			return {
				cmsuri: cms.uri,
				deps: [],
				memoize: function ContextAPIMemoize(id, deps, factoryFn){
					// no given id then use requested id
					if (id === null) id = mid;
					// no given deps then use empty array
					if (deps === UNDEF) deps = [];
			
					// normalize dependancy ids relative to the module requiring it
					for (var i=0; deps[i]; i++) {
						// resolve given dependency and save for load
						deps[i] = cms.resolveId(id, deps[i]);
						this.deps.push(deps[i]);
					};
					
					// add module to the requesting module system
					cms.memoize(id, deps, factoryFn);
					
				},
				loadReady: function ContextAPILoadReady(cb){
					// Call Core Module System to load the requested modules and if ready call the callback function
					cms.provide(this.deps, cb);
					this.deps = [];					
				}
			};
		}
	});
	
	/********************************************************************************************
	* Module System implemented as Class														*
	********************************************************************************************/
	system.addClass('CMS', {
		/**
		 * CMS class definition
		 */
		constructor: function(uid) {
			// save the uri for this module system
			this.uid = uid;
			// create the module store for this module system
			this.store = system.instantiate('Store');
		},

		/**
		 * API hook to get the requested module
		 * @param {string} id The full top level id of the module exports to return.
		 * @return {exports} Requested module exports or undef if not there
		 */
		require: function CMSRequire(id){
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
		memoize: function CMSMemoize(id, deps, factoryFn){
			// create Module Instance and save in module store if not already exists
			if (!this.store.exist(id)) {
				this.store.set(id, system.instantiate('Module', id, deps, factoryFn, this));
				return true;
			}
			
			// Module already exists
			return false;
		},
		
		// API hook
		isMemoized: function CMSIsMemoized(id){
			return this.store.exist(id);
		},
		
		/**
		 * API hook for for higher layers to provide not available modules in this system
		 * @param {array] deps The full top level module id's that need to be INIT state before cb is called
		 * @param {function} cb Callback function called when all given deps are in INIT state
		 */
		provide: function CMSProvide(deps, cb){
			// return nothing done = false
			return false;
		},
		
		/**
		 * API hook to return the exports of the main module of the root system
		 * @param {string} id The full top level id of the module who wants to know its context main module exports
		 * @return {exports} The exports of the context main module 
		 */
		getMain: function CMSGetMain(id){
			// if not overridden then the module with id=='' is the main module, so get its exports
			return this.require('');
		},

		/**
		 * API hook to return a Context wide canonical module id
		 * @param {string} id The full top level id for which the Context wide canonical id is requested   
		 * @return {string} The Context wide canonical id version of the given id
		 */
		id: function CMSId(id){
			// if not overridden this system IS the context so just return this given full top level id
			return id;
		},
		
		/**
		 * Resolve the given relative id to the current id or if not relative just give it back
		 * @param {string} id The id to resolve
		 * @return {string} resolved and sanatized id.
		 */
		resolveId: function CMSResolveId(curId, id) {
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
	});

	/********************************************************************************************
	* Generic Module implemented as Module Class												*
	********************************************************************************************/
	system.addClass('Module', {
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
	});
	
	/********************************************************************************************
	* Core Module Layer API generation															*
	********************************************************************************************/
	function create(cfg){
		return system.instantiate('Context', cfg);
	};
	
	// check if exports variable exists (when called as CommonJS 1.1 module)
	if (!system.isEmpty(exports))
		exports.create = create;
	
	// call module.class if that function exists to signal addition of one ore more classes (for Modules/2.0 environment)
	if (system.isFunction(module.class))
		module.class({
			type: 'Context',
			create: create,
			system: system	
		});
})()
