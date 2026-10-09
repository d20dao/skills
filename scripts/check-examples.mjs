import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import solc from 'solc';
import {mappings,deriveMappedResult} from '../skills/d20-consumer/assets/mappings.mjs';

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
// Both coordinators: Arc's epoch coordinator and Robinhood Chain's round coordinator.
for(const abiFile of ['D20VRFCoordinator.json','D20VRFCoordinatorRobinhood.json']){
  const coordinator=new Map(JSON.parse(readFileSync(sdkDir+'/abi/'+abiFile,'utf8')).filter(f=>f.type==='function').map(f=>[signature(f),f]));
  for(const f of localFunctions){
    const actual=coordinator.get(signature(f));
    assert(actual,`${abiFile} lacks ${signature(f)}`);
    assert.equal(actual.stateMutability,f.stateMutability,signature(f));
    assert.deepEqual(actual.outputs.map(o=>o.type),f.outputs.map(o=>o.type),signature(f));
  }
}

const fixtureWord='0x'+'12'.repeat(32); // Public local fixture, not an accepted protocol proof.
for(const spec of Object.values(mappings)){
  const {values}=deriveMappedResult(fixtureWord,spec);
  assert.equal(values.length,spec.operation===0?1:spec.count);
  if(spec.operation>=4){assert.equal(new Set(values).size,values.length);assert(values.every(v=>v>=0n&&v<BigInt(spec.population)));}
}

// Deployment snapshots: well-formed identities, the same implementations on both chains, and — when the
// installed package is the release a snapshot names — the protocol source the SDK was copied from.
const installedVersion=JSON.parse(readFileSync(sdkDir+'/package.json','utf8')).version;
const provenance=JSON.parse(readFileSync(sdkDir+'/PROTOCOL-PROVENANCE.json','utf8')).sourceCommit;
const address=/^0x[0-9a-fA-F]{40}$/,codeHash=/^0x[0-9a-f]{64}$/,commit=/^[0-9a-f]{40}$/;
const snapshots=[['arc-mainnet.json',5042],['arc-testnet.json',5042002],['robinhood-mainnet.json',4663],['robinhood-testnet.json',46630]].map(([file,chainId])=>{
  const snapshot=JSON.parse(readFileSync(`skills/d20-consumer/references/${file}`,'utf8'));
  assert.equal(snapshot.chainId,chainId,file);
  assert(commit.test(snapshot.protocolSourceCommit),`${file} needs a full protocol source commit`);
  for(const [name,c] of Object.entries(snapshot.contracts)){
    assert(address.test(c.proxy),`${file} ${name} proxy`);
    assert(address.test(c.implementation),`${file} ${name} implementation`);
    assert(codeHash.test(c.implementationCodeHash),`${file} ${name} implementation code hash`);
    if(c.previousImplementation!==undefined)assert(address.test(c.previousImplementation),`${file} ${name} previous implementation`);
  }
  // The beacon verifier is stateless and has no proxy, so it is listed apart from the proxied contracts.
  assert(address.test(snapshot.beaconVerifier?.address),`${file} beacon verifier address`);
  assert(codeHash.test(snapshot.beaconVerifier?.codeHash),`${file} beacon verifier code hash`);
  return {file,snapshot};
});
const [mainnet,testnet,robinhood,robinhoodTestnet]=snapshots.map(s=>s.snapshot);
for(const name of ['coordinator','epochRegistry','costClient'])
  assert.equal(mainnet.contracts[name].implementation,testnet.contracts[name].implementation,`${name} implementation differs between chains`);
assert.deepEqual(mainnet.beaconVerifier,testnet.beaconVerifier,'beacon verifier differs between chains');
// Robinhood Chain: one CREATE2 implementation set on both networks, and the same beacon verifier as Arc.
assert.equal(robinhood.contracts.coordinator.implementation,robinhoodTestnet.contracts.coordinator.implementation);
for(const name of ['proofVerifier','mappingLibrary','beaconVerifier'])assert.deepEqual(robinhood[name],robinhoodTestnet[name],name);
assert.deepEqual(robinhood.beaconVerifier,mainnet.beaconVerifier);
// The snapshots agree with the deployments the installed SDK carries (D20_NETWORKS, SDK 0.6.0 and later).
const sdk=await import('@d20dao/vrf-sdk');
const networkNote=sdk.D20_NETWORKS?(()=>{
  for(const [name,s] of [['arc-mainnet',mainnet],['arc-testnet',testnet],['robinhood-mainnet',robinhood],['robinhood-testnet',robinhoodTestnet]]){
    const n=sdk.D20_NETWORKS[name];
    assert.equal(n.chainId,BigInt(s.chainId),name);
    assert.equal(n.coordinator,s.contracts.coordinator.proxy,name);
    assert.equal(n.coordinatorImplementation,s.contracts.coordinator.implementation,name);
    assert.equal(n.coordinatorImplementationCodeHash,s.contracts.coordinator.implementationCodeHash,name);
    assert.equal(n.beaconVerifier,s.beaconVerifier.address,name);
    if(s.owner!==undefined)assert.equal(n.owner,s.owner,name);
    if(n.kind==='round'){assert.equal(n.keyHash,s.keyHash,name);assert.equal(n.protocolConfigurationHash,s.protocolConfigurationHash,name);
      assert.equal(n.proofVerifier,s.proofVerifier.address,name);assert.equal(n.mappingLibrary,s.mappingLibrary.address,name);}
    else assert.equal(n.registry,s.contracts.epochRegistry.proxy,name);
  }
  return 'snapshots match D20_NETWORKS';
})():'installed SDK has no D20_NETWORKS, so the snapshots were NOT compared with it';
const pinned=snapshots.filter(({snapshot})=>snapshot.sdk===`@d20dao/vrf-sdk@${installedVersion}`);
for(const {file,snapshot} of pinned)assert.equal(snapshot.protocolSourceCommit,provenance,file);
const provenanceNote=pinned.length===snapshots.length
  ?`deployment source provenance matched ${installedVersion}`
  :`deployment snapshots name @d20dao/vrf-sdk@${snapshots[0].snapshot.sdk.split('@').pop()} but ${installedVersion} is installed, so the protocol source pin was NOT verified`;
console.log(`Solidity example compiled against ${sdkDir}; both coordinator interfaces, mapping examples and all four deployment snapshots checked; ${networkNote}; ${provenanceNote}. No chain transactions sent.`);
