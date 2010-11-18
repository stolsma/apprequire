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
	0.2		15-11-2010	Changes in module/package id and uri writing
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
		testInteractive = !!global.ActiveXObject,				// test if IE for onload workaround... 
		
		//The following are module state constants
		LOADING = 'LOADING',
		WAITING = 'WAITING',
		LOADED = 'LOADED',
		DEPENDENCY = 'DEPENDENCY',
		DEFINED = 'DEFINED',
		LOADERROR = 'LOADERROR',
		
		// end of shortcuts, define real vars... ;-)
		modules = {},											// All defined packages/modules
		timeout,												// after how many msecs will loading timeout
		scripts = [],											// current loading scripts...
		defQueue = [],											// modules waiting to be defined
		defPackages = [],										// package configs waiting to be used
		root = null;											// root package

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
	
	/**
	 * Apply the offset uri to the base uri (relative etc..)
	 * @param {uri} base The basepath to resolve to
	 * @param {uri} offset The offset to apply to the base path
	 */
	function resolveUri(base, offset) {
		// normalize end character
		if ((offset.charAt(offset.length-1) === '/') && (offset.length > 1)) offset = offset.substr(0, offset.length-1);
		
		// split base in seperate uri parts
		var pe = parseUri(base),
			baseId, part;
		
		// if offset is root'ed then only add first path of path (protocol, etc)
		if (offset.charAt(0) === '/') {
			// only get protocol from path else just proces offset
			return createUri(pe, offset);
		}
		
		// if offset is not root'ed (i.e. relative or hosted) look if protocol etc (parts before directory) exist (i.e. hosted, if so return offset
		baseId = parseUri(offset);
		baseId.directory = '';
		if (createUri(baseId, '') !== '') {
			return offset;
		};
		
		// ok, merge path.directory and offset and add protocol etc from path...
		baseId = (pe.path==='') ? [] : pe.path.split("/");
		baseId = baseId.concat(offset.split("/"));
		for (var i = 0; ((part = baseId[i]) !== UNDEF); i++) {
			if ((part === ".") || ((part === "") && (i > 0))) {
				baseId.splice(i, 1);
				i -= 1;
			} else if (part === "..") {
				baseId.splice(i - 1, 2);
				i -= 2;
				// if smaller then base then see if terms left
				if ((i < 0) && (baseId.length == 0)) {
					// no terms left so return empty string
					return createUri(pe, '');
				} else {
					// terms left so again at beginning of termlist
					i=0;
				}
			} 
		}
		// return created globally unique id
		return createUri(pe, baseId.join("/"));
	}

	/**
	 * Get the different parts of an uri
	 * Inspired by parseUri 1.2.2
	 * (c) Steven Levithan <stevenlevithan.com>
	 * MIT License
	 * @param {uri} str The uri to split
	 * @return {object} A splitted uri
	 */
	function parseUri(str) {
		var	o = {
				key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
				q: {
					name: "queryKey",
					parser: /(?:^|&)([^&=]*)=?([^&]*)/g
				},
				parser: {
					strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
				}
			},
			m   = o.parser.strict.exec(str),
			uri = {},
			i   = 14;
	
		while (i--) uri[o.key[i]] = m[i] || "";
	
		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});
	
		return uri;
	}
	
	/**
	 * Return a 
	 * @param {object} pe The path elements created by parseUri
	 * @param {string} path The path string to use in the new Uri. If not defined pe.directory will be used as path part.
	 * @return {string} Combined Uri
	 */
	function createUri(pe, path) {
		var r;
		r = ((pe.protocol) ? (pe.protocol + '://') : '');
		r = r + ((pe.authority) ? pe.authority : '');
		return r + ((path) ? path : ((pe.directory) ? pe.directory : ''));
	}
	
	/**
	 * Cut the last term from a URI string
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Path without last term
	 */
	function cutLast(uri){
		uri = uri.split('/');
		uri = uri.slice(0, uri.length-1);
		return uri.join("/"); 
	}
	
	/**
	 * Cut the last term from a URI string and return it
	 * @param {string} uri The path string to cut the last term off.
	 * @return {string} Last term
	 */
	function getLast(uri){
		uri = uri.split('/');
		uri = uri.slice(uri.length-1);
		return uri[0];
	}
	
	/********************************************************************************************
	* Module Class																				*
	********************************************************************************************/

	/**
	 * Module class definition
	 * @param {Package object} package The parent Package this module is working in
	 * @param {string} id The global id of this Module
	 * @param {string} uri The URI of the file in which this module is declared
	 */
	function Module(parentPackage, id, uri) {
		this.parentPackage = parentPackage;
		this.id = id;
		this.uri = uri;
		this.state = LOADING;
		
		this.exports = {};
		this.creatorFn = null;
		this.module = null;
		this.deps = [];
		
		// see if this module is also the main of the parent package. If so, set this module as parent package main module.
		// needs to be done before real creation call to solve dependency problems using require.main !!
		if ((this instanceof Package === false) && this.parentPackage && (this.id === this.parentPackage.mainId)) {
			this.parentPackage.setMainModule(this.exports, this.creatorFn, this.deps, WAITING);
		}
	};
	
	/**
	 * Local require function
	 * Two 'legal' possible uses:
	 * 	- deps, delayFn (ensure)
	 *	- id (require)
	 */
	 
	 //***********************************************************************************************************************
	 // async require needs to be implemented (delayFn is defined but not used at this moment)
	 //***********************************************************************************************************************
	 
	Module.prototype.require = function(id, deps, delayFn) {
		if (isArray(id)) {
			delayFn = deps;
			deps = id;
			id = null;
		}
		
		if (typeof deps === 'function') {
			delayFn = deps;
			deps = [];
		};
		
		if (deps === UNDEF) deps = [];
		
		// normalize id if not empty
		id = (id === '') ? id : ((id.charAt(0) === '.') ? resolveUri(cutLast(this.id), id) : resolveUri(this.parentPackage.id, id));
		
		if (id === null) {
			// id = null so it is an ensure call
			var result = [], i, dep;
			
			for (i=0; dep=deps[i]; i++) {
				// normalize dependancy id relative to the module requiring it
				dep = (dep.charAt(0) === '.') ? resolveUri(cutLast(this.id), dep) : resolveUri(this.parentPackage.id, dep);
				result.push([dep, this]);
			};
			
			this.loadModules(result, delayFn); // ensure callback is called when all modules are loaded
			return UNDEF;
		} else if (!modules[id]) {
			// module doesn't exist so throw error
			throw "Module: " + id + " doesn't exist!!";
		} else if ((modules[id].state === LOADING) || (modules[id].state === LOADERROR)) {
			// module exists but is not loaded (when error loading file)
			throw "Module: " + id + " is not loaded or in error state!!";
		}		
		
		// just a normal require call and return exports if requested module 
		return modules[id].exports;
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
	 * @param {bool} state True if scriptfile is loaded correctly, false if something went wrong
	 */
	Module.prototype.procesModQueue = function(script, state) {
		// move all new modules to modulelist
		var def,
			id,
			rootPackage,
			i,
			scriptModuleId = script._moduleId;
			
		// first handle all waiting modules to be defined	
		for (i=0; def = defQueue[i]; i++){
			// if interactive then get module def specific script var
			if (testInteractive && (def[3] !== null)) script = def[3];
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
				modules[id] = new Module(rootPackage, id, script.src);
			}
			
			// check first if the module state is loading, that means double define, and thats not allowed !!
			if (modules[id].state === LOADING) { 
				modules[id].define(def[1], def[2]);
			}
		};
		// clear for following load
		defQueue = [];
		
		// handle erors in loading by checking if timeout occured (all browsers) or if script is given loaded but in reality isn't (IE)
		if (!state || (modules[scriptModuleId].state === LOADING)) {
			// Set the state for this module to LOADERROR
			if (modules[script._moduleId]) modules[script._moduleId].setState(LOADERROR);
			// see if this module is also the main of the parent package. If so, set that state to LOADERROR too...
			if ((this instanceof Package === false) && this.parentPackage && (this.id === this.parentPackage.mainId)) {
				this.parentPackage.setMainModule(this.exports, this.creatorFn, this.deps, LOADERROR);
			}
		}
		
		// resolve new dependencies if all scripts are loaded
		if (scripts.length == 0) {
			var deps = [];
			iterate(modules, function(key, mod) {
				// if module is loaded then look for dependencies to load
				if (mod.state === LOADED) {
					// dependencies defined ??
					if (mod.deps.length > 0) {
						var dep;
						// walk through the dependencies to check if the module dependencies already exist and if not load them
						for (i=0; dep=mod.deps[i]; i++) {
							// if the dependent id doesnt exists push for loading
							if (!modules[dep]) deps.push([dep, mod]);
						};
					}
					// dependencies are being loaded for this module
					mod.setState(DEPENDENCY);
				}
			});
			if (deps.length > 0) {
				this.loadModules(deps, null);
			}
		}
		
		// while loading dependency scripts or all scripts loaded try to evaluate all elegible modules by calling createFn
		iterate(modules, function(key, mod) {
			// if in dependency state then look if you can create the module
			if (mod.state === DEPENDENCY) {
				// recursive 
				mod.create();
			}
		});
	}
	
	/**
	 * Initialize Module.exports by calling creatorFn if all dependencies are ready..
	 */
	Module.prototype.create = function(recursion) {
		var dep,
			i;
		
		// start recursionlist
		recursion = (recursion) ? recursion : {};
		
		// if already created then don't need to do anything so return true, if recursion or loaderror give true back too to get all the processing done;
		if ((this.state === DEFINED) || (this.state === LOADERROR) || recursion[this.id]) return true;
		
		// stil loading or not yet in dependency state so return false
		if ((this.state === LOADING) || (this.state === LOADED) || (this.state === WAITING)) return false;
		
		// add this module to already in recursion (to solve cyclic dependency)
		recursion[this.id] = true;
		// walk through the dependencies to check if the module dependencies already exist and if not load them
		for (i=0; dep=this.deps[i]; i++) {
			var depMod = modules[dep];
			if (depMod === UNDEF) {
				// dependency module does not exist so return with false
				return false;
			} else if (depMod.state !== DEFINED) {
				// dependency module is not created and it returns that it can't be created then return with false too 
				if (!depMod.create(recursion)) return false;
			};
		};
		delete recursion[this.id];
		
		// see if this module is also the main of the parent package. If so, update the parentPackage too...
		if ((this instanceof Package === false) && this.parentPackage && (this.id === this.parentPackage.mainId)) {
			this.parentPackage.setMainModule(this.exports, this.creatorFn, this.deps, DEFINED);
		}
		
		// ah, all dependency modules are ready, create mine!!
		// need reference to require function
		// need reference to exports
		// need reference to module object with id and uri of this module
		// do mixin of result and this.exports
		this.setState(DEFINED);		// set to true before initialization call because module can request itself.. (circular dep problems) 
		mixin(this.exports, this.creatorFn.call(null, this.returnRequire(), this.exports, this.returnModule()));
		
		// this module is defined so return true
		return true;
	}
	
	Module.prototype.returnRequire = function (){
		var that = this,
			reqFunction =  function(){
				return that.require.apply(that, arguments);
			}
		reqFunction.main = root.returnModule();
		return reqFunction;
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
		var i, dep;
		
		//Set state of this module to LOADED
		this.setState(LOADED);
		
		// normalize dependencies and set creatorFn
		for (i=0; dep=deps[i]; i++) {
			// normalize dependancy id relative to the module requiring it
			dep = (dep.charAt(0) === '.') ? resolveUri(cutLast(this.id), dep) : resolveUri(this.parentPackage.id, dep);
			this.deps.push(dep);
		};
		this.creatorFn = creatorFn;
	}

	/**
	 * Local module/transport load function. Resolve id to full path id's. Checks if module is already loading and 
	 * if not defines script tag with this.createModule as callback function if file loaded. 
	 * @param {array} ids Array of [normalized module ids, requestingModule] to be loaded
	 * @param {function} fn Callback function to be called when all referenced id's (with dependencies) are defined and available
	 */
	Module.prototype.loadModules = function(ids, fn) {
		var mod,
			id,
			pPackage,
			uri;
		
		for (; mod = ids.pop();){
			id = mod[0];
			
			// if module doesn't exist already 
			if (!modules.hasOwnProperty(id)){
				// get parent package of this id
				pPackage = this.resolveRootPackage(id);
				
				// get url path
				uri = pPackage.searchPath(id);
				
				// create module and load corresponding script
				modules[id] = new Module(pPackage, id, cutLast(uri));
				modules[id].insertScriptTag(id, uri + ".js", pPackage, modules[id].procesQueues, modules[id]); // set the module to load!!
			}
		}
	}
	
	Module.prototype.searchPath = function(id) {
		// cut id of parent package id
		id = id.replace(this.id, '');
		if (id.charAt(0) === '/') {
			id = id.substr(1);
		}
		
		// only return path of requested path id else return uri of id relative to parent package   
		return (this.path[id]) ? resolveUri(this.path[id], id.split("/").pop()) : resolveUri(this.uri, id);
	}

	/**
	 * Resolve package rooted (x/y/z) and module relative ./y/z or ../y/z) id to a global rooted id (x/y/z)
	 */	
	Module.prototype.resolveId = function(id, parentPackage) {
		// if package is defined then use that else use this modules package
		parentPackage = (parentPackage === UNDEF) ? this.parentPackage : parentPackage;	
		return resolveUri(parentPackage.id, id);
	}

	/**
	 * Resolve from a rooted id (/x/y/z) a root packages (i.e. parent package of module)
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
			if (modules[baseID.join("/")] instanceof Package) {
				return modules[baseID.join("/")];
			}
		}
		// if no package found, return root package 
		return root;
	}
		
	/**
	 * Resolve a global rooted id (/x/y/z) to an full URI by also taking packages into account
	 */	
	Module.prototype.resolveURI = function(id, parentPackage) {
		// if base package is undefined then use current package uri
		parentPackage = (parentPackage === UNDEF) ? this.parentPackage : parentPackage;
		return resolveUri(cutLast(parentPackage.uri), id); 
	}

	/**
	 * Create scripttag for given id, uri and callback/scope function
	 */
	Module.prototype.insertScriptTag = function(id, uri, parentPackage, cb, scope) {
		// create file tag from scripttag
		var file = doc.createElement("script");
		file._moduleId = id;
		file._package = parentPackage;
		file._timer = setTimeout(this.scriptTimer(file, cb, scope), timeout);
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
			if (script._done || (typeof script.readyState != "undefined" && !((script.readyState == "loaded") || (script.readyState == "complete")))) {
				return;							// not yet ready loading
			}
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
	
	Module.prototype.setState = function(state){
		this.state = state;
	}
	
	/********************************************************************************************
	* Package Class																				*
	********************************************************************************************/

	/**
	 * Package class definition
	 * @param {Package object} package The parent Package this Package is working for
	 * @param {string} id The global id of this Package
	 * @param {string} uri The URI of the file in which this Package is declared
	 */
	function Package(parentPackage, id, uri, mapcfg) {
		this.cfg = mapcfg;												// the config is this config until a package definition is loaded
		this.path = {};													// empty path config
		this.mainId = '';													// empty main module for this package
		
		// if no parent package then parent package is self (for initialization of root module/package)
		parentPackage = (parentPackage === null) ? this : parentPackage;
		
		// first cal the parent class (Module) with parent package and id path in parent package..
		Module.call(this, parentPackage, id, uri);
	};
	Package.prototype = new Module();

	/**
	 * Start loading a package definition in this package
	 */
	Package.prototype.loadPackageDef = function(file){
		var id;
		
		// check if other then standard definition path/filename is given
		if (file) {
			id = resolveUri(this.id, getLast(file));
			file = this.resolveURI(file+'.js', this);
		} else {
			id = resolveUri(this.id, 'package');
			file = this.resolveURI('package.js', this);
		}
		
		// insert the scripttag with the correct variables (id, uri, parentPackage, cb, scope)
		this.insertScriptTag(id, file, this, this.procesQueues, this);
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
		
		// handle erors in loading
		if (!state) {
			// see if this module is also the main of the parent package. If so, set that state to LOADERROR too...
			if (script._package.id === this.id) {
				// Set the state for this package to LOADERROR
				this.setState(LOADERROR);
			}
		}
		
		// clean script var of callback functions etc.
		this.cleanScriptTag(script);

		// process the package definition
		this.procesPackageDefs(script);
		
		// process the module defQueue
		this.procesModQueue(script, true);
		
		// see if main module is already defined else load it, can't do this check in procesPackageCfg
		// because waiting module defs loaded inline with the package def are not processed at that moment.
		if ((this.mainId !== '') && !modules[this.mainId]) this.loadModules([[this.mainId, this]]);
	}
	
	/**
	 * Process a package load by reading the package definition
	 */
	Package.prototype.procesPackageDefs = function(script){
		var def;

		for (; def = defPackages.pop();){
			// if interactive then get package def specific script var
			if (testInteractive) script = def[1];
			
			// proces config and save also for later use
			script._package.procesPackageCfg(def[0]);
		}
	}
	
	Package.prototype.procesPackageCfg = function(cfg) {
		var map;

		// copy cfg to this package
		this.cfg = cfg;																		// get config and save also for later use
		
		// see if main module is defined, if not set it up.
		this.mainId = (cfg.main) ? resolveUri(this.id, cfg.main) : this.mainId;
		
		// add lib dir to module uri location if available in cfg else use standard 'lib'
		this.uri = (cfg.directories && cfg.directories.lib) ? this.resolveURI(cfg.directories.lib, this) : this.resolveURI('lib', this);
		
		// iterate through all the paths to create new path references for this package
		map = (cfg.paths) ? cfg.paths : {};													// if paths config then take that else empty object
		iterate(map, function(newId, pathcfg) {
			this.path[newId] = resolveUri(this.uri, pathcfg);								// resolve the new path against the current lib package path
		}, this);
		
		// iterate through all the mappings to create and load new packages
		map = (cfg.mappings) ? cfg.mappings : {};											// if mappings config then take that else empty object
		iterate(map, function(newId, mapcfg) {
			var uri = mapcfg.location;														// get the location of the package
			newId = this.resolveId(newId, this);											// resolve the newId against the current package
			modules[newId] = new Package(this, newId, uri, mapcfg);							// create new package
			modules[newId].loadPackageDef();												// and start loading its definition
		}, this);
		
		// set state to WAITING
		this.setState(WAITING);
	}

	/**
	 * Set reference to main module for this package
	 */		
	Package.prototype.setMainModule = function(exports, creatorFn, deps, state) {
		this.exports = exports;
		this.creatorFn = creatorFn;
		this.deps = deps;
		
		// set state to given state (WAITING or DEFINED)
		this.setState(state);
	}
		
	/********************************************************************************************
	* General Functions																			*
	********************************************************************************************/

	/**
	 * Called when a module in a loaded modules javascript file is declared/defined
	 */
	function declare(id, deps, delayFn) {
		var commentRegExp = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;
		var	cjsRequireRegExp = /require\(["']([\w-_\.\/]+)["']\)/g;

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
				main: '',
				mainFunction: null,
				deps: [],
				location: '',
				directories: {
					lib: './lib'
				},
				waitSeconds: 6000,
				baseUrlMatch: /apprequire\.js/i
			},			
			
		// if no config then create clean objects and after that mixin the default items if not existing
		cfg = (typeof cfg == 'object') ? cfg : defaultcfg;
		mixin(cfg, defaultcfg);
		
		// set waitseconds
		timeout = cfg.waitSeconds;
		
		//Figure out if there is a 'data-main' attribute value. Get it from the script tag with cfg.baseUrlMatch as regexp.
		for (i = scriptList.length - 1; i > -1 && (script = scriptList[i]); i--) {
			//Look for a data-main attribute to set main script for the page to load.
			dataMain = script.getAttribute('data-main');
		
			//Using .src instead of getAttribute to get an absolute URL.
			src = script.src;
			if (src) {
				m = src.match(cfg.baseUrlMatch);
				if (m) break;
			}
		}
		
		// dataMain config has preference over cfg location tag (add dummy to circumvent premature / removal in resolveUri)
		src = (dataMain) ?  resolveUri(cutLast(global.location.href), dataMain) : resolveUri(global.location.href + 'dummy', cfg.location);
		// create root/main package/module, set (package, id, uri, mapcfg)
		root = modules[''] = new Package(null, '', src, cfg);
		// initialize global hooks
		initGlobals();
		
		// load Main script (if requested) in main package
		if (dataMain) {
			// load root package config from dataMain location
			root.loadPackageDef(dataMain);
		} else {
			// initialize root package with config
			root.procesPackageCfg(cfg);
			
			// see if main module/function is requested in cfg
			if ((cfg.main !== '') && (cfg.mainFunction !== null)) {
				// define main module
				declare(cfg.main, cfg.deps, cfg.mainFunction);
				root.procesModQueue({
					_package: root,
					_moduleId: cfg.main,
					src: global.location.href
				}, true);
			} else if (cfg.main !== '') {
				// want main module but no define function then try to load main module
				root.loadModules([[cfg.main, root]]);
			}
		}; 			
    }
	
	/**
	 * create all global hooks
	 */
	function initGlobals(){
		// define global require namespace with ensure function
		var require = global.require = root.returnRequire();
		require.ensure = global.require;
		require['package'] = definePackage; // array defenition because of minifier not accepting package propertie on objects... :-(
		
		// define global module namespace with the declare functions
		require.main = global.module = root.returnModule();
		global.module.declare = declare;
		global.module.modules = modules; // added for firebug testing to check modules etc, ***** Delete for production !!!!!! *****
		
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
