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
	0.1		02-10-2010	Creation of first skelleton version of general tests.
\-------------------------------------------------------------------------------------*/
/**
 * Testing an implementation of CommonJS modules and Package loading
 * Based on CommonJS (http://www.commonjs.org).
 * For documentation how to use this: http://code.tolsma.net
 *
 * This file is loaded first by require after loading and initializing the apprequire.js file
 */
 
/**
 * First step is to pass a main package config object with configurations to the main package
 */
require.package({
	name: 'main',													// unique identifier of this package
	description: 'This is the main package definition',				// description of this package
	homepage: 'http://code.tolsma.net',								// homepage with descriptions of this package and for example news about new versions..
	
	main: 'main',													// main module that represents the package
	directories: {
		lib: '.'													// root directory of the module files relative to this file.. (in this case the lib dir)
	},
	
	maintainers: [{													// owner(s) of the code in this package
		name: 'Sander Tolsma',
		email: 'stolsma@tolsma.net',
		web: 'http://code.tolsma.net'
	}],
	
	// for the paths test...
	paths: {
		"assert": '..',
		"test": '..'
	},
	
	// mapping from root id to the location of the system packages.
	mappings: {
		'pack1': {
			location: '/webapps/examples/require/tests/apprequire/packages/pack1/',	// location of this package
			name: 'pack1', 											// unique identifier of this package
			version: '0.1.0'										// the version of this package
		},
		'pack2': {
			location: '/webapps/examples/require/tests/apprequire/packages/pack2/',	// location of this package
			name: 'pack2', 											// unique identifier of this package
			version: '0.1.0'										// the version of this package
		}
	}
});

/**
 * define the global exports module
 */
define(['./test/run'], function (require, exports, module) {
		exports.test = 'Main module for root';
		
		// and run the test
		require('./test/run');
});
