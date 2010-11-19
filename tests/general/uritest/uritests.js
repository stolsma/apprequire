// URI and ID function tests

(function () {
	var UNDEF;													// undefined constant for comparison functions
	
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
				if (i < 0) return createUri(pe, '');
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
	
	var i, test,
		tests = [
		 { input1: '-', input2: 'eerste set rooted-relative'} 
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '.', output: '/webapps/require/tests/apprequire/lib/main' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: './', output: '/webapps/require/tests/apprequire/lib/main' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: './test', output: '/webapps/require/tests/apprequire/lib/main/test' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: './test/run', output: '/webapps/require/tests/apprequire/lib/main/test/run' }

		,{ input1: '-', input2: 'tweede set non rooted-relative'}
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '.', output: 'webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: './', output: 'webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: './test', output: 'webapps/require/tests/apprequire/lib/main/test' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: './test/run', output: 'webapps/require/tests/apprequire/lib/main/test/run' }

		,{ input1: '-', input2: 'derde set hosted-relative'}
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '.', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: './', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: './test', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/test' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: './test/run', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/test/run' }
		
		
		,{ input1: '-', input2: 'eerste set rooted-relative backwards'}
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '..', output: '/webapps/require/tests/apprequire/lib' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '../', output: '/webapps/require/tests/apprequire/lib' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '../test', output: '/webapps/require/tests/apprequire/lib/test' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '../test/run', output: '/webapps/require/tests/apprequire/lib/test/run' }

		,{ input1: '-', input2: 'tweede set non rooted-relative backwards'}
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '..', output: 'webapps/require/tests/apprequire/lib' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '../', output: 'webapps/require/tests/apprequire/lib' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '../test', output: 'webapps/require/tests/apprequire/lib/test' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '../test/run', output: 'webapps/require/tests/apprequire/lib/test/run' }

		,{ input1: '-', input2: 'derde set hosted-relative backwards'}
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '..', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '../', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '../test', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/test' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '../test/run', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/test/run' }


		,{ input1: '-', input2: 'eerste set rooted-direct'}
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'hello', output: '/webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'hello/', output: '/webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'hello/test', output: '/webapps/require/tests/apprequire/lib/main/hello/test' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'hello/test/run', output: '/webapps/require/tests/apprequire/lib/main/hello/test/run' }

		,{ input1: '-', input2: 'tweede set non rooted-direct'}
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'hello', output: 'webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'hello/', output: 'webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'hello/test', output: 'webapps/require/tests/apprequire/lib/main/hello/test' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'hello/test/run', output: 'webapps/require/tests/apprequire/lib/main/hello/test/run' }

		,{ input1: '-', input2: 'derde set hosted-direct'}
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'hello', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'hello/', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'hello/test', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/hello/test' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'hello/test/run', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/hello/test/run' }
		
		
		,{ input1: '-', input2: 'eerste set rooted-rooted'}
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '', output: '/webapps/require/tests/apprequire/lib/main' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '/', output: '/' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '/test', output: '/test' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: '/test/run', output: '/test/run' }

		,{ input1: '-', input2: 'tweede set non rooted-rooted'}
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '', output: 'webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '/', output: '/' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '/test', output: '/test' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: '/test/run', output: '/test/run' }

		,{ input1: '-', input2: 'derde set hosted-rooted'}
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '/', output: 'http://code.tolsma.net/' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '/test', output: 'http://code.tolsma.net/test' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: '/test/run', output: 'http://code.tolsma.net/test/run' }


		,{ input1: '-', input2: 'eerste set rooted-hosted'}
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/', output: 'http://code.tolsma.net/hello' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test', output: 'http://code.tolsma.net/hello/test' }
		,{ input1: '/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test/run', output: 'http://code.tolsma.net/hello/test/run' }
		
		,{ input1: '-', input2: 'tweede set non rooted-hosted'}
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test', output: 'http://code.tolsma.net/hello/test' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test/run', output: 'http://code.tolsma.net/hello/test/run' }
		
		,{ input1: '-', input2: 'derde set hosted-hosted'}
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test', output: 'http://code.tolsma.net/hello/test' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main', input2: 'http://code.tolsma.net/hello/test/run', output: 'http://code.tolsma.net/hello/test/run' }


		,{ input1: '-', input2: 'eerste set slash ending tests'}
		,{ input1: '/webapps/require/tests/apprequire/lib/main/', input2: 'hello', output: '/webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main/', input2: 'hello', output: 'webapps/require/tests/apprequire/lib/main/hello' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/', input2: 'hello', output: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/hello' }
		
		,{ input1: '/webapps/require/tests/apprequire/lib/main/', input2: 'http://code.tolsma.net/hello/test/run/', output: 'http://code.tolsma.net/hello/test/run' }
		,{ input1: 'webapps/require/tests/apprequire/lib/main/', input2: 'http://code.tolsma.net/hello/test/run/', output: 'http://code.tolsma.net/hello/test/run' }
		,{ input1: 'http://code.tolsma.net/webapps/require/tests/apprequire/lib/main/', input2: 'http://code.tolsma.net/hello/test/run/', output: 'http://code.tolsma.net/hello/test/run' }
		
		,{ input1: '/', input2: 'hello', output: '/hello' }
		,{ input1: '', input2: 'hello', output: 'hello' }
		,{ input1: '', input2: '/hello', output: '/hello' }
		,{ input1: '', input2: './hello', output: 'hello' }
		,{ input1: '', input2: '../hello', output: '' }
		,{ input1: 'http://code.tolsma.net/', input2: 'hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'http://code.tolsma.net/', input2: '/hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'http://code.tolsma.net/', input2: './hello', output: 'http://code.tolsma.net/hello' }
		,{ input1: 'http://code.tolsma.net/', input2: '../hello', output: 'http://code.tolsma.net/' }
		,{ input1: '-', input2: ''}
	];
	
	for (i = 0; (test = tests[i]); i++){
		if (test.input1 === '-') {
			console.log('====================================================================================================================');
		} else {
			var result = resolveUri(test.input1, test.input2);
			if (result == test.output) {
				console.log('Passed! combine ' + test.input1 + ' with ' + test.input2 + '   result: ' + result);
			} else {
				console.log('Failed! input1: ' + test.input1 + '   input2: ' + test.input2);
				console.log('        output: ' + test.output);
				console.log('        result: ' + result);
			}
		}
	}
	
}).call(typeof window === 'undefined' ? this : window); // take care that 'this' is 'window' and else the current 'this' scope...
