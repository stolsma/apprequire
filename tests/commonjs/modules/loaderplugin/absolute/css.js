/*-------------------------------------------------------------------------------------\
	Copyright (c) 2008 Sander Tolsma
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
	0.7		01-12-2010	First version 
\-------------------------------------------------------------------------------------*/

define('css', [], function (require, exports, module) {
	/**
	 * When a module loader needs to resolve a module id in the loader plugin form, it
	 * shall load the loader plugin module referenced by the string before the '!' character.
	 * It shall then call the function exported as the "load" property from loader plugin
	 * module exports. The load() function shall be called with the following signature:
	 * loaderModulePlugin.load(targetResourceId, parentRequire, loaded)
	 * @param {string} resourceId The remaining string after the '!' character in the module id
	 * that is being resolved.
	 * @param {function} pRequire The require() (or equivalent) function that was or would be
	 * provided to the calling module, that is the module is requesting the resource or module 
	 * using a module id with the loader plugin form.
	 * @param {function} loaded The callback function that shall be called when the resource is
	 * resolved and it shall be called with a single argument, the resolved exported value of
	 * the referenced module id. 
	 */
	exports.load = function(resourceId, pRequire, loaded) {
//		loaded({});
		var url = pRequire.toUrl(resourceId),
			name = 'c'; // get last part minus the .css extension
		
		// start loading the css file
		genCSSNode(url+'.css', createCssLoaded(loaded), name);
	}
	
	/**
	 * Create callback function for whenever a css package finishes loading. 
	 * executed by timed routine which checks css property change
	 */
	createCssLoaded = function(loaded) {
		return function() {
			loaded.call(null, {});
		}
	}

	/**
	 * create DOM 'link' node in head
	 * need to find a solution for the css file race conditions. herewith a solution as described at: http://wonko.com/post/how-to-prevent-yui-get-race-conditions
	 * @param {string} CSSPath URL definition to add to DOM 'link' node 'href' attribute
	 * @param {function} cb Function to call when css is loaded
	 */
	genCSSNode = function(CSSPath, cb, cssName) {
		var objHead = document.getElementsByTagName('head');						// add a link tag (CSS sheet) to the head of the page
		if (objHead[0]) {
			var objCSS = document.createElement('link');
//			var elementNode = Ext.get(objCSS);
			objCSS.rel = 'stylesheet';
			objCSS.type = 'text/css';
			objCSS.href = CSSPath;
			objHead[0].appendChild(objCSS);
		}
		
//		if (Ext.isGecko || Ext.isSafari) {
		if (true) {
			var el = document.createElement('div');									// add dom element to check on
			el.id = 'css-done-' + cssName;											// give it a id
			document.body.appendChild(el);
			setTimeout(createCssPoll(cb, cssName, el), 1);							// check later if css is loaded
		} else {
			if (cb) {
				Ext.isIE ? elementNode.on('readystatechange', function(){
					(this.dom.readyState == 'loaded' || this.dom.readyState == 'complete') && cb(); 
				}) : elementNode.on("load", cb);
			}
		}
	}
	
	createCssPoll = function (cb, cssName, el) {
		return cssPoll = function() {
			if (getStyle(el, 'display') === 'none') {
				// Once the element's display property changes, we know the CSS has finished loading.
//				el.remove();
				if (cb) cb.call(this);												// call callback		
			} else {
				// The element's display property hasn't changed yet, so call this function again in 5ms.
				setTimeout(createCssPoll(cb, cssName, el), 5);						// check later if css is loaded
			}
		}
	}
	
	getStyle = function(el, styleProp) {
		if (el.currentStyle)
			var y = el.currentStyle[styleProp];
		else if (window.getComputedStyle)
			var y = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		return y;
	}
	
});