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