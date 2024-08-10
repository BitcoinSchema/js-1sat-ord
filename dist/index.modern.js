import{P2PKH as t,LockingScript as o,Script as n,Utils as s,fromUtxo as e,SatoshisPerKilobyte as i,Transaction as r,OP as a,BigNumber as c,UnlockingScript as u,TransactionSignature as d}from"@bsv/sdk";import{Sigma as f}from"sigma-protocol";import l from"jimp";const p=t=>Buffer.from(t).toString("hex"),h="1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5",g=10,w="https://ordinals.gorillapool.io/api";class m extends t{lock(n,s,e){let i="";if(void 0!==(null==s?void 0:s.dataB64)&&void 0!==(null==s?void 0:s.contentType)){const t=p("ord"),o=Buffer.from(s.dataB64,"base64").toString("hex").trim();if(!o)throw new Error("Invalid file data");const n=p(s.contentType);if(!n)throw new Error("Invalid media type");i=`OP_0 OP_IF ${t} OP_1 ${n} OP_0 ${o} OP_ENDIF`}let r=`${i?`${i} `:""}${(new t).lock(n).toASM()}`;if(e&&(!e.app||!e.type))throw new Error("MAP.app and MAP.type are required fields");if(null!=e&&e.app&&null!=e&&e.type){r=`${r?`${r} `:""}OP_RETURN ${p(h)} ${p("SET")}`;for(const[t,o]of Object.entries(e))"cmd"!==t&&(r=`${r} ${p(t)} ${p(o)}`)}return o.fromASM(r)}}function y(){return y=Object.assign?Object.assign.bind():function(t){for(var o=1;o<arguments.length;o++){var n=arguments[o];for(var s in n)({}).hasOwnProperty.call(n,s)&&(t[s]=n[s])}return t},y.apply(null,arguments)}var b,k;!function(t){t.BSV20="bsv20",t.BSV21="bsv21"}(b||(b={})),function(t){t.Paymail="paymail",t.Address="address",t.Script="script"}(k||(k={}));const S=2n**64n-1n,{fromBase58Check:B}=s,I=(t,o)=>e(y({},t,{script:Buffer.from(t.script,"base64").toString("hex")}),o),x=async(o,n="base64")=>{const s=`${w}/txos/address/${o}/unspent?bsv20=false`;console.log({payUrl:s});const e=await fetch(s);if(!e.ok)throw new Error("Error fetching pay utxos");let i=await e.json();i=i.filter(t=>1!==t.satoshis);const r=B(o),a=(new t).lock(r.data);return i=i.map(t=>({txid:t.txid,vout:t.vout,satoshis:t.satoshis,script:"hex"===n||"base64"===n?Buffer.from(a.toBinary()).toString(n):a.toASM()})),i},v=async(t,o,s=10,e=0,i="base64")=>{let r=`${w}/txos/address/${t}/unspent?limit=${s}&offset=${e}&`;o&&(r+=`q=${Buffer.from(JSON.stringify({map:{subTypeData:{collectionId:o}}})).toString("base64")}`);const a=await fetch(r);if(!a.ok)throw new Error(`Error fetching NFT utxos for ${t}`);let c=await a.json();c=c.filter(t=>{var o;return 1===t.satoshis&&!(null!=(o=t.data)&&o.list)});const u=c.map(t=>`${t.txid}_${t.vout}`),d=await fetch(`${w}/txos/outpoints?script=true`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify([...u])});if(!d.ok)throw new Error(`Error fetching NFT scripts for ${t}`);return c=(await d.json()||[]).map(t=>{let s=t.script;"hex"===i?s=Buffer.from(s,"base64").toString("hex"):"asm"===i&&(s=n.fromHex(Buffer.from(s,"base64").toString("hex")).toASM());const e={origin:t.origin.outpoint,script:s,vout:t.vout,txid:t.txid,satoshis:1};return o&&(e.collectionId=o),e}),c},O=async(t,o,n)=>{const s=`${w}/bsv20/${n}/${t===b.BSV20?"tick":"id"}/${o}?bsv20=true&listing=false`,e=await fetch(s);if(!e.ok)throw new Error(`Error fetching ${t} utxos`);let i=await e.json();return i=i.map(t=>({amt:t.amt,script:t.script,vout:t.vout,txid:t.txid,id:o,satoshis:1})),i},$=async(t,o)=>{const n=null==o?void 0:o.idKey,s=null==o?void 0:o.keyHost;if(n){const o=new f(t),{signedTx:s}=o.sign(n);return s}if(s){const n=null==o?void 0:o.authToken,e=new f(t);try{const{signedTx:t}=await e.remoteSign(s,n);return t}catch(t){throw console.log(t),new Error(`Remote signing to ${s} failed`)}}throw new Error("Signer must be a LocalSigner or RemoteSigner")},A=t=>{if(!t)return;const o={app:t.app,type:t.type};for(const[n,s]of Object.entries(t))void 0!==s&&(o[n]="string"==typeof s?s:Array.isArray(s)||"object"==typeof s?JSON.stringify(s):String(s));return o},E=async o=>{const{utxos:e,destinations:a,paymentPk:c,changeAddress:u,satsPerKb:d=g,metaData:f,signer:l,additionalPayments:p=[]}=o;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");const h=new i(d);let w,y=new r;for(const t of a){if(!t.inscription)throw new Error("Inscription is required for all destinations");if(f)for(const t of Object.keys(f))void 0===f[t]&&delete f[t];y.addOutput({satoshis:1,lockingScript:(new m).lock(t.address,t.inscription,A(f))})}for(const o of p)y.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});const b=u||c.toAddress().toString(),k=(new t).lock(b);y.addOutput({lockingScript:k,change:!0});let S=0n;const B=y.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);if(l){const o=e.pop();y.addInput(I(o,(new t).unlock(c,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))))),S+=BigInt(o.satoshis),y=await $(y,l)}let x=0;for(const o of e){if(S>=B+BigInt(x))break;const e=I(o,(new t).unlock(c,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));y.addInput(e),S+=BigInt(o.satoshis),x=await h.computeFee(y)}if(S<B+BigInt(x))throw new Error(`Not enough funds to create ordinals. Total sats in: ${S}, Total sats out: ${B}, Fee: ${x}`);await y.fee(h),await y.sign();const v=y.outputs.findIndex(t=>t.change);if(-1!==v){const t=y.outputs[v];w={satoshis:t.satoshis,txid:y.id("hex"),vout:v,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return w&&(w.satoshis=y.outputs[y.outputs.length-1].satoshis,w.txid=y.id("hex")),{tx:y,spentOutpoints:e.map(t=>`${t.txid}_${t.vout}`),payChange:w}},P=async o=>{o.satsPerKb||(o.satsPerKb=g),o.additionalPayments||(o.additionalPayments=[]),void 0===o.enforceUniformSend&&(o.enforceUniformSend=!0);const e=new i(o.satsPerKb);let a=new r;const c=[];for(const t of o.ordinals){if(1!==t.satoshis)throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");const e=I(t,(new m).unlock(o.ordPk,"all",!0,t.satoshis,n.fromBinary(s.toArray(t.script,"base64"))));c.push(`${t.txid}_${t.vout}`),a.addInput(e)}if(o.enforceUniformSend&&o.destinations.length!==o.ordinals.length)throw new Error("Number of destinations must match number of ordinals being sent");for(const n of o.destinations){var u,d;let s;s=null!=(u=n.inscription)&&u.dataB64&&null!=(d=n.inscription)&&d.contentType?(new m).lock(n.address,n.inscription,A(o.metaData)):(new t).lock(n.address),a.addOutput({satoshis:1,lockingScript:s})}for(const n of o.additionalPayments)a.addOutput({satoshis:n.amount,lockingScript:(new t).lock(n.to)});let f;const l=o.changeAddress||o.paymentPk.toAddress().toString(),p=(new t).lock(l);a.addOutput({lockingScript:p,change:!0});let h=0n;const w=a.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let y=0;for(const i of o.paymentUtxos){const r=I(i,(new t).unlock(o.paymentPk,"all",!0,i.satoshis,n.fromBinary(s.toArray(i.script,"base64"))));if(c.push(`${i.txid}_${i.vout}`),a.addInput(r),h+=BigInt(i.satoshis),y=await e.computeFee(a),h>=w+BigInt(y))break}if(h<w)throw new Error("Not enough ordinals to send");o.signer&&(a=await $(a,o.signer)),await a.fee(e),await a.sign();const b=a.outputs.findIndex(t=>t.change);if(-1!==b){const t=a.outputs[b];f={satoshis:t.satoshis,txid:a.id("hex"),vout:b,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return f&&(f.satoshis=a.outputs[a.outputs.length-1].satoshis,f.txid=a.id("hex")),{tx:a,spentOutpoints:c,payChange:f}},T=async o=>{const{utxos:e,paymentPk:a,payments:c,satsPerKb:u=g,changeAddress:d=a.toAddress().toString(),metaData:f}=o,l=new i(u),p=new r;for(const t of c){const o={satoshis:t.amount,lockingScript:(new m).lock(t.to,void 0,f)};p.addOutput(o)}let h=0n;const w=p.outputs.reduce((t,o)=>t+(o.satoshis||0),0);let y,b=0;for(const o of e){const e=I(o,(new t).unlock(a,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(p.addInput(e),h+=BigInt(o.satoshis),b=await l.computeFee(p),h>=w+b)break}if(h<w+b)throw new Error(`Not enough funds to send. Total sats in: ${h}, Total sats out: ${w}, Fee: ${b}`);if(h>w+b){const o=(new t).lock(d),n={lockingScript:o,change:!0};y={txid:"",vout:p.outputs.length,satoshis:0,script:Buffer.from(o.toHex(),"hex").toString("base64")},p.addOutput(n)}else h<w+b&&console.log("No change needed");await p.fee(l),await p.sign();const k=p.outputs.findIndex(t=>t.change);if(-1!==k){const t=p.outputs[k];y={satoshis:t.satoshis,txid:p.id("hex"),vout:k,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return y&&(y.satoshis=p.outputs[p.outputs.length-1].satoshis,y.txid=p.id("hex")),{tx:p,spentOutpoints:e.map(t=>`${t.txid}_${t.vout}`),payChange:y}},N=async o=>{const{protocol:e,tokenID:a,utxos:c,inputTokens:u,distributions:d,paymentPk:f,ordPk:l,changeAddress:p,tokenChangeAddress:h,satsPerKb:w=g,metaData:k,decimals:S,additionalPayments:B=[],burn:x=!1}=o;let v=0n,O=0n,E=0n;if(!u.every(t=>t.id===a))throw new Error("Input tokens do not match the provided tokenID");const P=new i(w);let T,N,_=new r;for(const t of u){const o=s.toArray(t.script,"base64"),e=n.fromBinary(o);_.addInput(I(t,(new m).unlock(l,"all",!0,t.satoshis,e))),O+=BigInt(t.amt)}for(const t of d){const o=BigInt(t.amt*10**S),n={p:"bsv-20",op:x?"burn":"transfer",amt:o.toString()};let s;if(e===b.BSV20)s=y({},n,{tick:a});else{if(e!==b.BSV21)throw new Error("Invalid protocol");s=y({},n,{id:a})}_.addOutput({satoshis:1,lockingScript:(new m).lock(t.address,{dataB64:Buffer.from(JSON.stringify(s)).toString("base64"),contentType:"application/bsv-20"})}),E+=o}if(v=O-E,v<0n)throw new Error("Not enough tokens to send");if(v>0n){const t={p:"bsv-20",op:"transfer",amt:v.toString()};let o;if(e===b.BSV20)o=y({},t,{tick:a});else{if(e!==b.BSV21)throw new Error("Invalid protocol");o=y({},t,{id:a})}if(k)for(const t of Object.keys(k))void 0===k[t]&&delete k[t];const n=(new m).lock(h||l.toAddress().toString(),{dataB64:Buffer.from(JSON.stringify(o)).toString("base64"),contentType:"application/bsv-20"},A(k)),s=_.outputs.length;_.addOutput({lockingScript:n,satoshis:1}),T={id:a,satoshis:1,script:Buffer.from(n.toBinary()).toString("base64"),txid:"",vout:s,amt:v.toString()}}for(const o of B)_.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});const C=p||f.toAddress().toString(),F=(new t).lock(C);_.addOutput({lockingScript:F,change:!0});let D=0n;const L=_.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let j=0;for(const o of c){const e=I(o,(new t).unlock(f,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(_.addInput(e),D+=BigInt(o.satoshis),j=await P.computeFee(_),D>=L+BigInt(j))break}if(D<L+BigInt(j))throw new Error(`Not enough funds to transfer tokens. Total sats in: ${D}, Total sats out: ${L}, Fee: ${j}`);o.signer&&(_=await $(_,o.signer)),await _.fee(P),await _.sign();const U=_.id("hex");T&&(T.txid=U);const V=_.outputs.findIndex(t=>t.change);if(-1!==V){const t=_.outputs[V];N={satoshis:t.satoshis,txid:U,vout:V,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return N&&(N.satoshis=_.outputs[_.outputs.length-1].satoshis,N.txid=_.id("hex")),{tx:_,spentOutpoints:_.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:N,tokenChange:T}},_=(t,o)=>{try{if("collection"===t){const t=o;if(!t.description)return new Error("Collection description is required");if(!t.quantity)return new Error("Collection quantity is required");if(t.rarityLabels){if(!Array.isArray(t.rarityLabels))return new Error("Rarity labels must be an array");if(!t.rarityLabels.every(t=>Object.values(t).every(t=>"string"==typeof t)))return new Error(`Invalid rarity labels ${t.rarityLabels}`)}if(t.traits){if("object"!=typeof t.traits)return new Error("Collection traits must be an object");if(t.traits&&!Object.keys(t.traits).every(o=>"string"==typeof o&&"object"==typeof t.traits[o]))return new Error("Collection traits must be a valid CollectionTraits object")}}if("collectionItem"===t){const t=o;if(!t.collectionId)return new Error("Collection id is required");if(!t.collectionId.includes("_"))return new Error("Collection id must be a valid outpoint");if(64!==t.collectionId.split("_")[0].length)return new Error("Collection id must contain a valid txid");if(Number.isNaN(Number.parseInt(t.collectionId.split("_")[1])))return new Error("Collection id must contain a valid vout");if(t.mintNumber&&"number"!=typeof t.mintNumber)return new Error("Mint number must be a number");if(t.rank&&"number"!=typeof t.rank)return new Error("Rank must be a number");if(t.rarityLabel&&"string"!=typeof t.rarityLabel)return new Error("Rarity label must be a string");if(t.traits&&"object"!=typeof t.traits)return new Error("Traits must be an object");if(t.attachments&&!Array.isArray(t.attachments))return new Error("Attachments must be an array")}return}catch(t){return new Error("Invalid JSON data")}};class C{lock(o,e,i,r){const a=s.fromBase58Check(o).data,c=s.fromBase58Check(e).data;let u=new n;if(void 0!==(null==r?void 0:r.dataB64)&&void 0!==(null==r?void 0:r.contentType)){const t=p("ord"),o=Buffer.from(r.dataB64,"base64").toString("hex").trim();if(!o)throw new Error("Invalid file data");const s=p(r.contentType);if(!s)throw new Error("Invalid media type");u=n.fromASM(`OP_0 OP_IF ${t} OP_1 ${s} OP_0 ${o} OP_ENDIF`)}return u.writeScript(n.fromHex("2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000")).writeBin(a).writeBin(C.buildOutput(i,(new t).lock(c).toBinary())).writeScript(n.fromHex("615179547a75537a537a537a0079537a75527a527a7575615579008763567901c161517957795779210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081059795679615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a75517a756169587951797e58797eaa577961007982775179517958947f7551790128947f77517a75517a75618777777777777777777767557951876351795779a9876957795779ac777777777777777767006868"))}cancelListing(o,n="all",s=!1,e,i){const r=(new t).unlock(o,n,s,e,i);return{sign:async function(t,o){return(await r.sign(t,o)).writeOpCode(a.OP_1)},estimateLength:async function(){return 107}}}purchaseListing(t,o){const n={sign:async function(n,e){var i;if(n.outputs.length<2)throw new Error("Malformed transaction");const r=(new u).writeBin(C.buildOutput(n.outputs[0].satoshis||0,n.outputs[0].lockingScript.toBinary()));if(n.outputs.length>2){const t=new s.Writer;for(const o of n.outputs.slice(2))t.write(C.buildOutput(o.satoshis||0,o.lockingScript.toBinary()));r.writeBin(t.toArray())}else r.writeOpCode(a.OP_0);const c=n.inputs[e];let f=t;if(!f&&c.sourceTransaction)f=c.sourceTransaction.outputs[c.sourceOutputIndex].satoshis;else if(!t)throw new Error("sourceTransaction or sourceSatoshis is required");const l=c.sourceTXID||(null==(i=c.sourceTransaction)?void 0:i.id("hex"));let p=o;var h;p||(p=null==(h=c.sourceTransaction)?void 0:h.outputs[c.sourceOutputIndex].lockingScript);const g=d.format({sourceTXID:l,sourceOutputIndex:c.sourceOutputIndex,sourceSatoshis:f,transactionVersion:n.version,otherInputs:[],inputIndex:e,outputs:n.outputs,inputSequence:c.sequence,subscript:p,lockTime:n.lockTime,scope:d.SIGHASH_ALL|d.SIGHASH_ANYONECANPAY|d.SIGHASH_FORKID});return r.writeBin(g).writeOpCode(a.OP_0)},estimateLength:async function(t,o){return(await n.sign(t,o)).toBinary().length}};return n}static buildOutput(t,o){const n=new s.Writer;return n.writeUInt64LEBn(new c(t)),n.writeVarIntNum(o.length),n.write(o),n.toArray()}}const{toArray:F}=s,D=async o=>{const{utxos:e,listings:a,paymentPk:c,ordPk:u,changeAddress:d,satsPerKb:f=g,additionalPayments:l=[]}=o,p=new i(f),h=new r;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");for(const t of a){h.addOutput({satoshis:1,lockingScript:(new C).lock(t.ordAddress,t.payAddress,t.price)});const o=F(t.listingUtxo.script,"base64"),s=n.fromBinary(o);h.addInput(I(t.listingUtxo,(new m).unlock(u,"all",!0,t.listingUtxo.satoshis,s)))}for(const o of l)h.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});let w;const y=(new t).lock(d||c.toAddress().toString());h.addOutput({lockingScript:y,change:!0});let b=0n;const k=h.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let S=0;for(const o of e){const e=I(o,(new t).unlock(c,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(h.addInput(e),b+=BigInt(o.satoshis),S=await p.computeFee(h),b>=k+BigInt(S))break}if(b<k+BigInt(S))throw new Error(`Not enough funds to create ordinal listings. Total sats in: ${b}, Total sats out: ${k}, Fee: ${S}`);await h.fee(p),await h.sign();const B=h.outputs.findIndex(t=>t.change);if(-1!==B){const t=h.outputs[B];w={satoshis:t.satoshis,txid:h.id("hex"),vout:B,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return w&&(w.satoshis=h.outputs[h.outputs.length-1].satoshis,w.txid=h.id("hex")),{tx:h,spentOutpoints:h.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:w}},L=async o=>{const{utxos:e,protocol:a,tokenID:c,ordPk:u,paymentPk:d,additionalPayments:f=[],changeAddress:l,tokenChangeAddress:p,inputTokens:h,listings:w,decimals:k,satsPerKb:S=g}=o;if(w.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead."),!h.every(t=>t.id===c))throw new Error("Input tokens do not match the provided tokenID");let B=0n,x=0n,v=0n;if(!h.every(t=>t.id===c))throw new Error("Input tokens do not match the provided tokenID");const O=new i(S),$=new r;for(const t of w){const o=BigInt(t.amt*10**k),n={p:"bsv-20",op:"transfer",amt:o.toString()};let s;if(a===b.BSV20)s=y({},n,{tick:c});else{if(a!==b.BSV21)throw new Error("Invalid protocol");s=y({},n,{id:c})}$.addOutput({satoshis:1,lockingScript:(new C).lock(t.ordAddress,t.payAddress,t.price,{dataB64:Buffer.from(JSON.stringify(s)).toString("base64"),contentType:"application/bsv-20"})}),v+=o}for(const t of h)$.addInput(I(t,(new m).unlock(u,"all",!0,t.satoshis,n.fromBinary(F(t.script,"base64"))))),x+=BigInt(t.amt);let A,E;if(B=x-v,B<0n)throw new Error("Not enough tokens to send");if(B>0n){const t={p:"bsv-20",op:"transfer",amt:B.toString()};let o;if(a===b.BSV20)o=y({},t,{tick:c});else{if(a!==b.BSV21)throw new Error("Invalid protocol");o=y({},t,{id:c})}const n=(new m).lock(p,{dataB64:Buffer.from(JSON.stringify(o)).toString("base64"),contentType:"application/bsv-20"}),s=$.outputs.length;$.addOutput({lockingScript:n,satoshis:1}),A={id:c,satoshis:1,script:Buffer.from(n.toBinary()).toString("base64"),txid:"",vout:s,amt:B.toString()}}for(const o of f)$.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});const P=l||d.toAddress().toString(),T=(new t).lock(P);$.addOutput({lockingScript:T,change:!0});let N=0n;const _=$.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let D=0;for(const o of e){const e=I(o,(new t).unlock(d,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if($.addInput(e),N+=BigInt(o.satoshis),D=await O.computeFee($),N>=_+BigInt(D))break}if(N<_+BigInt(D))throw new Error(`Not enough funds to create token listings. Total sats in: ${N}, Total sats out: ${_}, Fee: ${D}`);await $.fee(O),await $.sign();const L=$.id("hex");A&&(A.txid=L);const j=$.outputs.findIndex(t=>t.change);if(-1!==j){const t=$.outputs[j];E={satoshis:t.satoshis,txid:L,vout:j,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return E&&(E.satoshis=$.outputs[$.outputs.length-1].satoshis,E.txid=$.id("hex")),{tx:$,spentOutpoints:$.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:E,tokenChange:A}},j=async o=>{const{utxos:e,listingUtxos:a,ordPk:c,paymentPk:u,changeAddress:d,additionalPayments:f=[],satsPerKb:l=g}=o;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");const p=new i(l),h=new r;for(const o of a)h.addInput(I(o,(new C).cancelListing(c,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))))),h.addOutput({satoshis:1,lockingScript:(new t).lock(c.toAddress().toString())});for(const o of f)h.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});let w;const m=d||u.toAddress().toString(),y=(new t).lock(m);h.addOutput({lockingScript:y,change:!0});let b=0n;const k=h.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let S=0;for(const o of e){const e=I(o,(new t).unlock(u,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(h.addInput(e),b+=BigInt(o.satoshis),S=await p.computeFee(h),b>=k+BigInt(S))break}if(b<k+BigInt(S))throw new Error(`Not enough funds to cancel ordinal listings. Total sats in: ${b}, Total sats out: ${k}, Fee: ${S}`);await h.fee(p),await h.sign();const B=h.outputs.findIndex(t=>t.change);if(-1!==B){const t=h.outputs[B];w={satoshis:t.satoshis,txid:h.id("hex"),vout:B,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return w&&(w.satoshis=h.outputs[h.outputs.length-1].satoshis,w.txid=h.id("hex")),{tx:h,spentOutpoints:h.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:w}},U=async o=>{const{protocol:e,tokenID:a,ordAddress:c,changeAddress:u,paymentPk:d,ordPk:f,additionalPayments:l,listingUtxos:p,utxos:h,satsPerKb:w=g}=o;let k=0;if(p.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead."),!p.every(t=>t.id===a))throw new Error("Input tokens do not match the provided tokenID");const S=new i(w),B=new r;for(const t of p)B.addInput(I(t,(new C).cancelListing(f,"all",!0,t.satoshis,n.fromBinary(s.toArray(t.script,"base64"))))),k+=Number.parseInt(t.amt);const x={p:"bsv-20",op:"transfer",amt:k.toString()};let v;if(e===b.BSV20)v=y({},x,{tick:a});else{if(e!==b.BSV21)throw new Error("Invalid protocol");v=y({},x,{id:a})}const O={address:c||f.toAddress().toString(),inscription:{dataB64:Buffer.from(JSON.stringify(v)).toString("base64"),contentType:"application/bsv-20"}},$=(new m).lock(O.address,O.inscription);B.addOutput({satoshis:1,lockingScript:$});for(const o of l)B.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});let A;const E=u||d.toAddress().toString(),P=(new t).lock(E);B.addOutput({lockingScript:P,change:!0});let T=0n;const N=B.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let _=0;for(const o of h){const e=I(o,(new t).unlock(d,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(B.addInput(e),T+=BigInt(o.satoshis),_=await S.computeFee(B),T>=N+BigInt(_))break}if(T<N+BigInt(_))throw new Error(`Not enough funds to cancel token listings. Total sats in: ${T}, Total sats out: ${N}, Fee: ${_}`);await B.fee(S),await B.sign();const F={amt:k.toString(),script:Buffer.from($.toHex(),"hex").toString("base64"),txid:B.id("hex"),vout:0,id:a,satoshis:1},D=B.outputs.findIndex(t=>t.change);if(-1!==D){const t=B.outputs[D];A={satoshis:t.satoshis,txid:B.id("hex"),vout:D,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return A&&(A.satoshis=B.outputs[B.outputs.length-1].satoshis,A.txid=B.id("hex")),{tx:B,spentOutpoints:B.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:A,tokenChange:F}},V=async(t,o)=>{throw new Error("Not implemented")},K=async e=>{const{utxos:a,paymentPk:c,listing:u,ordAddress:d,changeAddress:f,additionalPayments:l=[],satsPerKb:p=g,royalties:h=[]}=e,w=new i(p),m=new r;m.addInput(I(u.listingUtxo,(new C).purchaseListing(1,n.fromBinary(s.toArray(u.listingUtxo.script,"base64"))))),m.addOutput({satoshis:1,lockingScript:(new t).lock(d)});const y=new s.Reader(s.toArray(u.payout,"base64")),b=y.readUInt64LEBn().toNumber(),S=y.readVarIntNum(),B=y.read(S),x=o.fromBinary(B);m.addOutput({satoshis:b,lockingScript:x});for(const o of l)m.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});for(const o of h){let e;const i=Math.floor(Number(o.percentage)*b);switch(o.type){case k.Paymail:e=await V();break;case k.Script:e=n.fromBinary(s.toArray(o.destination,"base64"));break;case k.Address:e=(new t).lock(o.destination);break;default:throw new Error("Invalid royalty type")}if(!e)throw new Error("Invalid royalty destination");m.addOutput({satoshis:i,lockingScript:e})}let v;const O=f||c.toAddress().toString(),$=(new t).lock(O);m.addOutput({lockingScript:$,change:!0});let A=0n;const E=m.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let P=0;for(const o of a){const e=I(o,(new t).unlock(c,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(m.addInput(e),A+=BigInt(o.satoshis),P=await w.computeFee(m),A>=E+BigInt(P))break}if(A<E+BigInt(P))throw new Error(`Not enough funds to purchase ordinal listing. Total sats in: ${A}, Total sats out: ${E}, Fee: ${P}`);await m.fee(w),await m.sign();const T=m.outputs.findIndex(t=>t.change);if(-1!==T){const t=m.outputs[T];v={satoshis:t.satoshis,txid:m.id("hex"),vout:T,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return v&&(v.satoshis=m.outputs[m.outputs.length-1].satoshis,v.txid=m.id("hex")),{tx:m,spentOutpoints:m.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:v}},M=async e=>{const{protocol:a,tokenID:c,utxos:u,paymentPk:d,listingUtxo:f,ordAddress:l,changeAddress:p,satsPerKb:h=g,additionalPayments:w=[]}=e,k=new i(h),S=new r;S.addInput(I(f,(new C).purchaseListing(1,n.fromBinary(s.toArray(f.script,"base64")))));const B={p:"bsv-20",op:"transfer",amt:f.amt};let x;if(a===b.BSV20)x=y({},B,{tick:c});else{if(a!==b.BSV21)throw new Error("Invalid protocol");x=y({},B,{id:c})}const v=Buffer.from(JSON.stringify(x)).toString("base64");if(S.addOutput({satoshis:1,lockingScript:(new m).lock(l,{dataB64:v,contentType:"bsv-20"})}),!f.payout)throw new Error("Listing UTXO does not have a payout script");const O=new s.Reader(s.toArray(f.payout,"base64")),$=O.readUInt64LEBn().toNumber(),A=O.readVarIntNum(),E=O.read(A),P=o.fromBinary(E);S.addOutput({satoshis:$,lockingScript:P});for(const o of w)S.addOutput({satoshis:o.amount,lockingScript:(new t).lock(o.to)});let T;const N=p||d.toAddress().toString(),_=(new t).lock(N);S.addOutput({lockingScript:_,change:!0});let F=0n;const D=S.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let L=0;for(const o of u){const e=I(o,(new t).unlock(d,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(S.addInput(e),F+=BigInt(o.satoshis),L=await k.computeFee(S),F>=D+BigInt(L))break}if(F<D+BigInt(L))throw new Error(`Not enough funds to purchase token listing. Total sats in: ${F}, Total sats out: ${D}, Fee: ${L}`);await S.fee(k),await S.sign();const j=S.outputs.findIndex(t=>t.change);if(-1!==j){const t=S.outputs[j];T={satoshis:t.satoshis,txid:S.id("hex"),vout:j,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return T&&(T.satoshis=S.outputs[S.outputs.length-1].satoshis,T.txid=S.id("hex")),{tx:S,spentOutpoints:S.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:T}},R=new Error("Image must be a square image with dimensions <= 400x400"),q=new Error("Image must be a square image"),H=new Error("Error processing image"),J=new Error("Image dimensions are undefined"),X=async o=>{const{symbol:e,icon:a,decimals:c,utxos:u,initialDistribution:d,paymentPk:f,destinationAddress:p,changeAddress:h,satsPerKb:w=g,additionalPayments:y=[]}=o,b=new i(w),k=new r;let S;if("string"==typeof a)S=a;else{const t=await(async t=>{const{dataB64:o,contentType:n}=t;if("image/svg+xml"===n)return(t=>{const o=Buffer.from(t,"base64").toString("utf-8"),n=o.match(/<svg[^>]*\s+width="([^"]+)"/),s=o.match(/<svg[^>]*\s+height="([^"]+)"/);if(console.log({widthMatch:n,heightMatch:s}),!n||!s)return J;const e=Number.parseInt(n[1],10),i=Number.parseInt(s[1],10);return Number.isNaN(e)||Number.isNaN(i)?J:e!==i?q:e>400||i>400?R:null})(o);if((s=n)!=s)return H;var s;try{const t=Buffer.from(o,"base64"),n=await l.read(t),s=n.getWidth(),e=n.getHeight();return void 0===s||void 0===e?J:s!==e?q:s>400||e>400?R:null}catch(t){return H}})(a);if(t)throw t;const o=(new m).lock(p,a);k.addOutput({satoshis:1,lockingScript:o}),S="_0"}if(!(t=>{if(!t.includes("_")||t.endsWith("_"))return!1;const o=Number.parseInt(t.split("_")[1]);return!(Number.isNaN(o)||!t.startsWith("_")&&64!==t.split("_")[0].length)})(S))throw new Error("Invalid icon format. Must be either outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1");const B={p:"bsv-20",op:"deploy+mint",sym:e,icon:S,amt:(c?BigInt(d.amt)*10n**BigInt(c):BigInt(d.amt)).toString()};c&&(B.dec=c.toString());const x=Buffer.from(JSON.stringify(B)).toString("base64"),v={satoshis:1,lockingScript:(new m).lock(p,{dataB64:x,contentType:"application/bsv-20"})};k.addOutput(v);for(const o of y){const n={satoshis:o.amount,lockingScript:(new t).lock(o.to)};k.addOutput(n)}let O=0n;const $=k.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let A,E=0;for(const o of u){const e=I(o,(new t).unlock(f,"all",!0,o.satoshis,n.fromBinary(s.toArray(o.script,"base64"))));if(k.addInput(e),O+=BigInt(o.satoshis),E=await b.computeFee(k),O>=$+BigInt(E))break}if(O<$+BigInt(E))throw new Error(`Not enough funds to deploy token. Total sats in: ${O}, Total sats out: ${$}, Fee: ${E}`);const P=h||f.toAddress().toString(),T=(new t).lock(P);k.addOutput({lockingScript:T,change:!0}),await k.fee(b),await k.sign();const N=k.outputs.findIndex(t=>t.change);if(-1!==N){const t=k.outputs[N];A={satoshis:t.satoshis,txid:k.id("hex"),vout:N,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")}}return{tx:k,spentOutpoints:k.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:A}},W=async t=>{const o=new r,e=[],{ordinals:i,metaData:a}=t;for(const r of i){if(1!==r.satoshis)throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");const i=I(r,(new m).unlock(t.ordPk,"all",!0,r.satoshis,n.fromBinary(s.toArray(r.script,"base64"))));e.push(`${r.txid}_${r.vout}`),o.addInput(i)}if(a&&(!a.app||!a.type))throw new Error("MAP.app and MAP.type are required fields");let c="";if(null!=a&&a.app&&null!=a&&a.type){c=`OP_FALSE OP_RETURN ${p(h)} ${p("SET")}`;for(const[t,o]of Object.entries(a))"cmd"!==t&&(c=`${c} ${p(t)} ${p(o)}`)}return o.addOutput({satoshis:0,lockingScript:n.fromASM(c||"OP_FALSE OP_RETURN")}),await o.sign(),{tx:o,spentOutpoints:e}};export{S as MAX_TOKEN_SUPPLY,C as OrdLock,m as OrdP2PKH,k as RoytaltyType,b as TokenType,W as burnOrdinals,j as cancelOrdListings,U as cancelOrdTokenListings,D as createOrdListings,L as createOrdTokenListings,E as createOrdinals,X as deployBsv21Token,v as fetchNftUtxos,x as fetchPayUtxos,O as fetchTokenUtxos,K as purchaseOrdListing,M as purchaseOrdTokenListing,P as sendOrdinals,T as sendUtxos,A as stringifyMetaData,N as transferOrdTokens,_ as validateSubTypeData};
//# sourceMappingURL=index.modern.js.map
