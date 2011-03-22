#AppRequire#

AppRequire is a generic CommonJS Environment Framework implementation to test the philosopy of the proposed framework description.

##Use##

The only thing that needs to be done to use CommonJS modules in every browser is including one of the following scripts:

* apprequire.js - Implementing the total CommonJS environment (Modules, most used Module Loaders, Packages, main Package Loaders and Registry Connectors) with basic system modules (system and test)
* apprequire-debug.js - An uncompressed version of apprequire.js with coding comments.
* apprequire-lite.js - Implementing a lite version of the CommonJS environment (Modules, basic Module Loader, basic Packages, basic Package Loader and basic Registry Connector)
* apprequire-lite-debug.js - An uncompressed version of apprequire-lite.js with coding comments.

There are two way's to startup the system, use the data-context or by calling exports.boot(cfg)

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

