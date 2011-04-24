
(Following is text copied from https://github.com/kriskowal/lode/blob/master/README.md and after that adjusted to reflect my vision on General usable CommonJS/Packages/2.0)

CommonJS/Packages/2.0
---------------------

A CommonJS/Package/2.0 package supports multiple kinds of inter-package dependency and each package can be composed from several layered directory trees ("roots") depending on several conditions, like whether the package is being used in development or production, and whether the package is being used in a web page, browser extension, or server-side JavaScript embedding.


### Composition

A package can contain several roots. Which roots are incorporated depends on the loader options. For example, a package can be configured for use in web browsers with provisions for debugging. If so, a package may provide alternate modules by providing roots at `debug`, `engines/browser`, and `engines/browser/debug`. For example, a UUID package would use system-specific bindings on the server-side to achieve the highest levels of entropy, and would use an implementation based on `Math.random` on the client-side. These overrides are particularly useful since the server-side code would be dead-weight on the client-side. The most specific roots have the highest precedence.

The module name-space of a package is populated from several sources: the modules contained in its own roots, "mappings", and "includes". In order of precedence, they are "mappings", own modules, and "includes". All relative module identifiers are computed relative to the module name-space, not the file-system name-space from which they are derrived, so a relative module identifier can traverse into mappings and includes.

Mappings are packages that are included on a sub-tree of the module identifier space, as configured in the package's `package.json`. So, if a package is mapped to `foo` in the module name space, `require("foo")` would import its main module and `require("foo/bar")` would import the `bar` module from the `foo` package.

Includes are packages that are linked in priority-order under the package's root name space. These can be used to provide additional roots to a package, much like engine-specific roots or debug-specific roots. Includes are not merely a syntactic convenience: they are useful for mixing packages like themes in applications. Because included packages can intercept and override each-other's public name spaces, they are more tightly coupled than mappings and should be developed in tighter coordination.

Within CommonJS packages, the `require.paths` variable specified as optional by the CommonJS/Packages/1.0 specification, does not exist. The set of modules available within a package cannot be manipulated at run-time.


### Dependencies

A package's "main" module may be specified with the `"main"` property in `package.json`, as a path relative to the package root, including the file's extension or if an extension is not included `".js"` is assumed as extension.

    {
        "main": "foo.js"
    }

The package may provide `"includes"` and `"mappings"` properties.  `"includes"` must be an array of dependencies and `"mappings"` must be an object that maps module subtrees to dependencies.

    {
        "main": "foo.js",
        "includes": [
            "https://example.com/baz.zip"
        ],
        "mappings": {
            "bar": "mappings/bar",
            "resources": {"capability": "resources"}
        }
    }

There are presently three styles of dependency:
	* inter-package dependency,
	* capability dependency,
	* and system dependency.

All dependencies can be expressed with an object with various properties, but inter-package dependencies can be simple URL strings.


#### Inter-package Dependency

A Inter-package Dependency has an `href` URL property that refers to another package by its URL relative to the current package. Since URL's are a strict super-set of Unix paths, a relative path will suffice for the `href` if the other package is on the same file system (including file systems inside archives). Dependency packages can be simple directories, or can be zip files either on the same file system or on the web. If a package is on the web, both "http" and "https" (for SSL) protocols are supported.

A Inter-package Dependency may also have a `hash` property with the first 40 hexidecimal characters of the SHA-256 hash of the package's modules and resources, digested in sorted order respectively from their byte buffers. These hashes are intended to be eventually used to verify that the version of a dependency matches the expected version, as a cache key so packages can be retrieved from a cache of compiled packages, and as a URL for versioned packages hosted from CDN's.

Inter-package Dependencies will also eventually support an additional property that will permit CommonJS Module Systems to alternately fetch a package from the web or use a local copy in a specified relative location. This will be useful for development and publishing new packages.


#### Capability Dependency

A capability dependency has a `capability` property with the name of a capability provided by the host system. Capabilities must be explicitly injected by the container to give a package permission to use authority-bearing API's like access to a file-system or browser chrome. They're also useful for bringing in packages that can't otherwise be obtained by downloading another package.

For example, the `"package@0"` capability brings in the package introspection capability, that gives a package access to its own bundled resources.

`foo/package.json`:

    {
        "main": "main.js",
        "resources": [
            "package.json",
            "data"
        ],
        "mappings": {
            "self": {"capability": "package@0"}
        }
    }

`foo/main.js`:

    var self = require("self");
    var config = self.read("package.json", "utf-8");
    console.log(JSON.parse(config));

This is useful for including templates and similar resources. All resources are loaded asynchronously before execution, so take care to only include as many as you are willing to pay at load-time. The resource tree is constructed by overlaying the resource trees of included packages, so, for example, packages can mix and match resources for themes. If a resource overrides a resource from another package, the overridden resource will not be read, so it won't contribute to the load-time of the package.

Another capability example is that a package can request access to the server-side internal API's (Node's modules for example). The `capability` property of the dependency must note that it requires the `node@0.4` API and add this as a mapping to package configuration.

    {
        "mappings": {
            "node": {"capability": "node@0.4"}
        }
    }

A package can also opt to "include" the Node API's in its own module name-space. 

    {
        "includes": [
            {"capability": "node@0.4"}
        ]
    }

It is the intent to create more and finer-grain capabilities, and an API and perhaps a user-interface for mediating capabilities for suspicious packages.

There is not yet any mechanism for white-listing capabilities that a package is (and its dependencies are) permitted to use.


#### System Dependency

A system dependency has a `system` property with the name of a module that must be provided by the host system. System dependencies allow CommonJS/Packages/2.0 systems to use modules that are installed into the host system (for example modules in Node's `require.paths`) and is a stop-gap until all packages that have to be installed on the local system can be exposed to packages through capabilities instead.

    {
        "mappings": {
            "system": "coffee-script"
        }
    }

A CommonJS/PAckages/2.0 system does not attempt to install system dependencies, so if they are not available, they will cause run-time errors.


### Alternate Languages

A package can specify another package as the provider of a compiler for alternate source-code languages. The compiler package must provide a main module with a `compile(text)` function that returns JavaScript. Compilers are prioritized and selected based off of the existence of a file with a matching extension.

    {
        "languages": {
            ".coffee": "languages/coffee-script"
        }
    }

This gets translated internally into an array of language records, each with an `extension` property and another property describing how to handle the language, in this case, using the bundled CoffeeScript compiler package. The default handler, if none is provided, is the standard JavaScript module loader. It may eventually be possible to bundle a package with an interpreter dependency.

    {
        "languages": [
            {
                "extension": ".coffee",
                "compiler": "languages/coffee-script"
            }
        ]
    }

If a single package root provides multiple files for which there are matching language extensions, the package linkage will contain a warning in its `warnings` property indicating that there were multiple candidates for the given module identifier, and which one was elected based on the priority order of the languages.

Since a compiler can produce JavaScript before a working-set executes and is not necessary during the execution of a package, compilers are not incorporated into the linkage of a package.  This means that compiler packages are not included in package bundles or package bundle dependencies, so they don't need to be loaded by a browser.

In the future, `interpreter` may be provided as an alternative to `compiler`, in which case a package will be bundled with the source code for the module as a resource and the interpreter package will be included in the working-set as a dependency, so it can be executed either on the client or the server.


### Configuration

Presently, the `package.json` of a CommonJS/Package/2.0 package must explicitly note that it is a CommonJS/Package/2.0 package.

    {
        "CJSPackage20": true
    }

If a package is intended to be used by other package-management systems; like NPM, Teleport, and Jetpack; then use the CommonJS/Packages `overlays` property, where package-system-specific properties can be provided.

    {
        "overlays": {
            "CJSPackage20": {
            },
            "teleport": {
            }
        }
    }

If a package provides an overlay for CJSPackage20, the package does not need a root-level `CJSPackage20` property; CJSPackage20 infers it.

`/!\` NPM 0.3 dropped support for the `overlays` property, which means that, if a package is intended to be used with NPM, it must provide its configuration at the root and all other package management systems must use the `overlays` property to override NPM-specific properties. This also means that, should any other package managers drop support for `overlays`, they will be mutually incompatible.


#### Configuring Composition

By default, all modules in a package are publically linked. The set of public module identifiers can be restricted by providing a `"public"` array of top-level module identifiers in the package configuration.

    {
        "public": ["foo", "bar", "baz"]
    }


#### Compatibility Switches

A package may opt-in to support the RequireJS `define` boilerplate in modules.

    {
        "CJSPackage20": true,
        "supportDefine": true
    }

With this option enabled, modules will have a `define` free variable. The `define` function takes a callback as its last argument that in turn accepts `require`, `exports`, and `module`. All other arguments to `define` are ignored, and the callback is called.  If the callback returns an object, that object replaces the module's given exports object.

    define(id?, deps?, function (require, exports, module) {
        return exports;
    });

For example:

    define(function (require) {
        return {"a": 10, "b": 20};
    });

Or, the literal declaration notation:

    define({
        "a": 10,
        "b": 20
    });

A package may opt-in to make the `define` wrapper mandatory, in which case failing to call define will cause a module factory to throw an error.

    {
        "requireDefine": true
    }


CJSPackage20 Modules
--------------------

CJSPackage20 modules have the following free variables:

### `exports`

The public API of the module, which can be augmented or replaced. You can replace a module's exports by returning an alternate object.

Assigning to `module.exports` is a Node-specific extension to the CommonJS specification. To embrace existing code, this practice is presently tolerated in CJSPackage20 modules, but may eventually be restricted to a legacy loader for NPM-style packages.

### `require(id)`

Returns a module given a relative or top-level module identifier. A relative module identifier is prefixed with a "./" or a "../".  Module identifiers may use "." and ".." terms to traverse the module name space like file system directories, but ".." above the top of the module name space ("") is not defined and may throw an error.

### `module`

The module meta-data object contains information about the module itself.  This may include its `id`, `path`, `directory`, `url`, or a subset thereof depending on where it comes from. The `module` object is only guaranteed to have an `id`

### `require.main`

If a package is loaded with the `lode` executable, or if it is loaded using the internal API and executed with `pkg.require.exec(id, scope_opt)`, `require.main` is set to the `module` object corresponding to that call. By convention, you can check whether the module you are presently in is the main module like:

    if (require.main === module)
        main();

The Node-specific `__filename` and `__dirname` free variables do not appear in Lode packages. Also, Lode does not respect the Node convention that a `foo/index.js` file gets linked to the module identifier `foo` in place of `foo.js`.
