/*-------------------------------------------------------------------------------------\
	Copyright (c) 2010 Sander Tolsma/TTC
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

	Version Log:
	0.1		02-10-2010	Creation of first skelleton version of apprequire
	0.2		07-11-2010	Changes in module/package id and uri writing
\-------------------------------------------------------------------------------------*/
/**
 * Testing an implementation of CommonJS modules and Package loading
 * Based on CommonJS (http://www.commonjs.org), discussions on the Google Groups CommonJS lists 
 * (http://groups.google.com/group/commonjs), RequireJS 0.14.5 (James Burke), 
 * FlyWrap.js (copyright Jimmy Page) and utility code of Ext Core / ExtJS 3.2.1.
 * For documentation how to use this: http://code.tolsma.net
 */
 
/**
 * Closure definition with 'this' refering to 'window'
 */
(function () {
	var global = this,											// 'window' scope
		UNDEF,													// undefined constant for comparison functions
		tString = Object.prototype.toString,					// short version of toString for isxxxx functions
		doc = global.document,									// DOM document reference
		horb = doc.getElementsByTagName("head")[0] || doc.getElementsByTagName("body")[0], // get location of scripts in DOM
		testInteractive = !!global.ActiveXObject,				// test if IE for onload workaround... (
		
		// end of shortcuts, define real vars... ;-)
		context = {												// main context
			package: null,											// main package/module
			modules: {},											// All defined packages/modules in this context
			timeout: 6000											// 6 seconds scriptag load timeout before error
		},
		scripts = [],											// current loading scripts...
		defQueue = [],											// modules waiting to be defined
		defPackages = [];										// package configs waiting to be used

	/**
	 * Returns true if the passed value is a JavaScript array, otherwise false.
	 * @param {Mixed} value The value to test
	 * @return {Boolean}
	 */
	function isArray(v){
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
	 */
	function mixin(target, source, force) {
		for (var prop in source) {
			if (!(prop in target) || force) {
				target[prop] = source[prop];
			}
		}
	};
	

	/********************************************************************************************
	* Module Class																				*
	********************************************************************************************/

	/**
	 * Module class definition
	 * @param {object} context The loaders context this module is working in
	 * @param {Package object} package The parent Package this module is working in
	 * @param {string} id The context global id of this Module
	 * @param {string} uri The URI of the file in which this module is declared
	 */
	function Module(context, package, id, uri) {
		this.context = context;
		this.package = package;
		this.id = id;
		this.uri = uri;
		
		this.exports = null;
		this.creatorFn = null;
		this.module = null;
		this.deps = [];
	};
	
	/**
	 * Local require function
	 * Five 'legal' possible uses:
	 * 	- id, deps, delayFn (ensure)
	 *	- id, delayFn (ensure)
	 *	- deps, delayFn (ensure)
	 *	- id (require)
	 *	- id, deps (require, not following CommonJS)
	 */
	 
	 //***********************************************************************************************************************
	 // async require needs to be implemented (delayFn is defined but not used at this moment)
	 //***********************************************************************************************************************
	 
	Module.prototype.require = function(id, deps, delayFn) {
		if (isArray(id)) {
			delayFn = deps;
			deps = id;
			id = '';
		}
		
		if (typeof deps === 'function') {
			delayFn = deps;
			deps = [];
		};
		
		if (deps === UNDEF) deps = [];
		
		// normalize id if not empty
		id = (id === '') ? id : this.resolveId(id);
		
		//*****************************************************************************************************************************************
		// Aanpassen  !!!!  Specificatie zegt dat er een error ge-'throw'ed moet worden als de exports van de module niet bestaat
		//*****************************************************************************************************************************************
		
		if (!this.context.modules[id] || this.context.modules[id].createFn) {
			// requested module not there or id = '' (ensure call)
			var result = [],
				ids = deps.concat(id);
			for(; id = ids.pop();){
				result.push([id, this]);
			}
			
			this.loadModules(result, delayFn); // ensure callback is called when all modules are loaded
			return UNDEF;
		}
		
		// just a normal require call and return exports if requested module 
		return this.context.modules[id].exports;
	}
	
	/**
	 * Callled when a 'module' or 'transport' script file is loaded. Will clean scrip var and call procesModQueue
	 * to process all defined modules in the defQueue. Can be overridden for specialized or extra processing after
	 * scriptload (i.e. see Package class as example...)
	 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
	 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
	 */
	Module.prototype.procesQueues = function(script, state){
		// do nothing because already parsed this scriptload
		if (script._done) return;
		
		// clean script var of callback functions etc.
		this.cleanScriptTag(script);

		// process the module defQueue
		this.procesModQueue(script, state);
	}
	
	/**
	 * Callled when a 'module' or 'transport' script file is loaded and declared inline module or transport modules need to be parsed
	 * for dependencies. If all dependencies are available all not parsed modules can be parsed with correct dependency paths.
	 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
	 */
	Module.prototype.procesModQueue = function(script) {
		// move all new modules to modulelist
		var modules = this.context.modules,
			def,
			id,
			rootPackage,
			i;
			
		for (i=0; def = defQueue[i]; i++){
			// if interactive then get module def specific script var
			if (testInteractive) script = def[3];
			rootPackage = script._package;
			
			// get correct id.
			if (def[0]) {
				// Named module. normalize id to parent package
				id = this.resolveId(def[0], rootPackage);
			} else {
				// nameles module so use script module id (wich is already normalized) 
				id = script._moduleId;
			}
			
			// if module doesn't exist then create one 
			if (!modules[id]) {
				modules[id] = new Module(this.context, rootPackage, id, script.src);
			}
			
			// check first if the module's creatorFn already is defined, that means double define, and thats not allowed !!
			if (modules[id].creatorFn === null) { 
				modules[id].define(def[1], def[2]);
			}
		};
		// clear for following load
		defQueue = [];
		
		// resolve new dependencies if all scripts are loaded
		if (scripts.length == 0) {
			var deps = [];
			iterate(modules, function(key, mod) {
				// if exports is defined then module is ready so skip
				if (mod.exports === null) {
					// dependencies defined ??
					if (mod.deps.length > 0) {
						var dep;
						// walk through the dependencies to check if the module dependencies already exist and if not load them
						for (i=0; dep=mod.deps[i]; i++) {
							if (!mod.context.modules[dep]) deps.push([dep, mod]);
						};
					}
				}
			});
			if (deps.length > 0) {
				this.loadModules(deps, null);
			}
		}
		
		// while loading dependency scripts or all scripts loaded try to evaluate all elegible modules by calling createFn
		iterate(modules, function(key, mod) {
			// if exports is not defined and there is a creatorFn then look if you can create the module
			if ((mod.exports === null) && (mod.creatorFn !== null)) {
				// recursive 
				mod.create();
			}
		});
	}
	
	/**
	 * Initialize Module.exports by calling creatorFn if all dependencies are ready..
	 */
	 
	 //***********************************************************************************************************************
	 // circular dependency (a needs b and b needs a) needs to be solved in following code !!!)
	 //***********************************************************************************************************************
	 
	Module.prototype.create = function() {
		var dep,
			i;
			
		// if already created then don't need to do anything so return true;
		if (this.exports !== null) return true;
		
		// not created but also not defined so return false
		if (this.creatorFn === null) return false;
		
		// walk through the dependencies to check if the module dependencies already exist and if not load them
		for (i=0; dep=this.deps[i]; i++) {
			var depMod = this.context.modules[dep];
			if (depMod === UNDEF) {
				// dependency module does not exist so return with false
				return false;
			} else if (depMod.exports === null) {
				// dependency module is not created and it returns that it can't be created then return with false too 
				if (!depMod.create()) return false;
			};
		};
		// ah, all dependency modules are ready, create mine!!
		// need reference to require function
		// need reference to exports
		// need reference to module object with id and uri of this module
		// do mixin of result and this.exports
		this.exports = {};
		mixin(this.exports, this.creatorFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
		
		// this module is defined so return true
		return true;
	}
	
	Module.prototype.returnRequire = function (){
		var that = this;
		return function(){
			return context.package.require.apply(that, arguments);
		}
	}

	Module.prototype.returnModule = function (){
		// already created so return that
		if (!this.module) {
			// else fill new module
			this.module = {
				id : this.id,
				uri : this.uri
			}
		}
		return this.module;
	}
	
	Module.prototype.define = function(deps, creatorFn) {
		this.deps = this.resolveIds(deps);
		this.creatorFn = creatorFn;
	}

	/**
	 * Local module/transport load function. Resolve id to full path id's. Checks if module is already loading and 
	 * if not defines script tag with this.createModule as callback function if file loaded. 
	 * @param {array} ids Array of module id and ParentModule Arrays to be loaded
	 * @param {function} fn Callback function to be called when all referenced id's (with dependencies) are defined and available
	 */
	Module.prototype.loadModules = function(ids, fn) {
		var mod,
			id,
			rootPackage,
			uri;
		
		for (; mod = ids.pop();){
			// resolve context rooted (/x/y/z), package rooted (x/y/z) and module relative (./y/z) to context rooted id's
			id = this.resolveId(mod[0], mod[1]);
			if (!this.context.modules.hasOwnProperty(id)){
				uri = this.resolveURI(id, mod[1].package);
				this.context.modules[id] = new Module(this.context, mod[1].package, id, uri);
				this.insertScriptTag(id, uri + ".js", mod[1].package, this.procesQueues, this);
			}
		}
	}

	/**
	 * Resolve an array of id's
	 * @return {array} Array of resolved id's
	 */	
	Module.prototype.resolveIds = function(ids) {
		var result = [];
		
		each(ids, function(id){
			result.push(this.resolveId(id));
		}, this);
		
		return result;
	}

	/**
	 * Resolve a context rooted (/x/y/z), package rooted (x/y/z) and module relative ./y/z or ../y/z) id to a context rooted id (/x/y/z)
	 */	
	Module.prototype.resolveId = function(id, package) {
		var baseID,
			part;
		
		// if package is defined then use that else use this modules package
		package = (package === UNDEF) ? this.package : package;	
			
		if (id.charAt(0) === "/") {
			// already in context rooted form, only split for . and .. checking
			id = id.split("/");
		} else if (id.charAt(0) === ".") {
			// lop off the last part of this module's id and concat with given id without the dot 
			baseID = (this.id === '') ? ['',''] : this.id.split("/");
			baseID = baseID.slice(0, baseID.length - 1);
			id = baseID.concat(id.split("/"));
		} else {
			// assume package rooted form so concat with that
			baseID = (package.id === '') ? [''] : package.id.split("/");
			id = baseID.concat(id.split("/"));
		}
		
		// remove inline . and .. items as is described in convention
		for (var i = 0; ((part = id[i]) !== UNDEF); i++) {
			if (part === ".") {
				id.splice(i, 1);
				i -= 1;
			} else if (part === "..") {
				id.splice(i - 1, 2);
				i -= 2;
			}
		}
		// return created globally unique id
		var dummy = id.join("/");
		return dummy;
	}

	/**
	 * Resolve from a context rooted id (/x/y/z) a root packages (i.e. parent package of module)
	 */	
	Module.prototype.resolveRootPackage = function(id) {
		var baseID,
			i;
		
		// split id 
		baseID = id.split("/");
		
		// repeat until package found
		for (i=baseID.length; i>0; i--) {
			// cut the end off current path
			baseID = baseID.slice(0, baseID.length - 1);
			// is this id path a package module
			if (this.context.modules[baseID.join("/")] instanceof Package) {
				return this.context.modules[baseID.join("/")];
			}
		}
		// if no package found, return context root package 
		return this.context.package;
	}
		
	/**
	 * Resolve a context rooted id (/x/y/z) to an full URI by also taking packages into account
	 */	
	Module.prototype.resolveURI = function(id, package) {
		var baseID;
		
		// if no slah in front put one to normalize output
		id = (id.charAt(0) === "/") ? id : '/'+id;
		
		// if base package is undefined then use current package uri
		package = (package === UNDEF) ? this.package : package; 
		baseID = package.uri.split("/");
		baseID = baseID.slice(0, baseID.length - 1);
		return baseID.join("/") + id;
	}

	/**
	 * Create scripttag for given id, uri and callback/scope function
	 */
	Module.prototype.insertScriptTag = function(id, uri, package, cb, scope) {
		// create file tag from scripttag
		var file = doc.createElement("script");
		file._moduleId = id;
		file._package = package;
		file._timer = setTimeout(this.scriptTimer(file, cb, scope), this.context.timeout);
		file.type = "text/javascript";
		file.onload = file.onreadystatechange = this.scriptLoad(file, cb, scope);
		file.src = uri;
		
		// closure save for later use
		scripts.push(file);
		
		// insert scripttag
		horb.insertBefore(file, horb.firstChild);
	}
	
	/**
	 * clean all temporary vars to prevent possible memory leaking
	 */
	Module.prototype.cleanScriptTag = function(script) {
		script._done = true;
		script.onload = script.onreadystatechange = new Function("");
		if (script._timer) clearTimeout(script._timer);
		each(scripts, function(s, index){
			if (script === s) scripts.splice(index, 1);
		})
	}
	
	/**
	 * Returns a closure function that will be called when the script is loaded
	 */
	Module.prototype.scriptLoad = function(script, cb, scope) {
		return function(){
			if (script._done || (typeof script.readyState != "undefined" && script.readyState != "loaded"))
				return;							// not yet ready loading
			cb.call(scope, script, true);		// call the callback function with the correct scope and error indication
		};
	}
	
	/**
	 * Returns a closure function that will be called when a script insertion times out
	 */
	Module.prototype.scriptTimer = function(script, cb, scope) {
		return function(){
			script._timer = 0;					// timer is already used else I wouldn't be here... ;-)
			cb.call(scope, script, false);		// call the callback function with the correct scope and error indication
		};
	}
	
	/********************************************************************************************
	* Package Class																				*
	********************************************************************************************/

	/**
	 * Package class definition
	 * @param {object} context The loaders context this Package is working in
	 * @param {Package object} package The parent Package this Package is working for
	 * @param {string} id The context global id of this Package
	 * @param {string} uri The URI of the file in which this Package is declared
	 */
	function Package(context, package, id, uri, mapcfg) {
		this.cfg = mapcfg;			// the config is this config until a package definition is loaded
		
		// if no parent package then parent package is self (for initialization of root module/package)
		package = (package === null) ? this : package;
		
		// first cal the parent class (Module) with context, parent package and id path in parent package..
		Module.call(this, context, package, id, uri);
	};
	Package.prototype = new Module();

	/**
	 * Start loading a package definition in this package
	 */
	Package.prototype.loadPackageDef = function(main){
		// check if other then standard definition filename is given
		main = (main) ? main + '.js' : this.resolveURI('/package.js', this);
		
		// insert the scripttag with the correct variables
		this.insertScriptTag(this.id, main, this, this.procesQueues, this);
	}
	
	/**
	 * Callled when a 'package', 'module' or 'transport' script file is loaded. Will clean scrip var and
	 * call procesPackageDef and procesModQueue to process all defined packages and modules in the Queues.
	 * Can be overridden for specialized or extra processing after scriptload (i.e. see Package class as example...)
	 * @param {ScriptDom} script The script dom object with 'extra' added properties (_done, etc)
	 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
	 */
	Package.prototype.procesQueues = function(script, state){
		// do nothing because already parsed this scriptload
		if (script._done) return;
		
		// clean script var of callback functions etc.
		this.cleanScriptTag(script);

		// process the package definition
		this.procesPackageDef(script);
		
		// process the module defQueue
		this.procesModQueue(script, state);
	}
	
	/**
	 * Process a package load by reading the package definition
	 */
	Package.prototype.procesPackageDef = function(script){
		var map,
			i, def,
			rootPackage,
			modules = this.context.modules;

		for (; def = defPackages.pop();){
			// if interactive then get package def specific script var
			if (testInteractive) script = def[1];
			rootPackage = script._package;

			rootPackage.cfg = def[0],														// get config and save also for later use
			map = (def[0].mappings) ? def[0].mappings : {};									// if mappings config then take that else empty object
			
			// add lib dir to module uri location if available in cfg
			this.uri = (def[0].directories && def[0].directories.lib) ? this.resolveURI(def[0].directories.lib+'/', this) : this.uri;
			
			// iterate through all the mappings to create and load new packages
			iterate(map, function(newId, mapcfg) {
				var uri = mapcfg.location;													// get the location of the package
				newId = this.resolveId(newId, rootPackage);									// resolve the newId against the current package
				modules[newId] = new Package(this.context, rootPackage, newId, uri, mapcfg);// create new package
				modules[newId].loadPackageDef();											// and start loading its definition
			}, this);
		}
	}

	/********************************************************************************************
	* General Functions																			*
	********************************************************************************************/

	/**
	 * Called when a module in a loaded modules javascript file is declared/defined
	 */
	function declare(id, deps, delayFn) {
		var commentRegExp = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg,
			cjsRequireRegExp = /require\(["']([\w-_\.\/]+)["']\)/g;

		//Allow for anonymous functions
		if (typeof id !== 'string') {
			//Adjust args appropriately
			delayFn = deps;
			deps = id;
			id = null;
		}

		//This module may not have dependencies
		if (!isArray(deps)) {
			delayFn = deps;
			deps = [];
		}

		//If no name, no deps and delayFn is a function, then figure deps out by scraping code.
		if (!name && !deps.length && (typeof delayFn === 'function')) {
			//Remove comments from the callback string, then look for require calls, and pull them into the dependencies.
			delayFn.toString().replace(commentRegExp, "").replace(cjsRequireRegExp, function (match, dep) {
				deps.push(dep);
			});
		}

		var currentScript = null;
		// From the techniques in RequireJS (requirejs.org) by James Burke and Kris Zyp
		// If in IE 6-8 do the interactive concurrently Adding Script stuff.
		if (testInteractive) {
			each(scripts, function(script) {
				if (script.readyState === "interactive") {
					currentScript = script;
					return false;
				}
			});
		};

		//Always save off evaluating the def call until the script onload handler. This allows multiple modules to be in a file without prematurely
		//tracing dependencies, and allows for anonymous module support, where the module name is not known until the script onload event occurs.
		defQueue.push([id, deps, delayFn, currentScript]);
	}

	function definePackage(cfg) {
		var currentScript = null;
		// From the techniques in RequireJS (requirejs.org) by James Burke and Kris Zyp
		// If in IE 6-8 do the interactive concurrently Adding Script stuff.
		if (testInteractive) {
			each(scripts, function(script) {
				if (script.readyState === "interactive") {
					currentScript = script;
					return false;
				}
			});
		};
		//Always save off evaluating the cfg until the script onload handler.
		defPackages.push([cfg, currentScript]);
	}
	
	/**
	 * Do all initialization steps...
	 */
	function startup(cfg) {
		var scriptList = document.getElementsByTagName("script"),
			script,
			dataMain,
			src,
			m,
			i,
			defaultcfg = {
				name: 'main',
				deps : []
			},			
			rePkg = (cfg.baseUrlMatch) ? cfg.baseUrlMatch : /apprequire\.js/i;
			
		// set waitseconds if requested else standard is 10000 msec = 10 sec
		context.timeout = (cfg.waitSeconds) ? cfg.waitSeconds: 10000;
		
		//Figure out baseUrl and if there also the 'data-main' attribute value. Get it from the script tag with apprequire.js in it.
		for (i = scriptList.length - 1; i > -1 && (script = scriptList[i]); i--) {
			//Look for a data-main attribute to set main script for the page to load.
			dataMain = script.getAttribute('data-main');
		
			//Using .src instead of getAttribute to get an absolute URL.
			src = script.src;
			if (src) {
				m = src.match(rePkg);
				if (m) break;
			}
		}
		src = src.split("/");
		src = src.slice(0, src.length - 1);
		src = src.join("/") + '/';

		// if no config then create clean objects and after that mixin the default items if not existing
		cfg = (cfg) ? cfg : defaultcfg;
		mixin(cfg, defaultcfg);
		
		// create root/main package/module. Also set (context, package, id, uri, mapcfg)
		context.modules[''] = context.package = new Package(context, null, '', (cfg.baseUrl) ? cfg.baseUrl : src, cfg);
		
		// initialize global hooks
		initGlobals();
		
		// load Main script (if requested) in main package
		if (dataMain) {
			context.package.loadPackageDef(dataMain);
		}; 			
    }

	/**
	 * create all global hooks
	 */
	function initGlobals(){
		// define global require namespace with ensure function
		var require = global.require = context.package.returnRequire();
		require.ensure = global.require;
		require.package = definePackage;
		
		// define global module namespace with the declare functions
		require.main = global.module = context.package.returnModule();
		global.module.declare = declare;
		global.module.context = context; // added for firebug testing to check modules etc, ***** Delete for production !!!!!! *****
		
		// implemented for module compatibility with requireJS
		global.define = declare;
	}
	
	/********************************************************************************************
	* Running code																				*
	********************************************************************************************/

    /**
	 * Check for an existing version of the require function. If so, then exit out. Only allow
     * one version of require to be active in a page. However, allow for a require
     * config object, just exit quickly if require is already an actual function.
	 */
	if (typeof global.require !== "function") startup((typeof global.require !== "undefined") ? global.require : {});
	
}).call(typeof window === 'undefined' ? this : window); // take care that 'this' is 'window' and else the current 'this' scope...
