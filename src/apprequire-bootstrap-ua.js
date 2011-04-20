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
	 * Setup the extra module environment by using the defined CommonJS system environment
	 * @param {Object} cfg Normalized cfg object with all possible cfg items filled with correct settings
	 */
	function createExtraModuleEnv(cfg) {
		var context;

		// delete declare and addClass because only in use for bootstrap phase...
		delete cfg.env.module.declare;
		delete cfg.env.module.addClass;

		// create context with current cfg, and the System Module list.
		context = system.createContext(cfg, systemModules);
			
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
			//cls.addClass(system);
			system.addClass(cls.name, cls[cls.name]);
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
