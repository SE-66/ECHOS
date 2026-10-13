/** ECHOS Step 4 — bounded, auditable multi-alternative assessment.
 * No legal advice, invented rule applicability, or globally optimal decisions.
 */
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const OPS=new Set(['gte','lte','eq','neq']);
const TYPES=new Set(['number','boolean','category']);
const EVIDENCE=new Set(['documented','declared','uncertain','missing','disputed']);
const GOALS=new Set(['maximize','minimize']);
const err=m=>{throw Error(m)};
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const ident=s=>{if(typeof s!=='string'||!ID.test(s))err('Invalid ID');return s};
const limit=(a,n,label)=>{if(!Array.isArray(a)||a.length>n)err('Invalid '+label);return a};
function numeric(v){if(typeof v!=='string'&&typeof v!=='number')err('Expected numeric value');const s=String(v);if(!/^-?\d+(?:\.\d{1,6})?$/.test(s))err('Invalid decimal');const [a,b='']=s.split('.');const abs=BigInt(a.startsWith('-')?a.slice(1):a)*1000000n+BigInt(b.padEnd(6,'0')||'0');return a.startsWith('-')?-abs:abs;}
function display(n){let sign=n<0n?'-':'';if(n<0n)n=-n;let frac=(n%1000000n).toString().padStart(6,'0').replace(/0+$/,'');return sign+(n/1000000n).toString()+(frac?'.'+frac:'');}
function typecheck(value,type){if(value===null)return; if(type==='number')numeric(value);else if(type==='boolean'&&typeof value!=='boolean')err('Expected boolean');else if(type==='category'&&(typeof value!=='string'||value.length>100))err('Expected category');}
function compare(actual,target,op,type){let a=type==='number'?numeric(actual):actual,b=type==='number'?numeric(target):target;
 if(op==='eq')return a===b;if(op==='neq')return a!==b;if(type!=='number')err('Ordered comparison requires a number');return op==='gte'?a>=b:a<=b;}
function evaluateAlternatives(input){
 if(!isObj(input))err('Decision model required');
 const options=limit(input.alternatives,15,'alternatives'),criteria=limit(input.criteria,45,'criteria'),scenarios=limit(input.scenarios,12,'scenarios');
 if(options.length<2||criteria.length===0||scenarios.length===0)err('At least two alternatives, one criterion and one scenario are required');
 const ids=new Set(),cids=new Set(),sids=new Set();
 for(const o of options){if(!isObj(o)||!o.label||typeof o.label!=='string')err('Alternative label required');ident(o.id);if(ids.has(o.id))err('Duplicate alternative');ids.add(o.id)}
 for(const c of criteria){if(!isObj(c)||!c.label||typeof c.label!=='string'||!TYPES.has(c.type)||!['hard','objective'].includes(c.role))err('Invalid criterion');ident(c.id);if(cids.has(c.id))err('Duplicate criterion');cids.add(c.id);
  if(c.role==='hard'){if(!OPS.has(c.operator))err('Invalid constraint');if(c.type!=='number'&&!['eq','neq'].includes(c.operator))err('Invalid comparator for criterion type');typecheck(c.threshold,c.type);if(c.threshold==null)err('Missing threshold');}
  else {if(c.type!=='number'||!GOALS.has(c.goal))err('Objectives must be numeric and directional');}
  if(typeof c.source!=='string'||!c.source.trim())err('Criterion source required');
 }
 for(const sc of scenarios){if(!isObj(sc)||typeof sc.label!=='string'||!sc.label.trim())err('Scenario label required');ident(sc.id);if(sids.has(sc.id))err('Duplicate scenario');sids.add(sc.id)}
 const assessments=[];
 for(const sc of scenarios)for(const op of options){
  const records=[];let failed=0,unknown=0,passed=0;
  for(const c of criteria){const row=input.observations?.[sc.id]?.[op.id]?.[c.id];
   if(!isObj(row)) {records.push({criterion_id:c.id,result:'unknown',reason:'not_supplied'});if(c.role==='hard')unknown++;continue}
   if(!EVIDENCE.has(row.evidence))err('Invalid evidence status');
   if(row.value===undefined||row.value===null){records.push({criterion_id:c.id,result:'unknown',reason:'missing_value'});if(c.role==='hard')unknown++;continue}
   typecheck(row.value,c.type);
   if(row.evidence==='missing'||row.evidence==='disputed'||row.evidence==='uncertain'){
     records.push({criterion_id:c.id,result:'unknown',reason:'evidence_'+row.evidence,value:row.value});if(c.role==='hard')unknown++;continue;
   }
   const evidenceQualifier=row.evidence==='declared'?'source_declared_not_independently_verified':null;
   if(c.role==='hard'){
    const ok=compare(row.value,c.threshold,c.operator,c.type);if(ok)passed++;else failed++;
    const slack=c.type==='number'?(c.operator==='gte'?numeric(row.value)-numeric(c.threshold):c.operator==='lte'?numeric(c.threshold)-numeric(row.value):null):null;
    records.push({criterion_id:c.id,result:ok?'pass':'fail',value:row.value,reason:evidenceQualifier,margin:slack===null?null:display(slack)});
   }else records.push({criterion_id:c.id,result:'observed',value:row.value,reason:evidenceQualifier});
  }
  assessments.push({scenario_id:sc.id,alternative_id:op.id,status:failed?'blocked_by_stated_rule':unknown?'unresolved':'passes_stated_rules',hard_checks:{passed,failed,unknown},criteria:records});
 }
 // Conservative criterion-wise comparison. All options must be feasible in every scenario,
 // and values of every objective must be documented rather than merely asserted.
 const robust=options.map(o=>{const rows=assessments.filter(a=>a.alternative_id===o.id);return {alternative_id:o.id,status:rows.some(r=>r.status==='blocked_by_stated_rule')?'blocked_in_at_least_one_scenario':rows.some(r=>r.status==='unresolved')?'needs_more_evidence':'passes_all_stated_hard_rules'};});
 const dominance=[];const objective=criteria.filter(c=>c.role==='objective');
 for(const a of options)for(const b of options){if(a.id===b.id)continue;
  if(robust.find(r=>r.alternative_id===a.id)?.status!=='passes_all_stated_hard_rules'||robust.find(r=>r.alternative_id===b.id)?.status!=='passes_all_stated_hard_rules')continue;
  if(!objective.length)continue;
  let noWorse=true,strict=false,comparable=true;
  for(const sc of scenarios)for(const c of objective){const x=input.observations?.[sc.id]?.[a.id]?.[c.id],y=input.observations?.[sc.id]?.[b.id]?.[c.id];
   if(!x||!y||x.evidence!=='documented'||y.evidence!=='documented'||x.value==null||y.value==null){comparable=false;break}
   const delta=numeric(x.value)-numeric(y.value);const oriented=c.goal==='maximize'?delta:-delta;
   if(oriented<0n)noWorse=false;if(oriented>0n)strict=true;
  }
  if(comparable&&noWorse&&strict)dominance.push({better:a.id,than:b.id,reason:'at_least_as_good_on_all_documented_objectives_in_all_scenarios_and_strictly_better_on_one'});
 }
 const attention=assessments.flatMap(a=>a.criteria.filter(c=>c.result==='unknown'||c.result==='fail').map(c=>({scenario_id:a.scenario_id,alternative_id:a.alternative_id,criterion_id:c.criterion_id,issue:c.result,reason:c.reason||null})));
 return {decision:typeof input.decision==='string'?input.decision.slice(0,500):null,assessments,robust_summary:robust,dominance,attention,limits:'Checks only user-specified criteria and observations. Scenario plausibility, source authenticity, legal interpretation, missing alternatives and omitted constraints are not independently verified. Dominance is a narrow documented multi-objective comparison, not an optimal recommendation.'};
}
export {evaluateAlternatives};