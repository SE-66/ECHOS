/** ECHOS Step 2 — deterministic context interpretation of supplied, structured case claims.
 * It does not infer legal meaning from arbitrary prose; metadata must be explicit.
 * Never upgrades user-supplied evidence or asserted authority into verified law.
 */
const MODES=new Set(['existing','proposed','hypothetical','historical','forecast']);
const FORCES=new Set(['binding_claim','offer','recommendation','permission','prohibition','observation','unknown']);
const ROLES=new Set(['company','supplier','customer','regulator','lender','board','manager','employee','other']);
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function scope(v,name,max=100){if(v==null||v==='')return null;if(typeof v!=='string'||v.length>max)throw Error('Invalid '+name);return v.trim()||null;}
function date(v,name){if(v==null||v==='')return null;if(!validDate(v))throw Error('Invalid '+name);return v;}
function contextualize(caseResult,annotations=[]){
 if(!caseResult||!Array.isArray(caseResult.claims)||!Array.isArray(caseResult.sources))throw Error('Reconstructed case required');
 if(!Array.isArray(annotations)||annotations.length>250)throw Error('Invalid annotations');
 const claims=new Map(caseResult.claims.map(c=>[c.id,c]));
 const sourceMap=new Map(caseResult.sources.map(s=>[s.id,s]));
 const notes=new Map();
 for(const a of annotations){
  if(!a||typeof a!=='object'||Array.isArray(a)||!claims.has(a.claim_id)||notes.has(a.claim_id))throw Error('Unknown or duplicate claim annotation');
  const modality=a.modality||'existing',force=a.force||'observation',actor=a.actor||'other';
  if(!MODES.has(modality)||!FORCES.has(force)||!ROLES.has(actor))throw Error('Invalid contextual interpretation');
  const interval={from:date(a.effective_from,'effective_from'),to:date(a.effective_to,'effective_to')};
  if(interval.from&&interval.to&&interval.from>interval.to)throw Error('Invalid context interval');
  const conditionIds=a.conditions||[];
  if(!Array.isArray(conditionIds)||conditionIds.length>25||conditionIds.some(id=>typeof id!=='string'||!ID.test(id)||!claims.has(id)))throw Error('Unknown condition claim');
  const exceptionIds=a.exceptions||[];
  if(!Array.isArray(exceptionIds)||exceptionIds.length>25||exceptionIds.some(id=>typeof id!=='string'||!ID.test(id)||!claims.has(id)))throw Error('Unknown exception claim');
  const authorityId=scope(a.authority_source_id,'authority source');
  if(authorityId&&!sourceMap.has(authorityId))throw Error('Unknown authority source');
  const verifiedContext=a.reviewed===true;
  notes.set(a.claim_id,{modality,force,actor,entity:scope(a.entity,'entity'),jurisdiction:scope(a.jurisdiction,'jurisdiction',40),scenario:scope(a.scenario,'scenario'),interval,conditions:conditionIds,exceptions:exceptionIds,authority_source_id:authorityId,reviewed:verifiedContext});
 }
 const cases=caseResult.claims.map(c=>{
  const a=notes.get(c.id)||null;
  const issues=[];
  if(!a)issues.push('context_not_supplied');
  if(a&&!a.reviewed)issues.push('context_not_reviewed');
  if(a&&(a.force==='binding_claim'||a.force==='prohibition'||a.force==='permission')&&!a.authority_source_id)issues.push('authority_source_not_identified');
  if(a&&a.modality==='proposed'&&a.force==='binding_claim')issues.push('proposal_not_established_obligation');
  if(a&&a.interval.from&&caseResult.as_of<a.interval.from)issues.push('not_yet_effective');
  if(a&&a.interval.to&&caseResult.as_of>a.interval.to)issues.push('no_longer_effective');
  if(a&&a.conditions.length)issues.push('conditions_require_evaluation');
  if(a&&a.exceptions.length)issues.push('exceptions_require_evaluation');
  return {claim_id:c.id,key:c.key,value:c.value,context:a,issues};
 });
 const byKey=new Map();for(const c of cases){let x=byKey.get(c.key)||[];x.push(c);byKey.set(c.key,x)}
 const tensions=[],distinct=[];
 const overlap=(a,b)=>!(a.context.interval.to&&b.context.interval.from&&a.context.interval.to<b.context.interval.from)&&!(b.context.interval.to&&a.context.interval.from&&b.context.interval.to<a.context.interval.from);
 const same=(a,b,k)=>a.context[k]===b.context[k];
 for(const [key,group] of byKey){for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const a=group[i],b=group[j];if(a.value===b.value)continue;
  if(!a.context||!b.context){distinct.push({key,claims:[a.claim_id,b.claim_id],reason:'unknown_context'});continue;}
  const reasons=[];
  for(const k of ['modality','entity','jurisdiction','scenario'])if(!same(a,b,k))reasons.push('different_'+k);
  if(!overlap(a,b))reasons.push('nonoverlapping_period');
  if(reasons.length){distinct.push({key,claims:[a.claim_id,b.claim_id],reasons,classification:'not_a_proven_contradiction'});continue;}
  tensions.push({key,claims:[a.claim_id,b.claim_id],classification:'potential_conflict_requires_review',reason:'Different values in matching declared context; authority, precedence and evidence must be reviewed'});
 }}
 const unresolved=cases.filter(c=>c.issues.length);
 return {case_id:caseResult.case_id,as_of:caseResult.as_of,summary:{claims:cases.length,contextual_tensions:tensions.length,distinguished_pairs:distinct.length,unresolved_context:unresolved.length},claims:cases,tensions,distinguished_pairs:distinct,unresolved_context:unresolved.map(c=>({claim_id:c.claim_id,issues:c.issues})),boundary:'Context classifications depend on supplied and reviewed annotations. ECHOS does not determine legal enforceability, authority precedence, applicability of exceptions, or verify documents autonomously.'};
}
export {contextualize};