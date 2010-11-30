/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
(function(){var a=this,E,g=a.document,A=g.getElementsByTagName("head")[0]||g.getElementsByTagName("body")[0],Q=!!a.ActiveXObject,n="_",r="LOADING",j="LOADED",c="DEPENDENCY",p="DEFINED",l="READY",s="LOADERROR",z="WAITING",v={},w={},O,m=[],G=[],f=[],u=null,H={};function t(U){var T=Object.prototype.toString;return T.apply(U)==="[object Array]"}function q(U,T){return U===null||U===undefined||((t(U)&&!U.length))||(!T?U==="":false)}function N(X,W,V){if(q(X,true)){return}for(var U=0,T=X.length;U<T;U++){if(W.call(V||X[U],X[U],U,X)===false){return U}}}function e(V,U,T){if(q(V)){return}if(t(V)||V.callee){N(V,U,T);return}else{if(typeof V=="object"){for(var W in V){if(V.hasOwnProperty(W)){if(U.call(T||V,W,V[W],V)===false){return}}}}}}function R(V,U,T){for(var W in U){if(!(W in V)||T){V[W]=U[W]}}}function K(X,Y){if((Y.charAt(Y.length-1)==="/")&&(Y.length>1)){Y=Y.substr(0,Y.length-1)}var T=I(X),U,V;if(Y.charAt(0)==="/"){return S(T,Y)}U=I(Y);U.directory="";if(S(U,"")!==""){return Y}U=(T.path==="")?[]:T.path.split("/");U=U.concat(Y.split("/"));for(var W=0;((V=U[W])!==E);W++){if((V===".")||((V==="")&&(W>0))){U.splice(W,1);W-=1}else{if(V===".."){if(W==0){throw"Trying to enter forbidden path space. base: "+X+" offset: "+Y}U.splice(W-1,2);W-=2;if((W<0)&&(U.length==0)){return S(T,"")}else{W=0}}}}return S(T,U.join("/"))}function C(T,U){return K(T,U)+"/"}function I(X){var W={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/}},T=W.parser.strict.exec(X),V={},U=14;while(U--){V[W.key[U]]=T[U]||""}V[W.q.name]={};V[W.key[12]].replace(W.q.parser,function(Z,Y,aa){if(Y){V[W.q.name][Y]=aa}});return V}function S(T,V){var U;U=((T.protocol)?(T.protocol+"://"):"");U=U+((T.authority)?T.authority:"");return U+((V)?V:((T.directory)?T.directory:""))}function P(T){T=T.split("/");T=T.slice(1,T.length);return T.join("/")}function b(T){T=T.split("/");T=T.slice(0);return T[0]}function k(T){T=T.split("/");T=T.slice(0,T.length-1);return T.join("/")}function B(T){T=T.split("/");T=T.slice(T.length-1);return T[0]}function F(T){return v[n+T]}function L(U,T){return v[n+U]=T}function J(T){return w[n+T]}function i(T,U){return w[n+T]=U}function o(W,V,U){var T=F(W);if(T&&((T.state===p)||(T.state===l))){V.call(U)}else{H[W]={fn:V,scope:U}}}function x(T,V,U){this.parentPackage=T;this.id=V;this.uri=U;this.state=r;this.exports={};this.factoryFn=null;this.module=null;this.deps=[]}x.prototype={require:function(Z,Y,X){if(t(Z)){X=Y;Y=Z;Z=null}if(typeof Y==="function"){X=Y;Y=[]}if(Y===E){Y=[]}Z=(Z==="")?Z:this.resolveId(Z);if(Z===null){var T=[],V,W;for(V=0;W=Y[V];V++){W=this.resolveId(W);T.push(W)}this.parentPackage.loadModules(T,X);return E}var U=F(Z);if(!U){throw"Module: "+Z+" doesn't exist!!"}else{if(!U.createModule()||(U.state===r)||(U.state===s)){throw"Module: "+Z+" is not loaded or in error state!!"}}return U.exports},resolveId:function(U){if(U.indexOf("!")!==-1){return U}var T=this.id.substring(this.id.indexOf("!")+1);U=(U.charAt(0)===".")?K(k(T),U):K("",U);U=this.parentPackage.resolveMapping(U);return(U.id)?U.pPackage.uid+"!"+U.id:""},resolveDependencies:function(){var V=this.deps,T;if(V.length>0){var U;for(T=0;U=V[T];T++){U=this.resolveId(U);V[T]=U;if(!F(U)){this.parentPackage.loadModules(U,null)}}}this.setState(c)},checkDependencyState:function(T){var W,U;T=(T)?T:{};if((this.state===p)||(this.state===l)||(this.state===s)||T[n+this.id]){return true}if((this.state===r)||(this.state===j)||(this.state===z)){return false}T[n+this.id]=true;for(U=0;W=this.deps[U];U++){var V=F(W);if(V===E){return false}else{if(V.state!==p){if(!V.checkDependencyState(T)){return false}}}}delete T[n+this.id];this.setState(p);return true},createModule:function(){if(this.state===p){this.setState(l);R(this.exports,this.factoryFn.call(null,this.returnRequire(),this.exports,this.returnModule()))}return(this.state===l)?this:null},returnRequire:function(){var U=this,T=function(){return U.require.apply(U,arguments)};T.main=(u.mainId)?F(u.mainId).returnModule():{id:"",uri:""};return T},returnModule:function(){if(!this.module){this.module={id:this.id,uri:this.uri}}return this.module},define:function(U,T){this.setState(j);this.deps=U;this.factoryFn=T},setState:function(T){this.state=T}};function h(T,U){this.uid=T;this.uri=U;this.moduleUri=U;i(T,this);this.path={};this.mappings={};this.mainId=null;this.state=r}h.prototype={loadPackageDef:function(T){var U;if(T){U=this.addUid(B(T));T=K(this.moduleUri,T+".js")}else{U=this.addUid("package");T=K(this.moduleUri,"package.js")}this.insertScriptTag(U,T,this,this.procesQueues,this)},procesQueues:function(T,U){if(T._done){return}if(!U){if(T._package.uid===this.uid){this.setState(s)}}this.cleanScriptTag(T);this.procesPackageDefs(T);this.procesModQueue(T,true);if((this.mainId!==null)&&!F(this.mainId)){this.loadModules(this.mainId)}},procesPackageDefs:function(T){var U;for(;U=f.pop();){if(Q){T=U[1]}T._package.procesPackageCfg(U[0])}},procesPackageCfg:function(T){var U;if(T.uid&&T.uid!==this.uid){this.uid=T.uid;i(T.uid,this)}this.mainId=(T.main)?this.uid+"!"+T.main:null;if(this.mainId){o(this.mainId,this.startUp,this)}this.moduleUri=(T.directories&&T.directories.lib)?K(this.uri,T.directories.lib):K(this.uri,"lib");e(T.paths,function(W,V){this.setPath(W,C(this.moduleUri,V))},this);e(T.mappings,function(W,X){var V={};V.uri=(X.location)?C(this.uri,X.location):"";V.uid=(X.uid)?X.uid:V.uri;this.setMapping(W,V);if(!J(V.uid)){if(V.uri===""){throw"No mapping location for package: "+this.uid+" and mapping: "+W}(new h(V.uid,V.uri)).loadPackageDef()}},this);return this},procesModQueue:function(T,W){var V,Z,X,U,Y=T._moduleId;for(U=0;V=G[U];U++){if(Q&&(V[3]!==null)){T=V[3]}X=T._package;if(V[0]){Z=X.addUid(V[0])}else{Z=T._moduleId}if(!F(Z)){L(Z,new x(X,Z,T.src))}if(F(Z).state===r){F(Z).define(V[1],V[2])}}G=[];if(!W||((F(Y))&&(F(Y).state===r))){if(F(Y)){F(Y).setState(s)}}if(m.length==0){e(v,function(ab,aa){if(aa.state===j){aa.resolveDependencies()}})}e(v,function(ab,aa){if(aa.state===c){aa.checkDependencyState()}});e(H,function(ac,ad,aa){var ab=F(ac);if(ab&&((ab.state===p)||(ab.state===l))){ad.fn.call(ad.scope);delete aa.key}})},startUp:function(){var T=F(this.mainId);if(T){T.createModule()}},setState:function(T){this.state=T},addUid:function(T){return this.uid+"!"+T},searchPath:function(T){T=T.substring(T.indexOf("!")+1);return(this.getPath(T))?K(this.getPath(T),B(T)):K(this.moduleUri,T)},getPath:function(T){return this.path[n+T]},setPath:function(U,T){return this.path[n+U]=T},getMapping:function(T){return this.mappings[n+T]},setMapping:function(U,T){return this.mappings[n+U]=T},loadModules:function(W,V){var Y,T,X,U;W=(typeof W=="string")?[W]:W;for(;Y=W.pop();){if(!F(Y)){T=this.resolvePackage(Y);X=T.searchPath(Y);U=L(Y,new x(T,Y,k(X)));this.insertScriptTag(Y,X+".js",T,T.procesQueues,T)}}},resolvePackage:function(T){T=T.substring(0,T.indexOf("!"));return J(T)},resolveMapping:function(V){V=V.substring(V.indexOf("!")+1);var T={pPackage:this,id:V},U;if(U=this.getMapping(b(V))){V=P(V);T=J(U.uid).resolveMapping(V)}else{if(V===""){T.id=(this.mainId)?this.mainId.substring(this.mainId.indexOf("!")+1):null}}return T},insertScriptTag:function(Y,W,X,T,V){var U=g.createElement("script");U._moduleId=Y;U._package=X;U._timer=setTimeout(this.scriptTimer(U,T,V),O);U.type="text/javascript";U.onload=U.onreadystatechange=this.scriptLoad(U,T,V);U.onerror=this.scriptError(U,T,V);U.src=W;m.push(U);A.insertBefore(U,A.firstChild)},cleanScriptTag:function(T){T._done=true;T.onload=T.onreadystatechange=new Function("");T.onerror=new Function("");if(T._timer){clearTimeout(T._timer)}N(m,function(V,U){if(T===V){m.splice(U,1)}})},scriptLoad:function(U,T,V){return function(){if(U._done||(typeof U.readyState!="undefined"&&!((U.readyState=="loaded")||(U.readyState=="complete")))){return}T.call(V,U,true)}},scriptError:function(U,T,V){return function(){T.call(V,U,false)}},scriptTimer:function(U,T,V){return function(){U._timer=0;T.call(V,U,false)}}};function d(Y,X,W){var T=/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;var V=/require\(["']([\w-_\.\/]+)["']\)/g;if(typeof Y!=="string"){W=X;X=Y;Y=null}if(!t(X)){W=X;X=[]}if(!name&&!X.length&&(typeof W==="function")){W.toString().replace(T,"").replace(V,function(Z,aa){X.push(aa)})}var U=null;if(Q){N(m,function(Z){if(Z.readyState==="interactive"){U=Z;return false}})}G.push([Y,X,W,U])}function M(T){var U=null;if(Q){N(m,function(V){if(V.readyState==="interactive"){U=V;return false}})}f.push([T,U])}function D(V){var U=document.getElementsByTagName("script"),W,Z,aa,T,X,Y={main:null,mainFunction:null,deps:[],location:"",directories:{lib:"./lib"},waitSeconds:6000,baseUrlMatch:/apprequire\.js/i},V=(typeof V=="object")?V:Y;R(V,Y);O=V.waitSeconds;for(X=U.length-1;X>-1&&(W=U[X]);X--){Z=W.getAttribute("data-main");aa=W.src;if(aa){T=aa.match(V.baseUrlMatch);if(T){break}}}if(Z){if(Z.charAt(Z.length)==="/"){aa=Z;Z=null}else{aa=k(Z);Z=B(Z)}aa=K(k(a.location.href),aa)}else{aa=C(k(a.location.href),V.location)}u=new h("commonjs.org",aa);y();if(Z){u.loadPackageDef(Z)}else{u.procesPackageCfg(V);if((V.main!==null)&&(V.mainFunction!==null)){d(V.main,V.deps,V.mainFunction);u.procesModQueue({_package:u,_moduleId:V.main,src:a.location.href},true)}else{if(V.main!==null){u.loadModules(u.mainId)}}}}function y(){var T=a.require={};T["package"]=M;a.module={};a.module.declare=d;a.module.modules=v;a.module.packages=w;a.define=d}if(typeof a.require!=="function"){D((typeof a.require!=="undefined")?a.require:{})}}).call(typeof window==="undefined"?this:window);
