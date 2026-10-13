/** ECHOS iteration 03 — bounded passage-grounded requirement candidates.
 * No LLM or legal source verifier. Classifications are linguistic hypotheses.
 */
const ID=/^[a-z][a-z0-9_:-]{0,79}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const TYPES=new Set(['contract','policy','regulation','email','minutes','other']);
const MODES=new Set(['claimed_obligation','proposal','exception','historical','hypothetical','permission','prohibition','ambiguous']);
const fail=x=>{throw Error(x)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const date=x=>typeof x==='string'&&DATE.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const patterns={
 approval:/\b(board|approval|approve|consent|authorization|authorisation|signatory|ratif(?:y|ication))\b/i,
 contractual:/\b(contract|agreement|covenant|amendment|termination|clause|consent)\b/i,
 liquidity:/\b(cash|liquidity|payment|solvency|working capital)\b/i,
 policy:/\b(policy|internal rule|delegation|procedure|threshold)\b/i,
 tax:/\b(tax|vat|withholding|customs)\b/i,
 timing:/\b(before|after|deadline|effective|expire|until|days|date|notice)\b/i,
 operational:/\b(capacity|delivery|safety|quality|supplier|production)\b/i
};
function classify(text){
 const t=text.trim();const cues=[];
 if(/\b(hypothetical(?:ly)?|suppos(?:e|ing)|what if|assum(?:e|ing)|in a scenario|if we were to)\b/i.test(t))cues.push('hypothetical');
 if(/\b(formerly|previously|used to|historically|superseded|no longer|prior version|expired in)\b/i.test(t))cues.push('historical');
 if(/\b(except(?:ion)?|unless|waiver|notwithstanding|exempt)\b/i.test(t))cues.push('exception');
 if(/\b(propos(?:e|ed|al)|draft|suggest(?:ed)?|negotiat(?:e|ion)|subject to acceptance|not yet agreed)\b/i.test(t))cues.push('proposal');
 if(/\b(must not|shall not|prohibited|forbidden|may not)\b/i.test(t))cues.push('prohibition');
 if(/\b(may|permitted|allowed|can be)\b/i.test(t))cues.push('permission');
 if(/\b(must|shall|is required|requires|mandatory|is obligated|is obliged)\b/i.test(t))cues.push('claimed_obligation');
 const priority=['hypothetical','historical','proposal','exception','prohibition','claimed_obligation','permission'];
 const selected=priority.find(k=>cues.includes(k))||'ambiguous';
 const incompatible=cues.filter(x=>x!==selected);
 return {modality:selected,cues,issues:incompatible.length?['mixed_modality_cues']:[],certainty:'heuristic_candidate_only'};
}
function inspectPassages({sources=[],claims=[],passages=[],criteria=[],alternatives=[],as_of=null}={}){
 if(!Array.isArray(sources)||!Array.isArray(claims)||!Array.isArray(passages)||passages.length>120||!Array.isArray(criteria)||!Array.isArray(alternatives))fail('Invalid passage input');
 if(as_of!==null&&!date(as_of))fail('Invalid assessment date');
 const sourceIds=new Set(sources.map(s=>s.id));const claimIds=new Set(claims.map(c=>c.id));const criterionIds=new Set(criteria.map(c=>c.id));
 const alternativeIds=new Set(alternatives.map(a=>a.id));const used=new Set(),candidates=[],unresolved=[];
 for(const p of passages){
  if(!obj(p)||typeof p.id!=='string'||!ID.test(p.id)||used.has(p.id)||!sourceIds.has(p.source_id)||typeof p.excerpt!=='string'||p.excerpt.trim().length<10||p.excerpt.length>2000)fail('Invalid or duplicate evidence passage');used.add(p.id);
  if(p.claim_id&&!claimIds.has(p.claim_id))fail('Unknown passage claim');
  if(p.document_type&&!TYPES.has(p.document_type))fail('Unknown document type');
  if(p.effective_from&&!date(p.effective_from)||p.effective_to&&!date(p.effective_to)||p.effective_from&&p.effective_to&&p.effective_from>p.effective_to)fail('Invalid passage period');
  const suggested=(p.criterion_ids||[]);if(!Array.isArray(suggested)||suggested.some(x=>!criterionIds.has(x)))fail('Unknown passage criterion');
  const applies=(p.alternative_ids||[]);if(!Array.isArray(applies)||applies.some(x=>!alternativeIds.has(x)))fail('Unknown passage alternative');
  const cl=classify(p.excerpt);const topics=Object.entries(patterns).filter(([,re])=>re.test(p.excerpt)).map(([k])=>k);
  const issues=[...cl.issues];
  if(!p.entity)issues.push('entity_unresolved');
  if(!p.effective_from&&!p.effective_to)issues.push('effective_period_unresolved');
  if(!p.locator)issues.push('passage_locator_missing');
  if(!suggested.length)issues.push('decision_criterion_not_linked');
  if(!applies.length)issues.push('affected_alternatives_unknown');
  if(cl.modality==='ambiguous')issues.push('force_ambiguous');
  if(as_of&&p.effective_from&&as_of<p.effective_from)issues.push('not_yet_effective');
  if(as_of&&p.effective_to&&as_of>p.effective_to)issues.push('expired');
  // Excerpts do not establish authority or enforceability, irrespective of classification.
  issues.push('authority_and_applicability_unverified');
  const effect=applies.map(alternative_id=>({alternative_id,criterion_ids:suggested,classification:'possible_decision_effect_only',reason:'Analyst-supplied alternative/criterion links; no quantified or binding effect inferred'}));
  const row={passage_id:p.id,source_id:p.source_id,claim_id:p.claim_id||null,locator:p.locator||null,excerpt:p.excerpt,document_type:p.document_type||'other',modality:cl.modality,linguistic_cues:cl.cues,certainty:cl.certainty,topics,entity:p.entity||null,jurisdiction:p.jurisdiction||null,effective_from:p.effective_from||null,effective_to:p.effective_to||null,criteria:suggested,alternative_effects:effect,issues:[...new Set(issues)],status:'requires_independent_review'};
  candidates.push(row);unresolved.push({passage_id:p.id,issues:row.issues});
 }
 return {candidates,unresolved,summary:{passages:passages.length,proposed:candidates.filter(x=>x.modality==='proposal').length,historical:candidates.filter(x=>x.modality==='historical').length,ambiguous:candidates.filter(x=>x.modality==='ambiguous').length},boundary:'Excerpts and metadata are supplied by the caller. Linguistic classifications are candidate interpretations, not verified obligations. No document authenticity, completeness, legal force, exception precedence or effect on financial values is established.'};
}
export {inspectPassages,classify};