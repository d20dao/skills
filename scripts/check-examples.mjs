import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import solc from 'solc';
import {recipes,deriveMappedResult} from '../skills/d20-consumer/assets/mappings.mjs';

const source='skills/d20-consumer/assets/RandomnessConsumer.sol';
const input={language:'Solidity',sources:{[source]:{content:readFileSync(source,'utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const compiled=JSON.parse(solc.compile(JSON.stringify(input),{import:path=>{
  if(!path.startsWith('@d20dao/vrf-sdk/contracts/')||path.includes('..'))return {error:'Unexpected import'};
  try{return {contents:readFileSync('node_modules/'+path,'utf8')}}catch{return {error:'SDK source unavailable'}}
}}));
assert.deepEqual((compiled.errors??[]).filter(e=>e.severity==='error'),[]);
assert(compiled.contracts[source].RandomnessConsumer.evm.bytecode.object.length>0);
const fixtureWord='0x'+'12'.repeat(32); // Public local fixture, not an accepted protocol proof.
for(const spec of Object.values(recipes)){
  const {values}=deriveMappedResult(fixtureWord,spec);
  assert.equal(values.length,spec.operation===0?1:spec.count);
  if(spec.operation>=4){assert.equal(new Set(values).size,values.length);assert(values.every(v=>v>=0n&&v<BigInt(spec.population)));}
}
const snapshot=JSON.parse(readFileSync('skills/d20-consumer/references/arc-testnet.json','utf8'));
const provenance=JSON.parse(readFileSync('node_modules/@d20dao/vrf-sdk/PROTOCOL-PROVENANCE.json','utf8'));
assert.equal(snapshot.protocolSourceCommit,provenance.sourceCommit);
assert.equal(snapshot.chainId,5042002);
for(const c of Object.values(snapshot.contracts)){assert(/^0x[0-9a-fA-F]{40}$/.test(c.proxy));assert(/^0x[0-9a-fA-F]{40}$/.test(c.implementation));}
console.log('Solidity example compiled; mapping examples and SDK/deployment source provenance passed. No chain transactions sent.');
