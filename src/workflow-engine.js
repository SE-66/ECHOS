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
 const workflowStatus=openIssues.length?'requires_review':'mapped_with_declared_sources';
 // Critical: comparison is shown as a conditional model result even if the case has unresolved evidence.
 const output={case_id:evidence.case_id,status:workflowStatus,case_summary:evidence.summary,context_summary:context.summary,relationship_summary:graph.summary,comparison,criterion_trace:audit,open_issues:openIssues,decision_intelligence:bankV2,stage_results:{evidence,context,graph},notice:'All links and rules originate from supplied models; a declared review is not independent authentication. Comparison remains conditional even when mappings are complete. No automatic legal determination, causal proof or optimal business action.'};
 if(includeExperiment){
  if(!isObj(input.experiment))fail('A separately designed paired experiment is required');
  const prepared=prepareExperiment(input.experiment);
  // Prevent accidental return of answer key from HTTP: prepare/export separately with access controls.
  output.experiment={public_cases:prepared.public_cases,private_key_generated_but_not_returned:true,notice:'The private key is deliberately NOT returned through this API. Use the local experiment CLI for reference keys.'};
 }
 return output;
}
export {runWorkflow};