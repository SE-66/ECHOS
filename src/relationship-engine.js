/** ECHOS Step 3: explicit, evidence-scoped dependency tracing.
 * Edges are hypotheses or declarations, NEVER independently verified laws or causal facts.
 */
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const REL=new Set(['affects','depends_on','constrains','requires','enables','contradicts']);
const STAGES=new Set(['existing','proposed','hypothetical','historical','forecast']);
const TYPES=new Set(['financial','operational','contractual','policy','legal','governance','evidence','other']);
const STATES=new Set(['hypothesis','declared','reviewed']);
function fail(m){throw Error(m)}
function validId(x){if(typeof x!=='string'||!ID.test(x))fail('Invalid identifier');return x}
function iso(x){if(!x)return null;if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(Date.parse(x))||new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Invalid date');return x}
function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
export function traceRelationships(reconstructed,context,query={}){
 if(!Array.isArray(reconstructed?.claims)||!Array.isArray(reconstructed?.sources)||!Array.isArray(context?.claims))fail('Results of Steps 1 and 2 required');
 const {nodes=[],relationships=[],changed_claim_ids=[],scenario='existing',jurisdiction=null}=query;
 if(!Array.isArray(nodes)||nodes.length>150||!Array.isArray(relationships)||relationships.length>300||!Array.isArray(changed_claim_ids)||changed_claim_ids.length>100||!STAGES.has(scenario))fail('Invalid graph request');
 const asOf=iso(query.as_of)||reconstructed.as_of;
 const claims=new Map(reconstructed.claims.map(c=>[c.id,c]));
 const sources=new Map(reconstructed.sources.map(s=>[s.id,s]));
 const contexts=new Map(context.claims.map(c=>[c.claim_id,c]));
 const graph=new Map(reconstructed.claims.map(c=>[c.id,{id:c.id,label:c.label,kind:'claim'}]));
 for(const n of nodes){if(!object(n)||graph.has(validId(n.id))||!TYPES.has(n.type)||typeof n.label!=='string'||!n.label.trim())fail('Invalid node');graph.set(n.id,{id:n.id,label:n.label.slice(0,150),kind:n.type})}
 for(const c of changed_claim_ids)if(!claims.has(c))fail('Unknown changed claim');
 const edges=[],excluded=[],adj=new Map();
 for(let i=0;i<relationships.length;i++){
  const r=relationships[i];if(!object(r)||!graph.has(validId(r.from))||!graph.has(validId(r.to))||r.from===r.to||!REL.has(r.relation)||!STATES.has(r.status||'hypothesis'))fail('Invalid relationship');
  const ids=r.source_ids||[];if(!Array.isArray(ids)||ids.length>12||ids.some(s=>!sources.has(s)))fail('Unknown evidence reference');
  const mode=r.scenario||null;if(mode&&!STAGES.has(mode))fail('Invalid scenario');
  const start=iso(r.effective_from),end=iso(r.effective_to);if(start&&end&&start>end)fail('Invalid validity interval');
  const issues=[];
  if(mode&&mode!==scenario)issues.push('different_scenario');
  if(r.jurisdiction&&jurisdiction&&r.jurisdiction!==jurisdiction)issues.push('different_jurisdiction');
  if(start&&asOf<start)issues.push('not_yet_effective');
  if(end&&asOf>end)issues.push('expired');
  if(!ids.length)issues.push('relationship_evidence_missing');
  for(const sid of ids){const s=sources.get(sid);if(!s.review_declared)issues.push('source_not_reviewed');if((s.valid_from&&asOf<s.valid_from)||(s.valid_to&&asOf>s.valid_to))issues.push('source_outside_validity')}
  const claim=claims.get(r.from),ctx=contexts.get(r.from);
  if(claim?.evidence_issues?.length)issues.push('source_claim_evidence_unresolved');
  if(ctx?.issues?.length)issues.push('source_claim_context_unresolved');
  if(ctx?.context?.modality&&ctx.context.modality!==scenario)issues.push('source_claim_different_scenario');
  const e={id:'relation_'+(i+1),from:r.from,to:r.to,relation:r.relation,status:r.status||'hypothesis',source_ids:ids,issues:[...new Set(issues)]};
  if(e.issues.some(x=>['different_scenario','different_jurisdiction','not_yet_effective','expired','source_claim_different_scenario'].includes(x))){excluded.push(e);continue}
  edges.push(e);
  if(e.relation!=='contradicts'){const list=adj.get(e.from)||[];list.push(e);adj.set(e.from,list)}
 }
 const exposures=[];
 for(const changed of changed_claim_ids){
  const queue=[{id:changed,path:[],seen:new Set([changed])}];const shortest=new Map();
  while(queue.length){const current=queue.shift();if(current.path.length>=20)continue;
   for(const edge of adj.get(current.id)||[]){if(current.seen.has(edge.to))continue;
    const path=[...current.path,edge];if(!shortest.has(edge.to)||path.length<shortest.get(edge.to).length)shortest.set(edge.to,path);
    queue.push({id:edge.to,path,seen:new Set([...current.seen,edge.to])});
   }
  }
  for(const [target,path] of shortest){const issues=[...new Set(path.flatMap(x=>x.issues))];exposures.push({changed_claim_id:changed,target_id:target,target_label:graph.get(target).label,hops:path.length,via:path.map(x=>x.id),status:issues.length?'review_required':'declared_evidence_path',issues})}
 }
 exposures.sort((a,b)=>a.hops-b.hops||a.target_id.localeCompare(b.target_id));
 return {case_id:reconstructed.case_id,as_of:asOf,scenario,jurisdiction,summary:{nodes:graph.size,relationships:edges.length,excluded:excluded.length,exposures:exposures.length,require_review:exposures.filter(x=>x.issues.length).length},nodes:[...graph.values()],relationships:edges,excluded_relationships:excluded,exposures,boundary:'Only declared or hypothesized paths are traced. ECHOS does not discover all missing relationships, prove causality or legal applicability, or calculate consequences at this stage.'};
}