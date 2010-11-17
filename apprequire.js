(function(){var v=this,t,n=Object.prototype.toString,H=v.document,q=H.getElementsByTagName("head")[0]||H.getElementsByTagName("body")[0],i=!!v.ActiveXObject,A="LOADING",r="WAITING",g="LOADED",f="DEPENDENCY",b="DEFINED",z="LOADERROR",E={},m,d=[],l=[],B=[],u=null;function o(I){return n.apply(I)==="[object Array]"}function p(J,I){return J===null||J===undefined||((o(J)&&!J.length))||(!I?J==="":false)}function e(M,L,K){if(p(M,true)){return}for(var J=0,I=M.length;J<I;J++){if(L.call(K||M[J],M[J],J,M)===false){return J}}}function j(K,J,I){if(p(K)){return}if(o(K)||K.callee){e(K,J,I);return}else{if(typeof K=="object"){for(var L in K){if(K.hasOwnProperty(L)){if(J.call(I||K,L,K[L],K)===false){return}}}}}}function s(K,J,I){for(var L in J){if(!(L in K)||I){K[L]=J[L]}}}function c(M,N){if((N.charAt(N.length-1)==="/")&&(N.length>1)){N=N.substr(0,N.length-1)}var I=y(M),J,K;if(N.charAt(0)==="/"){return a(I,N)}J=y(N);J.directory="";if(a(J,"")!==""){return N}J=(I.path==="")?[]:I.path.split("/");J=J.concat(N.split("/"));for(var L=0;((K=J[L])!==t);L++){if((K===".")||((K==="")&&(L>0))){J.splice(L,1);L-=1}else{if(K===".."){J.splice(L-1,2);L-=2;if((L<0)&&(J.length==0)){return a(I,"")}else{L=0}}}}return a(I,J.join("/"))}function y(M){var L={key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/}},I=L.parser.strict.exec(M),K={},J=14;while(J--){K[L.key[J]]=I[J]||""}K[L.q.name]={};K[L.key[12]].replace(L.q.parser,function(O,N,P){if(N){K[L.q.name][N]=P}});return K}function a(I,K){var J;J=((I.protocol)?(I.protocol+"://"):"");J=J+((I.authority)?I.authority:"");return J+((K)?K:((I.directory)?I.directory:""))}function w(I){I=I.split("/");I=I.slice(0,I.length-1);return I.join("/")}function F(I){I=I.split("/");I=I.slice(I.length-1);return I[0]}function G(J,K,I){this.parentPackage=J;this.id=K;this.uri=I;this.state=A;this.exports={};this.creatorFn=null;this.module=null;this.deps=[];if((this instanceof x===false)&&this.parentPackage&&(this.id===this.parentPackage.mainId)){this.parentPackage.setMainModule(this.exports,this.creatorFn,this.deps,r)}}G.prototype.require=function(N,M,L){if(o(N)){L=M;M=N;N=null}if(typeof M==="function"){L=M;M=[]}if(M===t){M=[]}N=(N==="")?N:((N.charAt(0)===".")?c(w(this.id),N):c(this.parentPackage.id,N));if(N===null){var I=[],J,K;for(J=0;K=M[J];J++){K=(K.charAt(0)===".")?c(w(this.id),K):c(this.parentPackage.id,K);I.push([K,this])}this.loadModules(I,L);return t}else{if(!E[N]){throw"Module: "+N+" doesn't exist!!"}else{if((E[N].state===A)||(E[N].state===z)){throw"Module: "+N+" is not loaded or in error state!!"}}}return E[N].exports};G.prototype.procesQueues=function(I,J){if(I._done){return}this.cleanScriptTag(I);this.procesModQueue(I,J)};G.prototype.procesModQueue=function(I,L){var K,O,M,J;if(!L){E[I._moduleId].setState(z);if((this instanceof x===false)&&this.parentPackage&&(this.id===this.parentPackage.mainId)){this.parentPackage.setMainModule(this.exports,this.creatorFn,this.deps,z)}}for(J=0;K=l[J];J++){if(i&&(K[3]!==null)){I=K[3]}M=I._package;if(K[0]){O=this.resolveId(K[0],M)}else{O=I._moduleId}if(!E[O]){E[O]=new G(M,O,I.src)}if(E[O].state===A){E[O].define(K[1],K[2])}}l=[];if(d.length==0){var N=[];j(E,function(Q,P){if(P.state===g){if(P.deps.length>0){var R;for(J=0;R=P.deps[J];J++){if(!E[R]){N.push([R,P])}}}P.setState(f)}});if(N.length>0){this.loadModules(N,null)}}j(E,function(Q,P){if(P.state===f){P.create()}})};G.prototype.create=function(I){var L,J;I=(I)?I:{};if((this.state===b)||(this.state===z)||I[this.id]){return true}if((this.state===A)||(this.state===g)||(this.state===r)){return false}I[this.id]=true;for(J=0;L=this.deps[J];J++){var K=E[L];if(K===t){return false}else{if(K.state!==b){if(!K.create(I)){return false}}}}delete I[this.id];if((this instanceof x===false)&&this.parentPackage&&(this.id===this.parentPackage.mainId)){this.parentPackage.setMainModule(this.exports,this.creatorFn,this.deps,b)}this.setState(b);s(this.exports,this.creatorFn.call(null,this.returnRequire(),this.exports,this.returnModule()));return true};G.prototype.returnRequire=function(){var J=this,I=function(){return J.require.apply(J,arguments)};I.main=u.returnModule();return I};G.prototype.returnModule=function(){if(!this.module){this.module={id:this.id,uri:this.uri}}return this.module};G.prototype.define=function(L,J){var I,K;this.setState(g);for(I=0;K=L[I];I++){K=(K.charAt(0)===".")?c(w(this.id),K):c(this.parentPackage.id,K);this.deps.push(K)}this.creatorFn=J};G.prototype.loadModules=function(L,K){var J,N,I,M;for(;J=L.pop();){N=J[0];if(!E.hasOwnProperty(N)){I=this.resolveRootPackage(N);M=I.searchPath(N);E[N]=new G(I,N,w(M));E[N].insertScriptTag(N,M+".js",I,E[N].procesQueues,E[N])}}};G.prototype.searchPath=function(I){I=I.replace(this.id,"");if(I.charAt(0)==="/"){I=I.substr(1)}return(this.path[I])?c(this.path[I],I.split("/").pop()):c(this.uri,I)};G.prototype.resolveId=function(J,I){I=(I===t)?this.parentPackage:I;return c(I.id,J)};G.prototype.resolveRootPackage=function(K){var I,J;I=K.split("/");for(J=I.length;J>0;J--){I=I.slice(0,I.length-1);if(E[I.join("/")] instanceof x){return E[I.join("/")]}}return u};G.prototype.resolveURI=function(J,I){I=(I===t)?this.parentPackage:I;return c(w(I.uri),J)};G.prototype.insertScriptTag=function(N,L,M,I,K){var J=H.createElement("script");J._moduleId=N;J._package=M;J._timer=setTimeout(this.scriptTimer(J,I,K),m);J.type="text/javascript";J.onload=J.onreadystatechange=this.scriptLoad(J,I,K);J.src=L;d.push(J);q.insertBefore(J,q.firstChild)};G.prototype.cleanScriptTag=function(I){I._done=true;I.onload=I.onreadystatechange=new Function("");if(I._timer){clearTimeout(I._timer)}e(d,function(K,J){if(I===K){d.splice(J,1)}})};G.prototype.scriptLoad=function(J,I,K){return function(){if(J._done||(typeof J.readyState!="undefined"&&!((J.readyState=="loaded")||(J.readyState=="complete")))){return}I.call(K,J,true)}};G.prototype.scriptTimer=function(J,I,K){return function(){J._timer=0;console.log("Timer went off !!!! script moduleId: ",J._moduleId);I.call(K,J,false)}};G.prototype.setState=function(I){this.state=I};function x(K,L,I,J){this.cfg=J;this.path={};this.mainId="";K=(K===null)?this:K;G.call(this,K,L,I)}x.prototype=new G();x.prototype.loadPackageDef=function(I){var J;if(I){J=c(this.id,F(I));I=this.resolveURI(I+".js",this)}else{J=c(this.id,"package");I=this.resolveURI("package.js",this)}this.insertScriptTag(J,I,this,this.procesQueues,this)};x.prototype.procesQueues=function(I,J){if(I._done){return}if(!J){if(I._package.id===this.id){this.setState(z)}}this.cleanScriptTag(I);this.procesPackageDefs(I);this.procesModQueue(I,true);if((this.mainId!=="")&&!E[this.mainId]){this.loadModules([[this.mainId,this]])}};x.prototype.procesPackageDefs=function(I){var J;for(;J=B.pop();){if(i){I=J[1]}I._package.procesPackageCfg(J[0])}};x.prototype.procesPackageCfg=function(I){var J;this.cfg=I;this.mainId=(I.main)?c(this.id,I.main):this.mainId;this.uri=(I.directories&&I.directories.lib)?this.resolveURI(I.directories.lib,this):this.resolveURI("lib",this);J=(I.paths)?I.paths:{};j(J,function(L,K){this.path[L]=c(this.uri,K)},this);J=(I.mappings)?I.mappings:{};j(J,function(K,M){var L=M.location;K=this.resolveId(K,this);E[K]=new x(this,K,L,M);E[K].loadPackageDef()},this);this.setState(r)};x.prototype.setMainModule=function(I,J,L,K){this.exports=I;this.creatorFn=J;this.deps=L;this.setState(K)};function D(N,M,L){var I=/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg;var K=/require\(["']([\w-_\.\/]+)["']\)/g;if(typeof N!=="string"){L=M;M=N;N=null}if(!o(M)){L=M;M=[]}if(!name&&!M.length&&(typeof L==="function")){L.toString().replace(I,"").replace(K,function(O,P){M.push(P)})}var J=null;if(i){e(d,function(O){if(O.readyState==="interactive"){J=O;return false}})}l.push([N,M,L,J])}function k(I){var J=null;if(i){e(d,function(K){if(K.readyState==="interactive"){J=K;return false}})}B.push([I,J])}function h(K){var J=document.getElementsByTagName("script"),L,O,P,I,M,N={main:"",mainFunction:null,deps:[],location:"",directories:{lib:"./lib"},waitSeconds:6000,baseUrlMatch:/apprequire\.js/i},K=(typeof K=="object")?K:N;s(K,N);m=K.waitSeconds;for(M=J.length-1;M>-1&&(L=J[M]);M--){O=L.getAttribute("data-main");P=L.src;if(P){I=P.match(K.baseUrlMatch);if(I){break}}}P=(O)?c(w(v.location.href),O):c(v.location.href+"dummy",K.location);u=E[""]=new x(null,"",P,K);C();if(O){u.loadPackageDef(O)}else{u.procesPackageCfg(K);if((K.main!=="")&&(K.mainFunction!==null)){D(K.main,K.deps,K.mainFunction);u.procesModQueue({_package:u,_moduleId:K.main,src:v.location.href},true)}else{if(K.main!==""){u.loadModules([[K.main,u]])}}}}function C(){var I=v.require=u.returnRequire();I.ensure=v.require;I["package"]=k;I.main=v.module=u.returnModule();v.module.declare=D;v.module.modules=E;v.define=D}if(typeof v.require!=="function"){h((typeof v.require!=="undefined")?v.require:{})}}).call(typeof window==="undefined"?this:window);