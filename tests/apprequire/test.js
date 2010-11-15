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
	0.1		02-10-2010	Creation of first skelleton version of test.js
\-------------------------------------------------------------------------------------*/
/**
 * Testing an implementation of CommonJS modules and Package loading
 * Based on CommonJS (http://www.commonjs.org), original idea and code from
 * https://github.com/alexyoung/turing-test.js (Alex Young http://dailyjs.com/)
 * For documentation how to use this: http://code.tolsma.net
 */

define(function (require, exports, module) {
	var logger, Tests, printMessage;
	
	printMessage = (function() {
		if (typeof console !== 'undefined') {
			return console.log;
		} else if (typeof window !== 'undefined') {
			return function(message) {
				var li = document.createElement('li');
				li.innerHTML = message;
				document.getElementById('results').appendChild(li);
			}
		} else {
			return function() {};
		}
	})();
	
	logger = {
		display: function(message) {
			printMessage(message);
		},
		
		error: function(message) {
			this.display('E: ' + message);
		},
		
		fail: function(message) {
			this.display('F: ' + message);
		}
	};
	
	Tests = {
		results: [],
		passed: 0,
		failed: 0,
		errors: 0,
		
		clear: function() {
			this.results = [];
			this.passed = 0;
			this.failed = 0;
			this.errors = 0;
		},
		
		Result: function(testName) {
			return { name: testName, message: null };
		},
		
		run: function(testName, obj) {
			var result = new Tests.Result(testName);
		
			function showException(e) {
				if (!!e.stack) {
					logger.display(e.stack);
				} else {
					logger.display(e);
				}
			}
		
			try {
				// TODO: Setup
				obj[testName]();
				this.passed += 1;
			} catch (e) {
				if (e.name === 'AssertionError') {
					result.message = e.toString();
					logger.fail('Assertion failed in: ' + testName);
					showException(e);
					this.failed += 1;
				} else {
					logger.error('Error in: ' + testName);
					showException(e);
					this.errors += 1;
				}
			} finally {
			  // TODO: Teardown
			}
		
			this.results.push(result);
		},
		
		report: function() {
			logger.display('Passed: ' + this.passed);
			logger.display('Failed: ' + this.failed);
			logger.display('Errors: ' + this.errors);
		}
	};
	
	exports.run = function(obj) {
		Tests.clear();
		for (var testName in obj) {
			// TODO: Run objects that match ^test
			if (testName.match(/^test/i)) Tests.run(testName, obj);
		}
		Tests.report();
	};

});	