/** ECHOS hardening iteration 02: bounded derivation and requirement verification.
 * A derivation checks declared arithmetic, not the authenticity of underlying financial records.
 */
const DEC=1000000n;
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=s=>{throw Error(s)};
function num(x){if(typeof x!=='string'&&typeof x!=='number')fail('Invalid numeric input');const s=String(x);if(!/^-?\d+(?:\.\d{1,6})?$/.test(s))fail('Invalid fixed-point number');const [i,f='']=s.split('.');const n=BigInt(i.replace('-',''))*DEC+BigInt(f.padEnd(6,'0')||'0');return i.startsWith('-')?-n:n;}
function decimal(n){let neg=n<0n;if(neg)n=-n;const f=(n%DEC).toString().padStart(6,'0').replace(/0+$/,'');return (neg?'-':'')+String(n/DEC)+(f?'.'+f:'')}
const KNOWN_AREAS={
 contractual:/\b(agreement|contract|consent|amendment|written approval|termination|penalty|covenant)\b/i,
 legal:/\b(legal|regulation|law|licen[cs]e|permit|court|statutory)\b/i,
 policy:/\b(policy|internal rule|delegation|threshold|procedure)\b/i,
 approval:/\b(approve|approval|board|authorized|authorised|signatory|consent)\b/i,
 tax:/\b(tax|vat|withholding|customs|duty)\b/i,
 operational:/\b(delivery|supplier|capacity|inventory|production|safety|quality)\b/i,
 financial:/\b(cash|payment|budget|debt|margin|profit|interest|revenue|cost)\b/i,
 timing:/\b(deadline|due date|effective|expires|days|month|year|notice period)\b/i,
 evidence:/\b(unconfirmed|disputed|missing|estimate|forecast|unverified)\b/i
};
/** Evaluates source-grounded arithmetic expressions. Inputs are claims from Step 1. */
function verifyDerivations({claims=[],sources=[],derivations=[],observations={}}={}){
 if(!Array.isArray(claims)||!Array.isArray(sources)||!Array.isArray(derivations)||derivations.length>150)fail('Invalid derivations');
 const cm=new Map(claims.map(c=>[c.id,c])), sm=new Map(sources.map(s=>[s.id,s]));
 const results=[],used=new Set();
 for(const d of derivations){
  if(!isObj(d)||typeof d.id!=='string'||!ID.test(d.id)||used.has(d.id))fail('Invalid or duplicate derivation');used.add(d.id);
  const issues=[],refs=new Set();
  const evalNode=(node,depth=0)=>{
   if(depth>12||!isObj(node))fail('Invalid calculation tree');
   if(node.claim_id){const c=cm.get(node.claim_id);if(!c)fail('Unknown calculation claim');refs.add(c.id);
    if(!['number','money'].includes(c.type)||c.value===null) {issues.push('non_numeric_input:'+c.id);return null;}
    if(c.kind!=='fact'||c.status!=='corroborated')issues.push('input_not_corroborated:'+c.id);
    if(c.evidence_issues?.length)issues.push('input_evidence_unresolved:'+c.id);
    return {v:BigInt(c.value),unit:c.type==='money'?'money:'+c.unit:'number:'+String(c.unit||'unitless')};
   }
   if(Object.hasOwn(node,'constant')){if(!node.unit||typeof node.unit!=='string')fail('Constant must declare unit');return {v:num(node.constant),unit:node.unit}}
   if(!['add','subtract','multiply','divide'].includes(node.op)||!Array.isArray(node.args)||node.args.length!==2)fail('Unsupported calculation');
   const a=evalNode(node.args[0],depth+1),b=evalNode(node.args[1],depth+1);if(!a||!b)return null;
   if(node.op==='add'||node.op==='subtract'){
    if(a.unit!==b.unit){issues.push('unit_mismatch');return null}return {v:node.op==='add'?a.v+b.v:a.v-b.v,unit:a.unit};
   }
   if(node.op==='multiply'){
    if(a.unit!=='number:unitless'&&b.unit!=='number:unitless'){issues.push('unsupported_compound_units');return null}
    return {v:a.v*b.v/DEC,unit:a.unit==='number:unitless'?b.unit:a.unit};
   }
   if(b.v===0n){issues.push('division_by_zero');return null}
   if(b.unit!=='number:unitless'){issues.push('unsupported_denominator_unit');return null}
   return {v:a.v*DEC/b.v,unit:a.unit};
  };
  const value=evalNode(d.expression);
  const refsClaims=[...refs].map(id=>cm.get(id));
  const entities=[...new Set(refsClaims.map(c=>c.entity).filter(Boolean))];
  const periods=[...new Set(refsClaims.map(c=>c.period).filter(Boolean))];
  if(entities.length>1)issues.push('entity_mismatch');
  if(periods.length>1)issues.push('period_mismatch');
  if(refsClaims.some(c=>!c.entity))issues.push('input_entity_missing');
  if(refsClaims.some(c=>!c.period))issues.push('input_period_missing');
  for(const c of refsClaims)for(const sid of c.source_ids||[]){const source=sm.get(sid);if(!source?.review_declared)issues.push('source_review_not_declared:'+sid)}
  const observation=observations?.[d.scenario_id]?.[d.alternative_id]?.[d.criterion_id];
  if(!isObj(observation))issues.push('target_observation_missing');
  else if(value&&num(observation.value)!==value.v)issues.push('derivation_disagrees_with_observation');
  if(d.expected_unit&&value&&d.expected_unit!==value.unit)issues.push('expected_unit_mismatch');
  if(!d.scenario_id||!d.alternative_id||!d.criterion_id)fail('Derivation observation target required');
  results.push({id:d.id,scenario_id:d.scenario_id,alternative_id:d.alternative_id,criterion_id:d.criterion_id,computed:value?decimal(value.v):null,unit:value?.unit||null,claim_ids:[...refs],issues:[...new Set(issues)],status:issues.length?'requires_review':'arithmetically_consistent_with_declared_evidence'});
 }
 return {results,unresolved:results.filter(x=>x.issues.length),boundary:'Verifies declared arithmetic and metadata consistency. Does not authenticate statements, validate accounting classification, prove causal impact or independently reconcile primary documents.'};
}
/** Reviews documentary excerpts and generates evidence-linked *candidate* missing areas. */
function discoverRequirements({sources=[],claims=[],criteria=[],review=[]}={}){
 if(!Array.isArray(sources)||!Array.isArray(claims)||!Array.isArray(criteria)||!Array.isArray(review))fail('Invalid requirement discovery input');
 const sourceMap=new Map(sources.map(s=>[s.id,s]));
 const covered=new Set(review.filter(r=>r?.disposition==='covered'&&r.criterion_id).map(r=>r.criterion_id));
 const candidates=[];
 for(const c of claims){if(typeof c.value!=='string'||!c.value.trim())continue;
  const source_ids=c.source_ids||[];
  for(const [area,re] of Object.entries(KNOWN_AREAS))if(re.test(c.value)||re.test(c.label||'')){
   candidates.push({claim_id:c.id,source_ids,area,excerpt:String(c.value).slice(0,240),classification:'candidate_only',issue:source_ids.length?'needs_applicability_and_criterion_review':'missing_source',suggested_action:'Check whether a decision constraint, exception or additional alternative is required.'});
  }
 }
 const criteriaTokens=criteria.map(c=>[c.id,(c.id+' '+c.label+' '+c.source).toLowerCase()]);
 for(const p of candidates){const matches=criteriaTokens.filter(([,x])=>x.includes(p.area)||x.includes(p.claim_id)).map(([id])=>id);p.possible_criterion_ids=matches;
  if(!matches.length)p.issue='potential_unmapped_requirement';
  else if(!matches.some(id=>covered.has(id)))p.issue='applicability_review_not_documented';
  if(p.source_ids.some(s=>!sourceMap.has(s)))fail('Candidate source missing');
 }
 const exposed=[...new Set(candidates.filter(c=>c.issue==='potential_unmapped_requirement').map(x=>x.area))];
 return {candidates,unmapped_areas:exposed,coverage_status:'never_exhaustive',boundary:'Keyword-assisted candidate screening from supplied claims, not comprehensive discovery or legal applicability verification. Lack of a candidate is not evidence of absence.'};
}
export {verifyDerivations,discoverRequirements};