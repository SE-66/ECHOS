import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{SPECS,getBaseline,updatedState,compare,parseDecimal} from '../src/index.js';

async function examine(domain,values={},evidence={},new_label=undefined){
  const spec=SPECS[domain],base=getBaseline(domain);
  const newState=updatedState(spec,base,{values,evidence,new_label});
  return compare(spec,base,newState);
}

test('Cloudflare API and static asset routing',async()=>{
  const resp=await worker.fetch(new Request('https://echos.example/api/health'));
  assert.equal(resp.status,200);
  assert.deepEqual(await resp.json(),{ok:true,version:'0.1.0',platform:'cloudflare-workers'});
  const home=await worker.fetch(new Request('https://echos.example/'),{ASSETS:{fetch:()=>new Response('STATIC UI')}});
  assert.equal(await home.text(),'STATIC UI');
});
test('pricing boundary and stability',async()=>{
  const before=await examine('pricing',{variable_cost:'70'});
  assert.equal(before.expected_relation,'REASSESS_BUT_PRESERVE');
  assert.equal(before.updated.signed_slack,'0.05');
  const exact=await examine('pricing',{variable_cost:'75'});
  assert.equal(exact.updated.action,'KEEP_PRICE_WITHIN_RULE');
  assert.equal(exact.updated.signed_slack,'0');
  const after=await examine('pricing',{variable_cost:'75.01'});
  assert.equal(after.expected_relation,'ADAPT_DECISION');
  assert.equal(after.updated.action,'REVIEW_PRICE_OR_COST');
});
test('liquidity change flips and correctly computes amount',async()=>{
  const r=await examine('liquidity',{supplier_due:'650000'});
  assert.equal(r.expected_relation,'ADAPT_DECISION');
  assert.equal(r.updated.signed_slack,'-250000');
});
test('budget and profitability baselines',async()=>{
  for(const domain of ['budget','profitability']){
    const r=await examine(domain);
    assert.equal(r.baseline.action,SPECS[domain].good_action);
    assert.equal(r.expected_relation,'PRESERVE_INVARIANT');
  }
});
test('evidence deficits override arithmetic',async()=>{
  const r=await examine('pricing',{}, {variable_cost:'disputed'});
  assert.equal(r.expected_relation,'EVIDENCE_REQUIRED');
  assert.equal(r.updated.action,'REQUEST_EVIDENCE');
  assert.deepEqual(r.updated.deficits,['variable_cost']);
});
test('cosmetic update preserves financial decision',async()=>{
  const r=await examine('pricing',{}, {},'Changed layout');
  assert.equal(r.expected_relation,'PRESERVE_INVARIANT');
  assert.equal(Object.keys(r.presentation_changes).length,1);
});
test('numerical inputs validated',()=>{
  assert.throws(()=>parseDecimal('1e5'));
  assert.throws(()=>parseDecimal('Infinity'));
  assert.throws(()=>updatedState(SPECS.pricing,getBaseline('pricing'),{values:{price:'0'},evidence:{}}));
});
test('score API recalculates reference instead of trusting injected case oracle',async()=>{
  const r=await worker.fetch(new Request('https://echos.example/api/score', {
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({case:{domain:'pricing',changed_state:updatedState(SPECS.pricing,getBaseline('pricing'),{values:{variable_cost:'80'},evidence:{}}),oracle:{updated:{action:'FAKE'}}},
      answer:{baseline_action:'KEEP_PRICE_WITHIN_RULE',updated_action:'REVIEW_PRICE_OR_COST',changed_fields:['variable_cost'],evidence_deficits:[],reassessed:true}})
  }));
  const result=await r.json();
  assert.equal(result.correct_action,true);
  assert.equal(result.all_checks_passed,true);
});
test('Worker API rejects malformed data',async()=>{
  const r=await worker.fetch(new Request('https://echos.example/api/evaluate',{method:'POST',body:JSON.stringify({domain:'pricing',values:{price:'-1'},evidence:{}})}));
  assert.equal(r.status,400);
});