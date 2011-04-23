AppRequire
==========

AppRequire is a generic CommonJS Environment Framework implementation to test the philosopy of the [proposed framework description](http://stolsma.github.com/CommonJSFramework/).

##Use##

The only thing that needs to be done to use CommonJS modules and packages in every browser/server side scripting program is including one of the following scripts depending on your environment:

* apprequire.js - Implementing the total CommonJS environment (Modules, most used Module Loaders, Packages, main Package Loaders and Registry Connectors) with basic system modules (system and test)
* apprequire-debug.js - An uncompressed version of apprequire.js with coding comments.
* apprequire-lite.js - Implementing a lite version of the CommonJS environment (Modules, basic Module Loader, basic Packages, basic Package Loader and basic Registry Connector)
* apprequire-lite-debug.js - An uncompressed version of apprequire-lite.js with coding comments.

There are two way's to startup the system, use the data-context attribute or by calling exports.boot(cfg)

data-context example ([examples/datacontext](https://github.com/stolsma/apprequire/tree/framework/examples/datacontext)):
	<script data-context="{&#34;location&#34;: &#34;./modules/&#34;, &#34;main&#34;: &#34;program&#34;, &#34;timeout&#34;: 2000}" src="../apprequire-debug.js"></script>

exports.boot example ([examples/boot](https://github.com/stolsma/apprequire/tree/framework/examples/boot)):
	<script src="../apprequire-debug.js"></script>
	<script>
		exports.boot({
			"location": "./modules/", 
			"main": "program",
			"timeout": 2000
		});
	</script>

###Configuration JSON###

Future work: describing all the configuration options


Documentation
=============

  * [CommonJS Package Introduction](https://github.com/stolsma/apprequire/tree/master/docs/packages.md)


Contribute
==========

Collaboration Platform: [https://github.com/stolsma/apprequire](https://github.com/stolsma/apprequire)

Collaboration Process:

  1. Discuss your change on the github issue list
  2. Write a patch on your own
  3. Send pull request on github
  4. Discuss pull request on github to refine

You must explicitly license your patch by adding the following to the top of any file you modify
in order for your patch to be accepted:

    //  - <GithubUsername>, First Last <Email>, Copyright YYYY, MIT License


Credits
=======

This project would not be possible without the following:

  * [CommonJS](http://www.commonjs.org/) - For framing requirements into specifications
  * [BravoJS](http://code.google.com/p/bravojs/) - For a pure and clean CommonJS Modules/2 loader implementation
  * [NodeJS](http://nodejs.org/) - For providing a solid runtime used by default
  * [Firefox](http://getfirefox.com/) - For providing an amazing browser platform
  * [Firebug](http://getfirebug.com/) - For the amazing developer tool it is
  * [nodules](https://github.com/kriszyp/nodules) - For implementing and refining CommonJS Packages/Mappings/C
  * [pinf](https://github.com/cadorn/pinf) - For implementing and refining various designs and specifications
  * [Github](http://github.com/) - For igniting a generation of collaborative development
  * [JavaScript](https://developer.mozilla.org/en/javascript) - For the awesome language it is

This project uses code from:

  * [http://code.google.com/p/bravojs/](http://code.google.com/p/bravojs/)


Documentation License
=====================

[Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License](http://creativecommons.org/licenses/by-nc-sa/3.0/)

Copyright (c) 2011 [Sander Tolsma](http://sander.tolsma.net/)


Code License
============

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c) 2011 [Sander Tolsma](http://sander.tolsma.net/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
