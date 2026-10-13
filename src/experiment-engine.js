/** ECHOS Step 5 — controlled decision-transition experiments.
 * This engine measures observable decisions, not internal understanding.
 * The caller must keep independent reference material PRIVATE.
 */
import {evaluateAlternatives} from './alternative-engine.js';

const VALID = new Set(['passes_stated_rules','blocked_by_stated_rule','unresolved']);
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function fail(m){throw Error(m)}
function validId(s){if(typeof s!=='string'||!ID.test(s))fail('Invalid experiment identifier');return s}
function signature(result){return Object.fromEntries(result.assessments.map(r=>[`${r.scenario_id}/${r.alternative_id}`,r.status]));}
function compareState(a,b){const keys=new Set([...Object.keys(a),...Object.keys(b)]);return [...keys].filter(k=>a[k]!==b[k]).sort();}
function prepareExperiment(request){
 if(!isObj(request)||!Array.isArray(request.pairs)||request.pairs.length<1||request.pairs.length>30)fail('Supply 1–30 paired cases');
 const ids=new Set(),publicCases=[],privateKeys=[];
 for(const p of request.pairs){
  if(!isObj(p))fail('Invalid pair');const id=validId(p.id);if(ids.has(id))fail('Duplicate experiment pair ID');ids.add(id);
  if(!isObj(p.baseline)||!isObj(p.changed))fail('Baseline and changed decision models required');
  const original=evaluateAlternatives(p.baseline),updated=evaluateAlternatives(p.changed);
  const baseSig=signature(original),changeSig=signature(updated);
  if(Object.keys(baseSig).length!==Object.keys(changeSig).length||Object.keys(baseSig).some(k=>!(k in changeSig)))fail('Paired decision grids must contain identical alternative/scenario identifiers');
  const changedCells=compareState(baseSig,changeSig);
  const unresolvedAfter=Object.entries(changeSig).filter(([,v])=>v==='unresolved').map(([k])=>k);
  // Whether a contextual event occurred is separately documented, not inferred from status change.
  if(typeof p.material_change!=='boolean')fail('Declare whether the pair contains a decision-relevant change');
  const category=unresolvedAfter.length?'evidence_required':changedCells.length?'adapt':p.material_change?'reassess_preserve':'preserve';
  const publicId=id+'-b', changedId=id+'-c';
  // This function DOES NOT promise secrecy if caller publishes the privateKeys field.
  publicCases.push({case_id:publicId,pair_id:id,stage:'baseline',decision_model:p.baseline});
  publicCases.push({case_id:changedId,pair_id:id,stage:'changed',decision_model:p.changed});
  privateKeys.push({pair_id:id,baseline_id:publicId,changed_id:changedId,baseline:baseSig,changed:changeSig,category,changed_cells:changedCells,unresolved_after:unresolvedAfter,material_change:p.material_change,reference_origin:p.reference_origin||'computational_rule_reference_not_independently_validated'});
 }
 return {public_cases:publicCases,private_answer_key:privateKeys,notice:'Store the private answer key separately from public test cases. Both public decision models contain user-supplied rules; this does not verify that the reference rules are complete or authoritative.'};
}
function scoreExperiment(keys,answers){
 if(!Array.isArray(keys)||!keys.length||keys.length>30||!Array.isArray(answers)||answers.length>60)fail('Invalid key or responses');
 const map=new Map();for(const a of answers){if(!isObj(a)||typeof a.case_id!=='string'||map.has(a.case_id)||!isObj(a.assessments))fail('Invalid, missing or duplicate response');map.set(a.case_id,a)}
 const rows=[];
 for(const k of keys){if(!isObj(k)||!isObj(k.baseline)||!isObj(k.changed)||!['adapt','reassess_preserve','preserve','evidence_required'].includes(k.category))fail('Invalid reference key');
  const before=map.get(k.baseline_id),after=map.get(k.changed_id);
  function check(ans,reference){if(!ans)return {complete:false,correct:0,total:Object.keys(reference).length,wrong:[],missing:Object.keys(reference)};
   const wrong=[],missing=[];let correct=0;
   for(const [cell,expected] of Object.entries(reference)){
    if(!Object.hasOwn(ans.assessments,cell))missing.push(cell);
    else if(!VALID.has(ans.assessments[cell])||ans.assessments[cell]!==expected)wrong.push(cell);
    else correct++;
   }
   const extras=Object.keys(ans.assessments).filter(c=>!Object.hasOwn(reference,c));
   return {complete:missing.length===0&&extras.length===0,correct,total:Object.keys(reference).length,wrong,missing,extras};
  }
  const b=check(before,k.baseline),c=check(after,k.changed);
  const expectedTransition=k.category;
  const expectedChangeCells=k.changed_cells||[];
  const observedChangeCells=before&&after?compareState(before.assessments,after.assessments):[];
  const correctTransition=Boolean(before&&after&&c.complete&&b.complete&&expectedChangeCells.length===observedChangeCells.length&&expectedChangeCells.every(x=>observedChangeCells.includes(x))&&b.correct===b.total&&c.correct===c.total);
  const evidenceCells=(k.unresolved_after||[]);
  const evidenceCorrect=Boolean(after&&evidenceCells.every(cell=>after.assessments[cell]==='unresolved'));
  rows.push({pair_id:k.pair_id,category:expectedTransition,baseline:b,changed:c,correct_transition:correctTransition,evidence_handling:evidenceCells.length?evidenceCorrect:null,response_present:!!before&&!!after,reference_origin:k.reference_origin});
 }
 const totals={pairs:rows.length,complete_pairs:rows.filter(r=>r.response_present).length,correct_transitions:rows.filter(r=>r.correct_transition).length};
 const categories={};for(const category of ['adapt','reassess_preserve','preserve','evidence_required']){const rs=rows.filter(r=>r.category===category);categories[category]={tested:rs.length,correct:rs.filter(r=>r.correct_transition).length};}
 return {totals,categories,rows,limitations:'Observational task-level scoring against supplied computational references; does not establish real-world correctness, causal understanding, internal reasoning, human-AI authority, reliability under distribution shift, or validated ACBS/DCAG measurement.'};
}
export {prepareExperiment,scoreExperiment};