import {inspectPassages} from './passage-engine.js';
import {verifyDerivations,discoverRequirements} from './verification-engine.js';
import {assessIntelligence} from './decision-intelligence.js';
/** ECHOS integration v0.6: traceable Steps 1–5. Never promotes supplied evidence to verified law.
 * API output is analytical assistance, not company-specific financial/legal approval.
 */
import {reconstruct} from './case-engine.js';
import {contextualize} from './context-interpreter.js';
import {traceRelationships} from './relationship-engine.js';
import {evaluateAlternatives} from './alternative-engine.js';
import {prepareExperiment} from './experiment-engine.js';

const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=s=>{throw Error(s)};
const MAX=100;
const COVERAGE_AREAS=['financial','contractual','legal','policy','approval','tax','operational','timing','evidence','alternatives','scenarios'];
function coverageChallenge(input){
 const r=input.coverage_review;
 const warnings=[];
 if(!isObj(r)||!Array.isArray(r.areas)||!r.reviewer||!r.review_date||!r.source_reference){
   warnings.push('independent_coverage_review_missing');
 } else {
   const ids=new Set(r.areas.filter(x=>isObj(x)&&typeof x.area==='string').map(x=>x.area));
   for(const a of COVERAGE_AREAS){
     const record=r.areas.find(x=>isObj(x)&&x.area===a);
     if(!record||!['considered','not_applicable','unresolved'].includes(record.finding)||!record.rationale||!record.source_reference)warnings.push('coverage_unsubstantiated:'+a);
     else if(record.finding==='unresolved')warnings.push('coverage_unresolved:'+a);
   }
   for(const a of ids)if(!COVERAGE_AREAS.includes(a))warnings.push('unknown_coverage_area:'+a);
 }
 return {warnings,required_areas:COVERAGE_AREAS,notice:'Coverage prompts are a checklist, never evidence that every material requirement is known.'};
}
function auditObservations(input,comparison,evidence){
 const links=input.observation_provenance||[];
 if(!Array.isArray(links)||links.length>500)fail('Invalid observation provenance');
 const linkMap=new Map();const sourceMap=new Map(evidence.sources.map(s=>[s.id,s]));
 const results=[],issues=[];
 for(const l of links){
  if(!isObj(l)||typeof l.scenario_id!=='string'||typeof l.alternative_id!=='string'||typeof l.criterion_id!=='string')fail('Invalid observation proof link');
  const key=[l.scenario_id,l.alternative_id,l.criterion_id].join('/');
  if(linkMap.has(key))fail('Duplicate observation proof link');
  if(!Array.isArray(l.source_ids)||l.source_ids.some(s=>!sourceMap.has(s)))fail('Unknown observation proof source');
  if(l.derivation!=null&&(typeof l.derivation!=='string'||l.derivation.length>1500))fail('Invalid observation derivation');
  linkMap.set(key,l);
 }
 const used=new Set();
 for(const assessment of comparison.assessments){
   for(const c of assessment.criteria){
    const key=[assessment.scenario_id,assessment.alternative_id,c.criterion_id].join('/');
    const proof=linkMap.get(key);used.add(key);
    const warnings=[];
    if(c.result==='unknown')warnings.push('observation_unresolved');
    if(!proof||!proof.source_ids.length)warnings.push('observation_source_link_missing');
    else for(const sid of proof.source_ids){const source=sourceMap.get(sid);if(!source.review_declared)warnings.push('observation_source_review_not_declared');}
    if(!proof?.derivation)warnings.push('observation_derivation_missing');
    if(!proof?.period)warnings.push('observation_period_missing');
    if(!proof?.entity)warnings.push('observation_entity_missing');
    // A declared document does not establish correctness of the observed number.
    if(warnings.length)issues.push('observation_review:'+key);
    results.push({scenario_id:assessment.scenario_id,alternative_id:assessment.alternative_id,criterion_id:c.criterion_id,provenance_status:warnings.length?'requires_review':'documented_as_declared',issues:warnings});
   }
 }
 for(const key of linkMap.keys())if(!used.has(key))fail('Observation proof refers to unknown comparison cell');
 return {results,issues};
}
/**
 * Input must explicitly map decision criteria to claim IDs and/or graph target IDs.
 * The bridge is a provenance check, NOT an independent verification of those links.
 */
function runWorkflow(input,{includeExperiment=false}={}){
 if(!isObj(input)||!isObj(input.case)||!isObj(input.graph)||!isObj(input.decision))fail('Supply case, graph and decision models');
 const evidence=reconstruct(input.case);
 const context=contextualize(evidence,input.annotations||[]);
 const graph=traceRelationships(evidence,context,input.graph);
 const comparison=evaluateAlternatives(input.decision);
 const criteria=input.decision.criteria;
 const mapping=input.provenance||[];
 if(!Array.isArray(mapping)||mapping.length>MAX)fail('Invalid provenance map');
 const claimMap=new Map(evidence.claims.map(x=>[x.id,x]));
 const sourceMap=new Map(evidence.sources.map(x=>[x.id,x]));
 const graphNodeIds=new Set(graph.nodes.map(x=>x.id));
 const exposed=new Map(graph.exposures.map(x=>[x.target_id,x]));
 const contextMap=new Map(context.claims.map(x=>[x.claim_id,x]));
 const rowIds=new Set();
 const criterionIds=new Set(criteria.map(x=>x.id));
 const audit=[];
 for(const m of mapping){
  if(!isObj(m)||typeof m.criterion_id!=='string'||!criterionIds.has(m.criterion_id)||rowIds.has(m.criterion_id))fail('Unknown or duplicate criterion mapping');
  rowIds.add(m.criterion_id);
  const claimIds=m.claim_ids||[],targetIds=m.target_ids||[];
  if(!Array.isArray(claimIds)||!Array.isArray(targetIds)||claimIds.length>30||targetIds.length>30)fail('Invalid mapping references');
  if(claimIds.some(id=>!claimMap.has(id))||targetIds.some(id=>!graphNodeIds.has(id)))fail('Mapping references an unknown claim or relationship node');
  const issues=[];
  if(!claimIds.length&&!targetIds.length)issues.push('no_source_connection');
  for(const id of claimIds){const c=claimMap.get(id),ctx=contextMap.get(id);if(c.evidence_issues.length)issues.push('claim_evidence_unresolved:'+id);if(ctx?.issues?.length)issues.push('claim_context_unresolved:'+id);}
  for(const id of targetIds){const x=exposed.get(id);if(!x)issues.push('not_reached_by_recorded_change:'+id);else if(x.status==='review_required')issues.push('relationship_path_needs_review:'+id)}
  const verifiedSources=new Set(claimIds.flatMap(id=>claimMap.get(id).source_ids));
  for(const sid of verifiedSources){if(!sourceMap.get(sid).review_declared)issues.push('review_not_declared:'+sid)}
  audit.push({criterion_id:m.criterion_id,claim_ids:claimIds,target_ids:targetIds,status:issues.length?'requires_review':'linked_as_declared',issues:[...new Set(issues)]});
 }
 for(const criterion of criteria)if(!rowIds.has(criterion.id))audit.push({criterion_id:criterion.id,claim_ids:[],target_ids:[],status:'unmapped',issues:['no_provenance_mapping']});
 const openIssues=[...new Set([
  ...evidence.gaps.map(x=>'missing_case_information:'+x.key),
  ...context.unresolved_context.map(x=>'context_unresolved:'+x.claim_id),
  ...graph.exposures.filter(x=>x.status==='review_required').map(x=>'relationship_unresolved:'+x.target_id),
  ...audit.filter(x=>x.status!=='linked_as_declared').map(x=>'criterion_unresolved:'+x.criterion_id)
 ])];
 const bankV2=input.bank_v2?assessIntelligence(input.bank_v2,{evidence,context,graph,comparison}):null;
 if(!bankV2)openIssues.push('decision_intelligence_model_missing');
 else if(bankV2.open_world_warnings.length||bankV2.requirements.some(x=>x.issues.length))openIssues.push('decision_intelligence_needs_review');
 const proofAudit=auditObservations(input,comparison,evidence);
 openIssues.push(...proofAudit.issues);
 for(const row of comparison.assessments){
   if(row.status==='unresolved')openIssues.push('decision_assessment_unresolved:'+row.scenario_id+'/'+row.alternative_id);
   for(const c of row.criteria)if(c.result==='unknown')openIssues.push('criterion_observation_unresolved:'+row.scenario_id+'/'+row.alternative_id+'/'+c.criterion_id);
 }
 const derivations=verifyDerivations({claims:evidence.claims,sources:evidence.sources,derivations:input.derivations||[],observations:input.decision.observations});
 const discovery=discoverRequirements({sources:evidence.sources,claims:evidence.claims,criteria,review:input.requirement_review||[]});
 for(const d of derivations.unresolved)openIssues.push('derivation_unresolved:'+d.id);
 const derivationTargets=new Set(derivations.results.map(d=>[d.scenario_id,d.alternative_id,d.criterion_id].join('/')));
 for(const row of comparison.assessments)for(const c of row.criteria){
   const meta=criteria.find(x=>x.id===c.criterion_id);
   const key=[row.scenario_id,row.alternative_id,c.criterion_id].join('/');
   if(meta?.type==='number'&&!derivationTargets.has(key))openIssues.push('financial_derivation_missing:'+key);
 }
 for(const a of discovery.unmapped_areas)openIssues.push('potential_requirement_gap:'+a);
 const passageReview=inspectPassages({sources:evidence.sources,claims:evidence.claims,passages:input.evidence_passages||[],criteria,alternatives:input.decision.alternatives,as_of:evidence.as_of});
 for(const p of passageReview.candidates){
  if(['claimed_obligation','prohibition','exception','ambiguous'].includes(p.modality))openIssues.push('passage_applicability_unresolved:'+p.passage_id);
  if(p.issues.includes('decision_criterion_not_linked'))openIssues.push('passage_criterion_unmapped:'+p.passage_id);
  if(p.issues.includes('affected_alternatives_unknown'))openIssues.push('passage_alternatives_unmapped:'+p.passage_id);
 }
 const coverage=coverageChallenge(input);
 openIssues.push(...coverage.warnings);
 const uniqueIssues=[...new Set(openIssues)];
 const workflowStatus=uniqueIssues.length?'requires_review':'mapped_with_declared_sources';
 // Critical: comparison is shown as a conditional model result even if the case has unresolved evidence.
 const output={case_id:evidence.case_id,status:workflowStatus,case_summary:evidence.summary,context_summary:context.summary,relationship_summary:graph.summary,comparison,criterion_trace:audit,observation_provenance_audit:proofAudit.results,coverage_challenge:coverage,action_justification:'not_independently_established',open_issues:uniqueIssues,derivation_verification:derivations,requirement_discovery:discovery,passage_review:passageReview,decision_intelligence:bankV2,stage_results:{evidence,context,graph},notice:'All links and rules originate from supplied models; a declared review is not independent authentication. Comparison remains conditional even when mappings are complete. No automatic legal determination, causal proof or optimal business action.'};
 if(includeExperiment){
  if(!isObj(input.experiment))fail('A separately designed paired experiment is required');
  const prepared=prepareExperiment(input.experiment);
  // Prevent accidental return of answer key from HTTP: prepare/export separately with access controls.
  output.experiment={public_cases:prepared.public_cases,private_key_generated_but_not_returned:true,notice:'The private key is deliberately NOT returned through this API. Use the local experiment CLI for reference keys.'};
 }
 return output;
}
export {runWorkflow};