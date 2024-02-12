var t=require("bsv-wasm"),r=require("buffer"),e=require("fs"),n=require("path"),o=require("os"),i=require("sigma-protocol");function s(t){return t&&"object"==typeof t&&"default"in t?t:{default:t}}var a=/*#__PURE__*/s(e),u=/*#__PURE__*/s(n),c=/*#__PURE__*/s(o);function l(t,r){(null==r||r>t.length)&&(r=t.length);for(var e=0,n=new Array(r);e<r;e++)n[e]=t[e];return n}function d(t,r){var e="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(e)return(e=e.call(t)).next.bind(e);if(Array.isArray(t)||(e=function(t,r){if(t){if("string"==typeof t)return l(t,r);var e=Object.prototype.toString.call(t).slice(8,-1);return"Object"===e&&t.constructor&&(e=t.constructor.name),"Map"===e||"Set"===e?Array.from(t):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?l(t,r):void 0}}(t))||r&&t&&"number"==typeof t.length){e&&(t=e);var n=0;return function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}const _=/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;function p(t){console.log(`[dotenv@16.0.3][DEBUG] ${t}`)}const g={config:function(t){let r=u.default.resolve(process.cwd(),".env"),e="utf8";const n=Boolean(t&&t.debug),o=Boolean(t&&t.override);var i;t&&(null!=t.path&&(r="~"===(i=t.path)[0]?u.default.join(c.default.homedir(),i.slice(1)):i),null!=t.encoding&&(e=t.encoding));try{const t=g.parse(a.default.readFileSync(r,{encoding:e}));return Object.keys(t).forEach(function(r){Object.prototype.hasOwnProperty.call(process.env,r)?(!0===o&&(process.env[r]=t[r]),n&&p(!0===o?`"${r}" is already defined in \`process.env\` and WAS overwritten`:`"${r}" is already defined in \`process.env\` and was NOT overwritten`)):process.env[r]=t[r]}),{parsed:t}}catch(t){return n&&p(`Failed to load ${r} ${t.message}`),{error:t}}},parse:function(t){const r={};let e,n=t.toString();for(n=n.replace(/\r\n?/gm,"\n");null!=(e=_.exec(n));){const t=e[1];let n=e[2]||"";n=n.trim();const o=n[0];n=n.replace(/^(['"`])([\s\S]*)\1$/gm,"$2"),'"'===o&&(n=n.replace(/\\n/g,"\n"),n=n.replace(/\\r/g,"\r")),r[t]=n}return r}};var f=g.config,v=g.parse,m=g;m.config=f,m.parse=v;var h=function(t){return r.Buffer.from(t).toString("hex")};f();var x=function(e,n,o,i){var s="";if(void 0!==n&&void 0!==o){var a=h("ord"),u=r.Buffer.from(n,"base64").toString("hex");s="OP_0 OP_IF "+a+" OP_1 "+h(o)+" OP_0 "+u+" OP_ENDIF"}var c=e.get_locking_script().to_asm_string()+(s?" "+s:"");if(i&&null!=i&&i.app&&null!=i&&i.type){c=c+" OP_RETURN "+h("1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5")+" "+h("SET");for(var l=0,d=Object.entries(i);l<d.length;l++){var _=d[l],p=_[0],g=_[1];"cmd"!==p&&(c=c+" "+h(p)+" "+h(g))}}return t.Script.from_asm_string(c)};exports.P2PKH_FULL_INPUT_SIZE=148,exports.P2PKH_INPUT_SCRIPT_SIZE=107,exports.P2PKH_OUTPUT_SIZE=34,exports.buildInscription=x,exports.buildReinscriptionTemplate=function(e,n,o,i){try{var s=new t.Transaction(1,0),a=new t.TxIn(r.Buffer.from(e.txid,"hex"),e.vout,t.Script.from_asm_string(e.script));s.add_input(a);var u=x(t.P2PKHAddress.from_string(n),null==o?void 0:o.dataB64,null==o?void 0:o.contentType,i),c=new t.TxOut(BigInt(1),u);return s.add_output(c),Promise.resolve(s)}catch(t){return Promise.reject(t)}},exports.createOrdinal=function(e,n,o,s,a,u,c,l,_){void 0===_&&(_=[]);try{var p=function(r){var n=g.sign(o,t.SigHash.ALL|t.SigHash.FORKID,0,t.Script.from_asm_string(e.script),BigInt(e.satoshis));return f.set_unlocking_script(t.Script.from_asm_string(n.to_hex()+" "+o.to_public_key().to_hex())),g.set_input(0,f),g},g=new t.Transaction(1,0),f=new t.TxIn(r.Buffer.from(e.txid,"hex"),e.vout,t.Script.from_asm_string(""));g.add_input(f);var v=x(t.P2PKHAddress.from_string(n),u.dataB64,u.contentType,c),m=new t.TxOut(BigInt(1),v);g.add_output(m);for(var h,y=d(_);!(h=y()).done;){var P=h.value,S=new t.TxOut(P.amount,t.P2PKHAddress.from_string(P.to).get_locking_script());g.add_output(S)}for(var I,T=0n,w=g.get_noutputs(),O=d(Array(w).keys());!(I=O()).done;){var B;T+=(null==(B=g.get_output(I.value))?void 0:B.get_satoshis())||0n}var b=t.P2PKHAddress.from_string(s).get_locking_script(),k=Math.ceil(a*(g.get_size()+34+107)),A=BigInt(e.satoshis)-T-BigInt(k);if(A<0)throw new Error("Inadequate satoshis for fee");if(A>0){var H=new t.TxOut(BigInt(A),b);g.add_output(H)}var K=null==l?void 0:l.idKey,j=null==l?void 0:l.keyHost,E=function(){if(!K)return function(){if(j){var t=null==l?void 0:l.authToken,r=new i.Sigma(g);return function(e,n){try{var o=Promise.resolve(r.remoteSign(j,t)).then(function(t){g=t.signedTx})}catch(t){return n(t)}return o&&o.then?o.then(void 0,n):o}(0,function(t){throw console.log(t),new Error("Remote signing to "+j+" failed")})}}();var t=new i.Sigma(g).sign(K);g=t.signedTx}();return Promise.resolve(E&&E.then?E.then(p):p())}catch(t){return Promise.reject(t)}},exports.sendOrdinal=function(e,n,o,i,s,a,u,c,l,_){void 0===_&&(_=[]);try{var p=new t.Transaction(1,0),g=new t.TxIn(r.Buffer.from(n.txid,"hex"),n.vout,t.Script.from_asm_string(""));p.add_input(g);var f,v=new t.TxIn(r.Buffer.from(e.txid,"hex"),e.vout,t.Script.from_asm_string(""));p.add_input(v);var m=t.P2PKHAddress.from_string(u);f=null!=c&&c.dataB64&&null!=c&&c.contentType?x(m,c.dataB64,c.contentType,l):m.get_locking_script();var h=new t.TxOut(BigInt(1),f);p.add_output(h);for(var y,P=d(_);!(y=P()).done;){var S=y.value,I=new t.TxOut(S.amount,t.P2PKHAddress.from_string(S.to).get_locking_script());p.add_output(I)}for(var T,w=0n,O=p.get_noutputs(),B=d(Array(O).keys());!(T=B()).done;){var b;w+=(null==(b=p.get_output(T.value))?void 0:b.get_satoshis())||0n}var k=t.P2PKHAddress.from_string(i).get_locking_script(),A=Math.ceil(s*(p.get_size()+34+214)),H=BigInt(e.satoshis)-w-BigInt(A),K=new t.TxOut(H,k);p.add_output(K);var j=p.sign(a,t.SigHash.InputOutput,0,t.Script.from_asm_string(n.script),BigInt(n.satoshis));g.set_unlocking_script(t.Script.from_asm_string(j.to_hex()+" "+a.to_public_key().to_hex())),p.set_input(0,g);var E=p.sign(o,t.SigHash.InputOutput,1,t.Script.from_asm_string(e.script),BigInt(e.satoshis));return v.set_unlocking_script(t.Script.from_asm_string(E.to_hex()+" "+o.to_public_key().to_hex())),p.set_input(1,v),Promise.resolve(p)}catch(t){return Promise.reject(t)}},exports.sendUtxos=function(e,n,o,i){try{for(var s,a=new t.Transaction(1,0),u=0,c=d(e||[]);!(s=c()).done;)u+=s.value.satoshis;var l=u-i;console.log({feeSats:i,satsIn:u,satsOut:l}),a.add_output(new t.TxOut(BigInt(l),o.get_locking_script()));for(var _,p=0,g=d(e||[]);!(_=g()).done;){var f=_.value;console.log({u:f});var v=new t.TxIn(r.Buffer.from(f.txid,"hex"),f.vout,t.Script.from_asm_string(""));console.log({inx:v}),v.set_satoshis(BigInt(f.satoshis)),a.add_input(v);var m=a.sign(n,t.SigHash.InputOutputs,p,t.Script.from_asm_string(f.script),BigInt(f.satoshis));v.set_unlocking_script(t.Script.from_asm_string(m.to_hex()+" "+n.to_public_key().to_hex())),a.set_input(p,v),p++}return Promise.resolve(a)}catch(t){return Promise.reject(t)}};
//# sourceMappingURL=index.cjs.map
