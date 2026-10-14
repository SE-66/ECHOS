/** ECHOS Decision Episode v1: bounded declarations, not autonomous adjudication. */
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const modes=new Set(['unknown','potentially_material','possibly_immaterial']);
const authorities=new Set(['not_assessed','human_only','ai_assist','joint_review','ai_reviewed','delegated_bounded','escalate']);
function evaluateEpisode(input={}, {comparison}={}){
 if(!obj(input))throw Error('Decision episode must be an object');
 const previous=String(input.previous_condition||'').trim().slice(0,2500);
 const current=String(input.current_condition||'').trim().slice(0,2500);
 const materiality=input.materiality||'unknown';
 const proposedAuthority=input.proposed_authority||'not_assessed';
 if(!modes.has(materiality)||!authorities.has(proposedAuthority))throw Error('Unknown decision episode materiality or authority category');
 const issues=[];
 if(!previous)issues.push('prior_state_not_declared');
 if(!current)issues.push('current_state_not_declared');
 if(previous&&current&&previous===current)issues.push('no_observable_textual_change');
 if(materiality!=='unknown')issues.push('materiality_is_user_hypothesis');
 if(proposedAuthority!=='not_assessed')issues.push('authority_is_user_proposal');
 return {prior_state:previous||null,current_state:current||null,declared_materiality:materiality,proposed_authority:proposedAuthority,change_recognition_status:previous&&current?'user_states_available':'insufficient_state_information',independent_materiality_established:false,decision_authority_established:false,decision_trajectory:(comparison?.assessments||[]).map(x=>({scenario_id:x.scenario_id,alternative_id:x.alternative_id,conditional_result:x.status})),issues,notice:'Decision episode labels record caller descriptions. No semantic change, economic materiality, ERS state, ACBS score or authorization has been established.'};
}
export {evaluateEpisode};
