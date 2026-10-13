import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSituation,normalize} from '../src/situation-engine.js';
import {SITUATION,SITUATION_PRESETS} from '../src/situation-example.js';
import {DECISION_BANK,searchBank} from '../src/decision-bank.js';
import worker from '../src/index.js';
const evalCase=(ch={})=>evaluateSituation(SITUATION,ch);
test('bank spans multiple intersecting business disciplines',()=>{
 assert.ok(DECISION_BANK.length>=25);
 assert.ok(searchBank({query:'supplier'}).length>=2);
 assert.ok(DECISION_BANK.some(d=>d.areas.includes('Legal')));
});
test('baseline evaluates mixed numeric, policy and contractual conditions',()=>{
 const r=evalCase();assert.equal(r.updated.outcome,'CONDITIONS_MET');assert.equal(r.updated.decisions.length,4);
 assert.equal(r.updated.requirements.find(x=>x.id==='amendment_consent').status,'not_applicable');
});
test('changed contract terms trigger consent without numeric change',()=>{
 const r=evalCase(SITUATION_PRESETS.contractual_only);
 assert.equal(r.updated.outcome,'BLOCKED');
 assert.equal(r.updated.requirements.find(x=>x.id==='amendment_consent').status,'fails');
 assert.deepEqual(r.changes.find(x=>x.id==='amendment').affected_decisions,['supplier_terms']);
});
test('verified consent resolves contractual requirement',()=>{
 const r=evalCase(SITUATION_PRESETS.consent_recorded);
 assert.equal(r.updated.outcome,'CONDITIONS_MET');
 assert.equal(r.updated.requirements.find(x=>x.id==='amendment_consent').status,'passes');
});
test('a purchase increase affects multiple decisions',()=>{
 const r=evalCase(SITUATION_PRESETS.contract_and_budget);
 assert.equal(r.updated.outcome,'BLOCKED');
 assert.equal(r.updated.requirements.find(x=>x.id==='budget_reserve').status,'fails');
 assert.equal(r.updated.requirements.find(x=>x.id==='amendment_consent').status,'fails');
 assert.equal(r.changes.find(x=>x.id==='purchase').affected_decisions.length,3);
});
test('cross border policy does not assume law; missing review causes uncertainty',()=>{
 const r=evalCase(SITUATION_PRESETS.legal_review_missing);assert.equal(r.updated.outcome,'NEEDS_REVIEW');
 assert.equal(r.updated.requirements.find(x=>x.id==='cross_border_review').status,'needs_review');
});
test('lost board approval blocks without changed financial numbers',()=>{
 const r=evalCase(SITUATION_PRESETS.approval_revoked);
 assert.equal(r.updated.outcome,'BLOCKED');assert.equal(r.updated.requirements.find(x=>x.id==='delegation').status,'fails');
});
test('policy exception requires approval',()=>{
 const r=evalCase(SITUATION_PRESETS.policy_exception);assert.equal(r.updated.outcome,'BLOCKED');
 assert.equal(r.updated.requirements.find(x=>x.id==='exception_authority').status,'fails');
});
test('advisory supplier risk is disclosed, not silently hard-blocking',()=>{
 const r=evalCase(SITUATION_PRESETS.supplier_risk);
 assert.equal(r.updated.outcome,'CONDITIONS_MET');assert.ok(r.updated.decisions.find(x=>x.id==='supplier_terms').advisories.includes('risk_monitoring'));
});
test('offsetting cash changes do not conceal a budget failure',()=>{
 const r=evalCase(SITUATION_PRESETS.combined_offsets);
 assert.equal(r.updated.outcome,'BLOCKED');assert.equal(r.updated.requirements.find(x=>x.id==='min_liquidity').status,'passes');
 assert.equal(r.updated.requirements.find(x=>x.id==='budget_reserve').status,'fails');
});
test('disputed evidence creates review rather than compliance assertion',()=>{
 const r=evalCase(SITUATION_PRESETS.uncertain_evidence);assert.equal(r.updated.outcome,'NEEDS_REVIEW');
 assert.equal(r.updated.requirements.find(x=>x.id==='budget_reserve').status,'needs_review');
});
test('outdated source requires review even if fact is true',()=>{
 const m=structuredClone(SITUATION);m.requirements.find(x=>x.id==='delegation').source.effective_to='2026-01-01';
 const r=evaluateSituation(m);assert.equal(r.updated.requirements.find(x=>x.id==='delegation').status,'needs_review');
});
test('reject unknown nodes, unsafe type changes, and loops',()=>{
 assert.throws(()=>evalCase({not_present:{value:1}}),/declared facts/);
 assert.throws(()=>evalCase({board_approval:{value:'yes'}}),/yes or no/);
 const m=structuredClone(SITUATION);m.calculations[0].args=['budget_after','purchase'];m.calculations[1].args=['cash_after','purchase'];
 assert.throws(()=>normalize(m),/Cyclic calculation/);
});
test('API exposes decision bank and evaluates a qualitative change',async()=>{
 let response=await worker.fetch(new Request('https://e.test/api/bank'));
 assert.equal(response.status,200);let bank=await response.json();assert.ok(bank.length>=25);
 response=await worker.fetch(new Request('https://e.test/api/situation/example'));
 assert.equal(response.status,200);const example=await response.json();
 response=await worker.fetch(new Request('https://e.test/api/situation/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:example.model,changes:{board_approval:{value:false}}})}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.updated.outcome,'BLOCKED');
});
test('source expiry overrides self-declared fact verification',()=>{
 const m=structuredClone(SITUATION);m.facts.find(f=>f.id==='cash').source.effective_to='2026-01-01';
 const r=evaluateSituation(m);
 assert.equal(r.updated.outcome,'NEEDS_REVIEW');
 assert.equal(r.updated.values.cash.evidence,'expired');
});
test('unreviewed external statute is never marked automatically satisfied',()=>{
 const m=structuredClone(SITUATION);const rule=m.requirements.find(x=>x.id==='delegation');
 rule.source={type:'statute',reference:'Hypothetical example law',jurisdiction:'Lebanon'};
 const r=evaluateSituation(m);
 assert.equal(r.updated.requirements.find(x=>x.id==='delegation').status,'needs_review');
});
test('new situations can combine text, enumerated statuses and dates without numeric formulas',()=>{
 const source={type:'company_policy',reference:'Fictional local approval policy',jurisdiction:'internal'};
 const f=(id,kind,value,extra={})=>({id,label:id,kind,value,evidence:'declared_verified',source,...extra});
 const model={name:'Customer onboarding decision',as_of:'2026-10-13',entity:'Example',jurisdiction:'Lebanon',decisions:[{id:'onboard',title:'Accept customer'}],
  facts:[f('contract_status','text','signed'),f('risk_tier','enum','low',{options:['low','medium','high']}),f('approval_date','date','2026-10-10')],
  requirements:[{id:'contract',title:'Signed contract',kind:'predicate',fact:'contract_status',op:'eq',value:'signed',decision_ids:['onboard'],source},
   {id:'risk',title:'Risk tier must be allowed',kind:'predicate',fact:'risk_tier',op:'in',value:['low','medium'],decision_ids:['onboard'],source},
   {id:'date',title:'Approval date',kind:'predicate',fact:'approval_date',op:'gte',value:'2026-10-01',decision_ids:['onboard'],source}]};
 assert.equal(evaluateSituation(model).updated.outcome,'CONDITIONS_MET');
 assert.equal(evaluateSituation(model,{risk_tier:{value:'high'}}).updated.outcome,'BLOCKED');
 assert.equal(evaluateSituation(model,{approval_date:{value:'2026-09-01'}}).updated.outcome,'BLOCKED');
});
test('uncertain condition applicability produces review rather than silent inapplicability',()=>{
 const r=evalCase({amendment:{evidence:'unverified'}});
 assert.equal(r.updated.requirements.find(x=>x.id==='amendment_consent').status,'needs_review');
});