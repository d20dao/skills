import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import solc from 'solc';
import {recipes,deriveMappedResult} from '../skills/d20-consumer/assets/mappings.mjs';

const sdkDir='node_modules/@d20dao/vrf-sdk';
const sdkFile=path=>sdkDir+'/'+path.slice('@d20dao/vrf-sdk/'.length);
const source='skills/d20-consumer/assets/RandomnessConsumer.sol';
const template=readFileSync(source,'utf8');
assert(template.includes('.quoteFee(CALLBACK_GAS)'),'The template must pay the same-transaction quoteFee');
const input={language:'Solidity',sources:{[source]:{content:template}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const compiled=JSON.parse(solc.compile(JSON.stringify(input),{import:path=>{
  if(!path.startsWith('@d20dao/vrf-sdk/contracts/')||path.includes('..'))return {error:'Unexpected import'};
  try{return {contents:readFileSync(sdkFile(path),'utf8')}}catch{return {error:'SDK source unavailable'}}
}}));
assert.deepEqual((compiled.errors??[]).filter(e=>e.severity==='error'),[]);
assert(compiled.contracts[source].RandomnessConsumer.evm.bytecode.object.length>0);
const consumerAbi=compiled.contracts[source].RandomnessConsumer.abi;
assert(consumerAbi.some(f=>f.type==='receive'),'The template is its own refund address and must accept native transfers');
for(const name of ['claimRefundCredit','withdrawRefund','onRefund'])assert(consumerAbi.some(f=>f.type==='function'&&f.name===name),`missing ${name}`);

// Every coordinator function the template declares locally must exist on the real coordinator.
const signature=f=>`${f.name}(${f.inputs.map(i=>i.type).join(',')})`;
const localFunctions=compiled.contracts[source].ID20VRFRefunds.abi.filter(f=>f.type==='function');
const coordinator=new Map(JSON.parse(readFileSync(sdkDir+'/abi/D20VRFCoordinator.json','utf8')).filter(f=>f.type==='function').map(f=>[signature(f),f]));
for(const f of localFunctions){
  const actual=coordinator.get(signature(f));
  assert(actual,`coordinatorAbi lacks ${signature(f)}`);
  assert.equal(actual.stateMutability,f.stateMutability,signature(f));
  assert.deepEqual(actual.outputs.map(o=>o.type),f.outputs.map(o=>o.type),signature(f));
}

const fixtureWord='0x'+'12'.repeat(32); // Public local fixture, not an accepted protocol proof.
for(const spec of Object.values(recipes)){
  const {values}=deriveMappedResult(fixtureWord,spec);
  assert.equal(values.length,spec.operation===0?1:spec.count);
  if(spec.operation>=4){assert.equal(new Set(values).size,values.length);assert(values.every(v=>v>=0n&&v<BigInt(spec.population)));}
}
const snapshot=JSON.parse(readFileSync('skills/d20-consumer/references/arc-testnet.json','utf8'));
const provenancePath=sdkDir+'/PROTOCOL-PROVENANCE.json';
assert.equal(snapshot.protocolSourceCommit,JSON.parse(readFileSync(provenancePath,'utf8')).sourceCommit);
assert.equal(snapshot.chainId,5042002);
for(const c of Object.values(snapshot.contracts)){assert(/^0x[0-9a-fA-F]{40}$/.test(c.proxy));assert(/^0x[0-9a-fA-F]{40}$/.test(c.implementation));}
console.log(`Solidity example compiled against ${sdkDir}; coordinator interface and mapping examples checked; deployment source provenance matched the SDK. No chain transactions sent.`);
