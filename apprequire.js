/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010-2011 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
var require,exports,module;if(typeof exports==="undefined"){exports={}}exports.boot=function(){var UNDEF,contextList=[],defaultcfg={directories:{lib:"./lib"},commonjsAPI:{},modules:{},debug:true,timeout:6000,baseUrlMatch:/apprequire/i},commonjsAPI={cml:"coreModuleLayer",context:"genericContext",contextPlugins:["genericPackage"],loader:"scriptLoader",loaderPlugins:["moduleTransport"],systemModules:["system"]},CJS_TYPE_Context="context";function mixin(target,source,force){for(var prop in source){if(!(prop in target)||force){target[prop]=source[prop]}}}function cutLastTerm(uri){uri=uri.split("/");uri=uri.slice(0,uri.length-1);return uri.join("/")}function getLastTerm(uri){uri=uri.split("/");uri=uri.slice(uri.length-1);return uri[0]}function bootCommonJS(contextCfg){}function getContextConfig(document,baseUrlMatch){var scriptList,script,src,i,result;scriptList=document.getElementsByTagName("script");for(i=scriptList.length-1;i>-1&&(script=scriptList[i]);i--){src=script.src;if(src){if(src.match(baseUrlMatch)){result=script.getAttribute("data-context");break}}}if(result){if(JSON){result=JSON.parse(result)}else{result=!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(result.replace(/"(\\.|[^"\\])*"/g,"")))&&eval("("+result+")")}}return result}function bootstrapReady(api,modules){for(var prop in api){if(!(api[prop] in modules)){return false}}return true}function addModule(id,dep,factoryFn,contextCfg){var modules=contextCfg.modules,commonjsAPI=contextCfg.commonjsAPI,context;if((typeof id=="string")&&(id!==UNDEF)){modules[id]={dep:dep,factoryFn:factoryFn};if(bootstrapReady(commonjsAPI,modules)){delete contextCfg.env.module.declare;context=modules.execute(commonjsAPI[CJS_TYPE_Context]);if(!context||!(context=context.create(contextCfg))){throw new Error("No correct CommonJS Module API declaration!!")}contextList.push(context)}}else{throw new Error("Invalid bootstrap module declaration!!")}}function bootExtraModuleEnvironment(contextCfg){contextCfg.modules.execute=function(id){var exports={};if(this[id]){mixin(exports,this[id].factoryFn.call(null,null,exports,null));return exports}else{throw new Error("(bootstrap.modules.execute) Module for given id doesnt exists!")}return UNDEF};contextCfg.env.module={declare:function(id,deb,factoryFn){addModule(id,deb,factoryFn,contextCfg)}}}function setupConfig(env,cfg){if(env===UNDEF){throw new Error("Invalid environment in setupConfig bootstrap! ")}mixin(cfg,defaultcfg);if(env.document!==UNDEF){mixin(cfg,getContextConfig(env.document,cfg.baseUrlMatch),true)}mixin(cfg,{location:""});if(cfg.location==""){cfg.location=cutLastTerm(env.location.href)}mixin(cfg.commonjsAPI,commonjsAPI);return cfg}function boot(env,commonjs){var contextCfg=setupConfig(env,{env:env});if(commonjs){return bootCommonJS(contextCfg)}else{return bootExtraModuleEnvironment(contextCfg)}}return boot}();if(typeof require!=="undefined"){exports.boot=exports.boot({location:{protocol:"memory:",href:"memory://apprequire/"},require:require,exports:exports,module:module},true)}else{exports.boot(window,false)}module.declare("coreModuleLayer",[],function(e,q,c){var l,h="_",a="INIT",b="READY";function m(u,t,s){for(var v in t){if(!(v in u)||s){u[v]=t[v]}}}function f(){this.modules={}}f.prototype={getModule:function(s){return this.modules[h+s]},setModule:function(t,s){return this.modules[h+t]=s},existModule:function(s){return(this.modules[h+s]!==l)}};function i(s){this.uid=s;this.store=new f()}i.prototype={require:function p(t){var s;if(s=this.store.getModule(t)){return s.createModule()}return l},memoize:function j(u,t,s){if(!this.store.existModule(u)){this.store.setModule(u,new r(u,t,s,this));return true}return false},isMemoized:function d(s){return this.store.existModule(s)},provide:function n(t,s){return false},getMain:function o(s){return this.require("")},id:function g(s){return s},resolveId:function k(u,w){if(w.charAt(0)==="."){w=u+"/"+w;var v=w.split("/");var s=[];var t;if(w.charAt(w.length-1)==="/"){v.push("INDEX")}for(t=0;t<v.length;t++){if(v[t]=="."||!v[t].length){s.pop();continue}if(v[t]==".."){if(!s.length){throw new Error("Invalid module path: "+path)}s.pop();s.pop();continue}s.push(v[t])}w=s.join("/")}return w}};function r(v,u,t,s){this.id=v;this.deps=u;this.factoryFn=t;this.cms=s;this.exports={};this.module=null;this.state=a}r.prototype={require:function(t){t=(t==="")?t:this.cms.resolveId(this.id,t);var s=this.cms.require(t);if(!s){throw"Module: "+t+" doesn't exist!!"}return s},ensure:function(v,s){var u=[];if(v===l){v=[]}for(var t=0;v[t];t++){u.push(this.cms.resolveId(this.id,v[t]))}this.cms.provide(u,s);return l},createModule:function(){if(this.state===a){this.state=b;m(this.exports,this.factoryFn.call(null,this.returnRequire(),this.exports,this.returnModule()))}return(this.state===b)?this.exports:null},returnRequire:function(){var t=this,s=function(){return t.require.apply(t,arguments)};s.ensure=function(){return t.ensure.apply(t,arguments)};return s},returnModule:function(){if(!this.module){this.module={id:this.cms.id(this.id),}}return this.module}};q.create=function(s){return new i(s)}});module.declare("genericContext",[],function(c,d,b){var j,i="_",e="cml",a="loader";function f(){this.store={}}f.prototype={get:function(k){return this.store[i+k]},set:function(l,k){return this.store[i+l]=k},remove:function(l){var k=this.store[i+l];if(k!==j){delete this.store[i+l]}return k},exist:function(k){return(this.store[i+k]!==j)}};function g(){this.loaders=new f()}g.prototype={addLoader:function(l,k){this.loaders.set(l,k)},load:function(p,l){var o,n,m,k;for(o=0;n=p[o];o++){m=this.getScheme(n.uri);if((k=this.loaders.get(m))===j){return false}k.load(n.uri+n.id,n.api,this.createLoadedCb(n,l))}},loaded:function(m,k,l){if(k!==j){k.call(null,m,l)}},createLoadedCb:function(n,l){var m=this;return function k(){m.loaded.call(m,n,l,arguments)}},getScheme:function(k){return"http"}};function h(k){var m=this;this.cfg=k;this.moduleSubs=new f();this.loading=new f();this.deferred=[];this.startupLoader(k);this.startupCML(k);if(k.location&&k.main){this.provide("commonjs.org",k.main,function l(){m.moduleSubs.get("commonjs.org").cml.require(k.main)})}}h.prototype={startupCML:function(p){var m=p.modules,l=p.commonjsAPI,o=p.env,n=this,r;r=m.execute(l[e]);if(!r||!(r=r.create("commonjs.org"))){throw new Error("No correct CommonJS Module Layer declaration!!")}this.moduleSubs.set("commonjs.org",{cml:r,uri:p.location});r.provide=function q(u,t){n.provide(this.uid,u,t)};this.addSystemModules(r,l,m);o.module.cml=r;o.require=function k(){return r.require.apply(r,arguments)};o.require.isMemoized=function s(){return r.isMemoized.apply(r,arguments)}},addSystemModules:function(o,k,l){var m,n;for(m=0;n=k.systemModules[m];m++){o.memoize(n,l[n].deps,l[n].factoryFn)}},startupLoader:function(m){var n=m.modules,l=m.commonjsAPI,o=m.env,k;k=n.execute(l[a]);if(!k||!(k=k.create(m))){throw new Error("No correct CommonJS Loader Layer declaration!!")}o.module.cfg=m;o.module.loaderBase=this.loaderBase=new g();this.loaderBase.addLoader("http",k)},provide:function(m,p,k){var l,o,n=[];p=(typeof p=="string")?[p]:p;for(l=0;o=p[l];l++){o=this.getCMLId(m,o);if((!this.loading.exist(o.uri+o.id))&&(!o.cml.isMemoized(o.id))){o.api=this.createAPI(o.id,o.uid);this.loading.set(o.uri+o.id,o);n.push(o)}}if(n.length){this.loaderBase.load(n,this.provideCallback(n,k))}else{k.call(null)}},provideCallback:function(q,k){var n,m,o=this,p=[];for(n=0;m=q[n];n++){p.push(m.uri+m.id)}return function l(u,r){var t,s;o.loading.remove(u.uri+u.id);for(t=0;s=p[t];t++){if(s==u.uri+u.id){break}}if(s!==j){p.splice(t,1);if(p.length==0){k.call(null,r)}}else{throw new Error("Wrong resource returned for this callback!! (context.provideCallback)")}}},getCMLId:function(k,l){var m=this.moduleSubs.get(k);return{cml:m.cml,uid:k,uri:m.uri,id:l}},createAPI:function(l,o){var k=this.moduleSubs.get(o).cml;return{cmsuri:k.uri,deps:[],memoize:function n(s,r,q){if(s===null){s=l}if(r===j){r=[]}for(var p=0;r[p];p++){r[p]=k.resolveId(s,r[p]);this.deps.push(r[p])}k.memoize(s,r,q)},loadReady:function m(p){k.provide(this.deps,p);this.deps=[]}}}};d.create=function(k){return new h(k)}});module.declare("genericPackage",[],function(b,d,a){var i;var e={};function h(k){if((k.length>0)&&(k.charAt(k.length-1)!=="/")){k=k+"/"}return e[objEscStr+k]}function g(l,k){if((l.length>0)&&(l.charAt(l.length-1)!=="/")){l=l+"/"}return e[objEscStr+l]=k}function j(l,k){if(!k){k=""}if(h(k+getFirstTerm(l)+"/")){k=k+getFirstTerm(l)+"/";l=cutFirstTerm(l);return j(l,k)}return{URI:h(k)+l,id:l}}function f(k){var l;if(k.uid&&k.uid!==this.uid){this.uid=k.uid;setPackage(k.uid,this)}this.mainId=(k.main)?this.uid+packageDelimiter+k.main:null;if(this.mainId){addDefer(this.mainId,this.startUp,this)}this.moduleUri=(k.directories&&k.directories.lib)?resolveUri(this.uri,k.directories.lib):resolveUri(this.uri,"lib");iterate(k.paths,function(n,m){this.setPath(n,resolvePath(this.moduleUri,m))},this);this.createMappings(k.mappings);return this}function c(k){iterate(k,function(m,n){var l={};l.uri=(n.location)?resolvePath(this.uri,n.location):"";l.uid=(n.uid)?n.uid:l.uri;this.setMapping(m,l);if(!getPackage(l.uid)){if(l.uri===""){throw"No mapping location for package: "+this.uid+" and mapping: "+m}(new Package(l.uid,l.uri)).loadPackageDef()}},this)}d.commonjs={create:function(k){}}});module.declare("scriptLoader",[],function(c,b,d){var e;function a(j){var i=Object.prototype.toString;return i.apply(j)==="[object Array]"}function h(j,i){return j===null||j===undefined||((a(j)&&!j.length))||(!i?j==="":false)}function f(n,m,l){if(h(n,true)){return}for(var k=0,j=n.length;k<j;k++){if(m.call(l||n[k],n[k],k,n)===false){return k}}}function g(k){var j,o,n,l=k.modules;this.env=k.env;this.testInteractive=!!k.env.ActiveXObject;this.timeout=k.timeout;this.scripts=[];this.transports=[];if((j=k.commonjsAPI.loaderPlugins)!==e){for(var m=0;o=j[m];m++){n=l.execute(o);if(!n||!(n=n.create(k,this))){throw new Error("No correct CommonJS loaderPlugin: "+o+" declaration!!")}this.transports.push(n)}}}g.prototype={load:function(k,j,i){if(i===e){return false}k+=".js";this.callTransports("initEnv",[this.env,k,j]);this.insertScriptTag(k,[k,j,i],this.ready,this);return true},ready:function(j,k,l){var i;if(k._done){throw new error("2nd time script ready call!!");return}this.cleanScriptTag(k);j.push(l);this.callTransports("loadReady",j)},getActiveURI:function(){var k,j;if(this.testInteractive){for(k=0;j=this.scripts[k];k++){if(j.readyState==="interactive"){return j._moduleURI}}}return e},callTransports:function(n,m){var j=this.transports.length,k,l;for(k=0;l=this.transports[k];k++){if(l[n]==e){throw new error("Transport plugin: "+l.name+" doesn't have function: "+n)}else{l[n].apply(l,m)}}},insertScriptTag:function(n,k,j,m){var o=this.env.document,i=o.getElementsByTagName("head")[0]||o.getElementsByTagName("body")[0],l=o.createElement("script");l._moduleURI=n;l._timer=setTimeout(this.scriptTimer(l,k,j,m),this.timeout);l.type="text/javascript";l.onload=l.onreadystatechange=this.scriptLoad(l,k,j,m);l.onerror=this.scriptError(l,k,j,m);l.src=n;this.scripts.push(l);i.insertBefore(l,i.firstChild)},cleanScriptTag:function(i){i._done=true;delete i._moduleURI;i.onload=i.onreadystatechange=new Function("");i.onerror=new Function("");if(i._timer){clearTimeout(i._timer)}f(this.scripts,function(k,j){if(i===k){this.scripts.splice(j,1)}},this)},scriptLoad:function(k,j,i,l){return function(){if(k._done||(typeof k.readyState!="undefined"&&!((k.readyState=="loaded")||(k.readyState=="complete")))){return}i.call(l,j,k,true)}},scriptError:function(k,j,i,l){return function(){i.call(l,j,k,false)}},scriptTimer:function(k,j,i,l){return function(){k._timer=0;i.call(l,j,k,false)}}};b.create=function(i){return new g(i)}});module.declare("moduleTransport",[],function(c,b,d){var e,h="_";function a(j){var i=Object.prototype.toString;return i.apply(j)==="[object Array]"}function g(){this.store={}}g.prototype={get:function(i){return this.store[h+i]},set:function(j,i){return this.store[h+j]=i},remove:function(j){var i=this.store[h+j];if(i!==e){delete this.store[h+j]}return i},exist:function(i){return(this.store[h+i]!==e)}};function f(i,j){this.defQueue=[];this.parent=j;this.apiStore=new g()}f.prototype={name:"moduleTransport",initEnv:function(j,l,i){var k=this;this.apiStore.set(l,i);if(!j.module){j.module={}}j.module.declare=function m(){k.declare.apply(k,arguments)}},loadReady:function(l,p,m,j){var k,n,o,r,q=[];for(n=0;k=this.defQueue[n];n++){if(k[3]!==e){o=k[3]}else{o=l}r=this.apiStore.get(o);r.memoize(k[0],k[1],k[2])}this.defQueue=[];p.loadReady(m);this.apiStore.remove(l)},declare:function(n,m,k){var i=/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;var l=/require\(["']([\w-_\.\/]+)["']\)/g;var j;if(typeof n!=="string"){k=m;m=n;n=null}if(!a(m)){k=m;m=[]}if(!name&&!m.length&&(typeof k==="function")){k.toString().replace(i,"").replace(l,function(o,p){m.push(p)})}j=this.parent.getActiveURI();this.defQueue.push([n,m,k,j])}};b.create=function(i,j){return new f(i,j)}});module.declare("system",[],function(b,a,d){var e=(typeof importScripts==="function");function c(i,h,f){if(e){postMessage([i,h,f])}else{var g=window;if(window.parent&&window.parent[i]){g=window.parent}if(g[i]){g[i](h,f)}}}a.stdio={print:function(f,g){c("printResults",f,g)}}});module.declare("test",["system"],function(b,a,c){var d=b("system");a.print=function(){var e=d.stdio;e.print.apply(e,arguments)};a.assert=function(f,e){if(f){a.print("PASS "+e,"pass")}else{a.print("FAIL "+e,"fail")}}});
