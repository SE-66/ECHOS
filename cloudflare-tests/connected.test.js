import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,normalize} from '../src/context-engine.js';
import {EXAMPLE,EXAMPLE_CHANGES} from '../src/connected-examples.js';
import worker from '../src/index.js';
const exp=(changes={})=>evaluate(EXAMPLE,changes);
test('Multiple connected conditions, all satisfied at baseline',()=>{
  const r=exp();assert.equal(r.updated.outcome,'WITHIN_RULES');assert.equal(r.updated.requirements.length,3);
  assert.deepEqual(r.updated.requirements.map(x=>x.status),['passes','passes','passes']);
});
test('One decision affected across liquidity and profitability at once',()=>{
  const r=exp(EXAMPLE_CHANGES.combined);assert.equal(r.updated.outcome,'RULES_NOT_MET');
  assert.deepEqual(r.updated.requirements.map(x=>x.status),['fails','passes','fails']);
  assert.deepEqual(r.requirement_changes.map(x=>x.id),['liquidity','profitability']);
});
test('A shared input affects two financial domains',()=>{
 const r=exp(EXAMPLE_CHANGES.overlapping);const x=r.changes.find(x=>x.id==='investment');
 assert.deepEqual(x.affects,['liquidity','budget_capacity']);assert.equal(r.overlap.length,1);
 assert.deepEqual(r.updated.requirements.map(x=>x.status),['passes','fails','passes']);
});
test('Two offsetting changes preserve decisions while recording them',()=>{
 const r=exp(EXAMPLE_CHANGES.offsets);assert.equal(r.updated.outcome,'WITHIN_RULES');
 assert.equal(r.relation,'REASSESS_BUT_STATUS_STABLE');assert.equal(r.changes.length,2);
});
test('Unknown evidence prevents unconditional approval',()=>{
 const r=exp(EXAMPLE_CHANGES.evidence);assert.equal(r.updated.outcome,'NEEDS_EVIDENCE');
 assert.equal(r.updated.requirements[2].status,'needs_evidence');
 assert.deepEqual(r.updated.requirements[2].evidence_gaps,['project_revenue']);
});
test('Verified failure remains visible even if unrelated evidence is missing',()=>{
 const r=exp({supplier_due:{value:'450000'},project_revenue:{status:'disputed'}});
 assert.equal(r.updated.outcome,'RULES_NOT_MET');assert.equal(r.updated.requirements[0].status,'fails');
 assert.equal(r.updated.requirements[2].status,'needs_evidence');
});
test('Model is not locked to four domains or input names',()=>{
 const custom={name:'Supplier credit decision',inputs:[
 {id:'credit_limit',value:'200',unit:'USD',period:'Q1',entity:'A'},
 {id:'invoice_due',value:'190',unit:'USD',period:'Q1',entity:'A'}],
 conditions:[{id:'supplier',left:'credit_limit',right:'invoice_due',compare:'gte',label:'Credit limit'}]};
 assert.equal(evaluate(custom).updated.outcome,'WITHIN_RULES');
 assert.equal(evaluate(custom,{invoice_due:{value:'220'}}).updated.outcome,'RULES_NOT_MET');
});
test('No arbitrary derived field may be edited through changes',()=>{
 assert.throws(()=>exp({cash_after:{value:'900000'}}),/Only financial inputs/);
});
test('Cycles, entity mismatch, period mismatch, and unit mismatch rejected',()=>{
 const a=structuredClone(EXAMPLE);a.calculations[0].args=['budget_after','cash'];a.calculations[1].args=['cash_after','budget'];
 assert.throws(()=>normalize(a),/Circular/);
 const b=structuredClone(EXAMPLE);b.inputs[0].entity='Another company';assert.throws(()=>normalize(b),/Entity or reporting-period mismatch/);
 const c=structuredClone(EXAMPLE);c.inputs[0].period='Q1';assert.throws(()=>normalize(c),/Entity or reporting-period mismatch/);
 const d=structuredClone(EXAMPLE);d.inputs[0].unit='EUR';assert.throws(()=>normalize(d),/Currency\/unit mismatch/);
});
test('Change cannot silently alter units or evidence status',()=>{
 assert.throws(()=>exp({cash:{unit:'EUR'}}),/Cannot silently/);
 assert.throws(()=>exp({cash:{status:'true'}}),/Invalid evidence status/);
});
test('API returns connected model and accepts custom evaluation',async()=>{
 let r=await worker.fetch(new Request('https://echos.example/api/connected/example'));
 assert.equal(r.status,200);let d=await r.json();assert.ok(d.model.inputs.length>4);
 r=await worker.fetch(new Request('https://echos.example/api/connected/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:d.model,changes:d.presets.combined})}));
 assert.equal(r.status,200);let result=await r.json();assert.equal(result.updated.outcome,'RULES_NOT_MET');
});