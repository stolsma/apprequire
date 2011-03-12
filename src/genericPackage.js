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