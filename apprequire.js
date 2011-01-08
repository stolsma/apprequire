/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
/**
 * AppRequire - http://code.tolsma.net/apprequire
 * Copyright(c) 2010 Sander Tolsma/TTC
 * licensing@tolsma.net
 * http://code.tolsma.net/licenses
 */
(function(){var a=this,H,h=a.document,D=h.getElementsByTagName("head")[0]||h.getElementsByTagName("body")[0],U=!!a.ActiveXObject,o="_",s="#",N="!",u="LOADING",k="LOADED",c="DEPENDENCY",q="DEFINED",m="READY",v="LOADERROR",C="WAITING",y={},z={},S,n=[],J=[],g=[],x=null,K=[];function w(Y){var X=Object.prototype.toString;return X.apply(Y)==="[object Array]"}function r(Y,X){return Y===null||Y===undefined||((w(Y)&&!Y.length))||(!X?Y==="":false)}function R(ab,aa,Z){if(r(ab,true)){return}for(var Y=0,X=ab.length;Y<X;Y++){if(aa.call(Z||ab[Y],ab[Y],Y,ab)===false){return Y}}}function f(Z,Y,X){if(r(Z)){return}if(w(Z)||Z.callee){R(Z,Y,X);return}else{if(typeof Z=="object"){for(var aa in Z){if(Z.hasOwnProperty(aa)){if(Y.call(X||Z,aa,Z[aa],Z)===false){return}}}}}}function V(Z,Y,X){for(var aa in Y){if(!(aa in Z)||X){Z[aa]=Y[aa]}}}function O(ab,ac){if((ac.charAt(ac.length-1)==="/")&&(ac.length>1)){ac=ac.substr(0,ac.length-1)}var X=L(ab),Y,Z;if(ac.charAt(0)==="/"){return W(X,ac)}Y=L(ac);Y.directory="";if(W(Y,"")!==""){return ac}Y=(X.path==="")?[]:X.path.split("/");Y=Y.concat(ac.split("/"));for(var aa=0;((Z=Y[aa])!==H);aa++){if((Z===".")||((Z==="")&&(aa>0))){Y.splice(aa,1);aa-=1}else{if(Z===".."){if(aa==0){throw"Trying to enter forbidden path space. base: "+ab+" offset: "+ac}Y.splice(aa-1,2);aa-=2;if((aa<0)&&(Y.length==0)){return W(X,"")}else{aa=0}}}}return W(X,Y.join("/"))}function F(X,Y){return O(X,Y)+"/"}function L(ab){var aa={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/}},X=aa.parser.strict.exec(ab),Z={},Y=14;while(Y--){Z[aa.key[Y]]=X[Y]||""}Z[aa.q.name]={};Z[aa.key[12]].replace(aa.q.parser,function(ad,ac,ae){if(ac){Z[aa.q.name][ac]=ae}});return Z}function W(X,Z){var Y;Y=((X.protocol)?(X.protocol+"://"):"");Y=Y+((X.authority)?X.authority:"");return Y+((Z)?Z:((X.directory)?X.directory:""))}function T(X){X=X.split("/");X=X.slice(1,X.length);return X.join("/")}function b(X){X=X.split("/");X=X.slice(0);return X[0]}function l(X){X=X.split("/");X=X.slice(0,X.length-1);return X.join("/")}function E(X){X=X.split("/");X=X.slice(X.length-1);return X[0]}function I(X){return y[o+X]}function P(Y,X){return y[o+Y]=X}function M(X){return z[o+X]}function j(X,Y){return z[o+X]=Y}function p(aa,Z,Y){aa=(typeof aa=="string")?[aa]:aa;var X={ids:aa,fn:Z,scope:Y};if(e(X)){K.push(X);return true}return false}function e(Y){if(R(Y.ids,function(ac,Z,ab){var aa=I(ac);return(aa!==H&&((aa.state===q)||(aa.state===m)))},this)===H){var X=function(){Y.fn.call(Y.scope)};setTimeout(X,1);return false}return true}function t(){var X=[];R(K,function(Y,aa,Z){if(e(Y)){X.push(Y)}});K=X}function A(X,Z,Y){this.parentPackage=X;this.id=Z;this.uri=Y;this.state=u;this.exports={};this.factoryFn=null;this.module=null;this.deps=[]}A.prototype={require:function(Y){Y=(Y==="")?Y:this.resolveId(Y);var X=I(Y);if(!X){throw"Module: "+Y+" doesn't exist!!"}else{if(!X.createModule()||(X.state===u)||(X.state===v)){throw"Module: "+Y+" is not loaded or in error state!!"}}return X.exports},ensure:function(ad,X){var Y=this.returnRequire(),ab=(X===H)?function(){}:function(){X.call(null,Y)},ac,aa=[];if(ad===H){ad=[]}for(var Z=0;ad[Z];Z++){ac=this.splitLoader(ad[Z]);ad[Z]=ac[1]=this.resolveId(ac[1]);aa.push(ac)}if(p(ad,ab,this)){for(var Z=0;ac=aa[Z];Z++){ac[0]=(ac[0]!=="")?this.resolveId(ac[0]):"";if(!I(ac[1])){this.parentPackage.moduleLoader(ac[1],ac[0])}}}return H},resolveId:function(Y){if(Y.indexOf(s)!==-1){return Y}var X=this.id.substring(this.id.indexOf(s)+1);Y=(Y.charAt(0)===".")?O(l(X),Y):O("",Y);Y=this.parentPackage.resolveMapping(Y);return(Y.id)?Y.pPackage.uid+s+Y.id:""},resolveDependencies:function(){var Z=this.deps,X;if(Z.length>0){var Y;for(X=0;Y=Z[X];X++){Y=this.splitLoader(Y);Z[X]=Y[1]=this.resolveId(Y[1]);Y[0]=(Y[0]!=="")?this.resolveId(Y[0]):"";if(!I(Y[1])){this.parentPackage.moduleLoader(Y[1],Y[0])}}}this.setState(c)},splitLoader:function(X){return[X.substring(0,X.indexOf(N)),X.substring(X.indexOf(N)+1)]},checkDependencyState:function(X){var aa,Y;X=(X)?X:{};if((this.state===q)||(this.state===m)||(this.state===v)||X[o+this.id]){return true}if((this.state===u)||(this.state===k)||(this.state===C)){return false}X[o+this.id]=true;for(Y=0;aa=this.deps[Y];Y++){var Z=I(aa);if(Z===H){return false}else{if(Z.state!==q){if(!Z.checkDependencyState(X)){return false}}}}delete X[o+this.id];this.setState(q);return true},createModule:function(){if(this.state===q){this.setState(m);V(this.exports,this.factoryFn.call(null,this.returnRequire(),this.exports,this.returnModule()))}return(this.state===m)?this:null},returnRequire:function(){var Y=this,X=function(){return Y.require.apply(Y,arguments)};X.ensure=function(){return Y.ensure.apply(Y,arguments)};X.toUrl=function(){return Y.uri};X.main=(x.mainId)?I(x.mainId).returnModule():{id:"",uri:""};return X},returnModule:function(){if(!this.module){this.module={id:this.id,uri:this.uri}}return this.module},define:function(Y,X){this.setState(k);this.deps=Y;this.factoryFn=X},setState:function(X){this.state=X}};function i(X,Y){this.uid=X;this.uri=Y;this.moduleUri=Y;j(X,this);this.path={};this.mappings={};this.mainId=null;this.state=u}i.prototype={loadPackageDef:function(X){var Y;if(X){Y=this.addUid(E(X));X=O(this.moduleUri,X+".js")}else{Y=this.addUid("package");X=O(this.moduleUri,"package.js")}this.insertScriptTag(Y,X,this,this.procesQueues,this)},procesQueues:function(X,Y){if(X._done){return}if(!Y){if(X._package.uid===this.uid){this.setState(v)}}this.cleanScriptTag(X);this.procesPackageDefs(X);this.procesModQueue(X,true);if((this.mainId!==null)&&!I(this.mainId)){this.moduleLoader(this.mainId)}},procesPackageDefs:function(X){var Y;for(;Y=g.pop();){if(U){X=Y[1]}X._package.procesPackageCfg(Y[0])}},procesPackageCfg:function(X){var Y;if(X.uid&&X.uid!==this.uid){this.uid=X.uid;j(X.uid,this)}this.mainId=(X.main)?this.uid+s+X.main:null;if(this.mainId){p(this.mainId,this.startUp,this)}this.moduleUri=(X.directories&&X.directories.lib)?O(this.uri,X.directories.lib):O(this.uri,"lib");f(X.paths,function(aa,Z){this.setPath(aa,F(this.moduleUri,Z))},this);f(X.mappings,function(aa,ab){var Z={};Z.uri=(ab.location)?F(this.uri,ab.location):"";Z.uid=(ab.uid)?ab.uid:Z.uri;this.setMapping(aa,Z);if(!M(Z.uid)){if(Z.uri===""){throw"No mapping location for package: "+this.uid+" and mapping: "+aa}(new i(Z.uid,Z.uri)).loadPackageDef()}},this);return this},procesModQueue:function(X,aa){var Z,ad,ab,Y,ac=X._moduleId;for(Y=0;Z=J[Y];Y++){if(U&&(Z[3]!==null)){X=Z[3]}ab=X._package;if(Z[0]){ad=ab.addUid(Z[0])}else{ad=X._moduleId}if(!I(ad)){P(ad,new A(ab,ad,X.src))}if(I(ad).state===u){I(ad).define(Z[1],Z[2])}}J=[];if(!aa||((I(ac))&&(I(ac).state===u))){if(I(ac)){I(ac).setState(v)}}if(n.length==0){f(y,function(af,ae){if(ae.state===k){ae.resolveDependencies()}})}f(y,function(af,ae){if(ae.state===c){ae.checkDependencyState()}});t()},startUp:function(){var X=I(this.mainId);if(X){X.createModule()}},setState:function(X){this.state=X},addUid:function(X){return this.uid+s+X},searchPath:function(X){X=X.substring(X.indexOf(s)+1);return(this.getPath(X))?O(this.getPath(X),E(X)):O(this.moduleUri,X)},getPath:function(X){return this.path[o+X]},setPath:function(Y,X){return this.path[o+Y]=X},getMapping:function(X){return this.mappings[o+X]},setMapping:function(Y,X){return this.mappings[o+Y]=X},moduleLoader:function(ab,X){var Y,aa,Z;if(!I(ab)){Y=this.resolvePackage(ab);aa=Y.searchPath(ab);Z=P(ab,new A(Y,ab,aa));if((X===H)||(X==="")){this.loadJSModule(ab,aa,Y)}else{p([X],this.createLoaderCb(X,ab,Z.returnRequire()),this)}}},createLoaderCb:function(X,Z,Y){return function(){var ab=I(X);if(!ab.createModule()||(ab.state===u)||(ab.state===v)){throw"Module: "+Z+" is not loaded or in error state!!"}else{var aa=Z.substring(Z.indexOf(s)+1);if(ab.exports.load){ab.exports.load.call(null,aa,Y,this.createModuleLoadedCb(Z))}}}},createModuleLoadedCb:function(Y){var X=this;return function(Z){var aa=I(Y);aa.setState(m);aa.deps=[];aa.factoryFn=function(){};V(aa.exports,Z);f(y,function(ac,ab){if(ab.state===c){ab.checkDependencyState()}});t()}},loadJSModule:function(Z,Y,X){this.insertScriptTag(Z,Y+".js",X,X.procesQueues,X)},resolvePackage:function(X){X=X.substring(0,X.indexOf(s));return M(X)},resolveMapping:function(Z){Z=Z.substring(Z.indexOf(s)+1);var X={pPackage:this,id:Z},Y;if(Y=this.getMapping(b(Z))){Z=T(Z);X=M(Y.uid).resolveMapping(Z)}else{if(Z===""){X.id=(this.mainId)?this.mainId.substring(this.mainId.indexOf(s)+1):null}}return X},insertScriptTag:function(ac,aa,ab,X,Z){var Y=h.createElement("script");Y._moduleId=ac;Y._package=ab;Y._timer=setTimeout(this.scriptTimer(Y,X,Z),S);Y.type="text/javascript";Y.onload=Y.onreadystatechange=this.scriptLoad(Y,X,Z);Y.onerror=this.scriptError(Y,X,Z);Y.src=aa;n.push(Y);D.insertBefore(Y,D.firstChild)},cleanScriptTag:function(X){X._done=true;X.onload=X.onreadystatechange=new Function("");X.onerror=new Function("");if(X._timer){clearTimeout(X._timer)}R(n,function(Z,Y){if(X===Z){n.splice(Y,1)}})},scriptLoad:function(Y,X,Z){return function(){if(Y._done||(typeof Y.readyState!="undefined"&&!((Y.readyState=="loaded")||(Y.readyState=="complete")))){return}X.call(Z,Y,true)}},scriptError:function(Y,X,Z){return function(){X.call(Z,Y,false)}},scriptTimer:function(Y,X,Z){return function(){Y._timer=0;X.call(Z,Y,false)}}};function d(ac,ab,Z){var X=/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;var aa=/require\(["']([\w-_\.\/]+)["']\)/g;if(typeof ac!=="string"){Z=ab;ab=ac;ac=null}if(!w(ab)){Z=ab;ab=[]}if(!name&&!ab.length&&(typeof Z==="function")){Z.toString().replace(X,"").replace(aa,function(ad,ae){ab.push(ae)})}var Y=null;if(U){R(n,function(ad){if(ad.readyState==="interactive"){Y=ad;return false}})}J.push([ac,ab,Z,Y])}function Q(X){var Y=null;if(U){R(n,function(Z){if(Z.readyState==="interactive"){Y=Z;return false}})}g.push([X,Y])}function G(Z){var Y=document.getElementsByTagName("script"),aa,ad,ae,X,ab,ac={main:null,mainFunction:null,deps:[],location:"",directories:{lib:"./lib"},debug:true,waitSeconds:6000,baseUrlMatch:/apprequire\.js/i},Z=(typeof Z=="object")?Z:ac;V(Z,ac);S=Z.waitSeconds;for(ab=Y.length-1;ab>-1&&(aa=Y[ab]);ab--){ad=aa.getAttribute("data-main");ae=aa.src;if(ae){X=ae.match(Z.baseUrlMatch);if(X){break}}}if(ad){if(ad.charAt(ad.length)==="/"){ae=ad;ad=null}else{ae=l(ad);ad=E(ad)}ae=O(l(a.location.href),ae)}else{ae=F(l(a.location.href),Z.location)}x=new i("commonjs.org",ae);B(Z.debug);if(ad){x.loadPackageDef(ad)}else{x.procesPackageCfg(Z);if((Z.main!==null)&&(Z.mainFunction!==null)){d(Z.main,Z.deps,Z.mainFunction);x.procesModQueue({_package:x,_moduleId:Z.main,src:a.location.href},true)}else{if(Z.main!==null){x.moduleLoader(x.mainId)}}}}function B(X){var Y=a.require={};Y["package"]=Q;a.module={};a.module.declare=d;if(X){a.module.modules=y;a.module.packages=z}a.define=d}if(typeof a.require!=="function"){G((typeof a.require!=="undefined")?a.require:{})}}).call(typeof window==="undefined"?this:window);





