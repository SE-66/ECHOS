/** ECHOS decision intelligence v2: explicitly sourced organizational decision semantics.
 * A missing rule is never taken to mean that no rule exists. No law is authenticated here.
 */
const TYPES=new Set(['permissibility','feasibility','desirability']);
const STATUSES=new Set(['verified_by_reviewer','declared','disputed','missing','unknown']);
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const fail=x=>{throw Error(x)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
function assessIntelligence(model,prior={}){
 if(!obj(model)||!Array.isArray(model.requirements)||!Array.isArray(model.states))fail('Bank v2 requires decision states and requirements');
 if(model.states.length<1||model.states.length>40||model.requirements.length>100)fail('Model size limit');
 const asOf=model.as_of;if(!iso(asOf))fail('Valid assessment date required');
 const claimIds=new Set(prior.evidence?.claims?.map(c=>c.id)||[]);
 const graphIds=new Set(prior.graph?.nodes?.map(n=>n.id)||[]);
 const stateIds=new Set(),states=[];
 for(const s of model.states){if(!obj(s)||typeof s.id!=='string'||!ID.test(s.id)||stateIds.has(s.id)||!['actual','perceived','proposed','counterfactual','observed_outcome'].includes(s.mode))fail('Invalid or duplicate state');stateIds.add(s.id);states.push({id:s.id,mode:s.mode,label:String(s.label||s.id).slice(0,150),as_of:s.as_of||asOf})}
 const requirements=new Map();
 for(const r of model.requirements){if(!obj(r)||typeof r.id!=='string'||!ID.test(r.id)||requirements.has(r.id)||!TYPES.has(r.dimension)||!STATUSES.has(r.evidence_status))fail('Invalid requirement');if(r.from&&!iso(r.from)||r.to&&!iso(r.to)||r.from&&r.to&&r.from>r.to)fail('Invalid requirement date');if(!Array.isArray(r.applies_to)||!r.applies_to.length||r.applies_to.some(id=>!stateIds.has(id)))fail('Unknown applicable state');
  if(!['satisfied','breached','unknown'].includes(r.observation))fail('Explicit requirement observation needed');
  if(!Array.isArray(r.conditions||[])||!Array.isArray(r.exceptions||[]))fail('Invalid conditions or exceptions');
  if((r.conditions||[]).some(x=>!obj(x)||!['satisfied','breached','unknown'].includes(x.status))||(r.exceptions||[]).some(x=>!obj(x)||!['active','inactive','unknown'].includes(x.status)))fail('Invalid condition or exception status');
  for(const id of r.claim_ids||[])if(!claimIds.has(id))fail('Unknown supporting claim');
  for(const id of r.graph_ids||[])if(!graphIds.has(id))fail('Unknown graph dependency');
  requirements.set(r.id,r);
 }
 const evaluations=[];
 for(const s of states)for(const r of requirements.values()){
  if(!r.applies_to.includes(s.id))continue;
  let finding='undetermined';const issues=[];
  if(r.from&&asOf<r.from||r.to&&asOf>r.to){finding='not_applicable_by_declared_date';issues.push('temporal_nonapplicability')}
  else if((r.conditions||[]).some(x=>x.status==='breached')){finding='not_applicable_by_declared_condition'}
  else if((r.exceptions||[]).some(x=>x.status==='active')){finding='exception_claimed';issues.push('exception_requires_authority_review')}
  else if((r.conditions||[]).some(x=>x.status==='unknown')||(r.exceptions||[]).some(x=>x.status==='unknown'))issues.push('applicability_uncertain');
  if(r.evidence_status!=='verified_by_reviewer')issues.push('evidence_'+r.evidence_status);
  if(!r.source_reference)issues.push('source_not_identified');
  if(!r.claim_ids?.length)issues.push('no_case_evidence_link');
  if(r.graph_ids?.some(id=>prior.graph?.exposures?.some(e=>e.target_id===id&&e.status==='review_required')))issues.push('relationship_unresolved');
  if(r.dimension==='permissibility'&&!r.authority)issues.push('approval_authority_undefined');
  if(finding==='undetermined')finding=issues.length?'requires_review':r.observation;
  evaluations.push({state_id:s.id,requirement_id:r.id,dimension:r.dimension,finding,issues});
 }
 const summary=states.map(s=>{const group=evaluations.filter(e=>e.state_id===s.id);const dims={};for(const dimension of TYPES){const rows=group.filter(e=>e.dimension===dimension);dims[dimension]=rows.some(r=>r.finding==='breached')?'breached':rows.some(r=>r.finding==='requires_review'||r.finding==='undetermined'||r.finding==='exception_claimed')?'unresolved':rows.some(r=>r.finding==='satisfied')?'satisfied':'not_assessed'}return {state_id:s.id,mode:s.mode,dimensions:dims}});
 const transitions=[];for(const t of model.transitions||[]){if(!obj(t)||!stateIds.has(t.from)||!stateIds.has(t.to))fail('Invalid transition');const a=evaluations.filter(e=>e.state_id===t.from),b=evaluations.filter(e=>e.state_id===t.to);const keys=new Set([...a.map(x=>x.requirement_id),...b.map(x=>x.requirement_id)]);const changed=[...keys].filter(id=>a.find(x=>x.requirement_id===id)?.finding!==b.find(x=>x.requirement_id===id)?.finding);transitions.push({from:t.from,to:t.to,changed_requirements:changed,evidence_change:changed.some(id=>{const r=requirements.get(id);return r?.evidence_status!=='verified_by_reviewer'}),interpretation:'descriptive_transition_not_causal_proof'})}
 const risks=(model.open_questions||[]).map(String).slice(0,40);
 if(!model.coverage_reviewed)risks.push('decision_requirements_may_be_missing');
 if(!model.alternatives_reviewed)risks.push('decision_alternatives_may_be_missing');
 if(!model.scenarios_reviewed)risks.push('material_scenarios_may_be_missing');
 const materiality={severity:model.criticality?.severity||'unassessed',reversibility:model.criticality?.reversibility||'unassessed',time_pressure:model.criticality?.time_pressure||'unassessed',note:'Descriptive indicators only; not a validated risk score'};
 return {as_of:asOf,states:summary,requirements:evaluations,transitions,criticality:materiality,authority:model.authority||null,outcome_feedback:model.feedback||[],open_world_warnings:risks,ready_for_unqualified_decision:false,notice:'Reviewed flags are input declarations, not legal verification. Unlisted rules, outcomes and causal effects are not inferred. No unconditional financial or legal recommendation.'};
}
export {assessIntelligence};