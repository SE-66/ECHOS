/** ECHOS 0.5: candidate extraction, missing-requirement screening, controlled legal provenance, AI tests.
 * Nothing here certifies legal compliance or independently verifies law.
 */
import {DECISION_BANK} from './decision-bank.js';
const AREAS={governance:['approval','board','authorized','authorisation','authorization','consent','signature','delegate'],legal:['law','regulation','court','licence','license','jurisdiction','statute','permit'],treasury:['payment','cash','bank','loan','covenant','liquidity'],tax:['tax','vat','withholding','customs'],commercial:['price','discount','customer','sales','rebate'],hr:['employee','staff','salary','labor','labour','union'],data:['privacy','personal data','confidential','security'],operations:['supplier','delivery','quality','inventory','contract']};
const esc=s=>String(s||'').trim();
export function extractCandidates({text,source='User-supplied text',jurisdiction='unspecified'}={}){
 if(typeof text!=='string'||text.length>16000||text.length<8)throw Error('Provide 8–16,000 characters of plain text');
 const segments=text.split(/(?<=[.!?;\n])\s+/).map(s=>s.trim()).filter(Boolean).slice(0,150);
 const out=[];for(let i=0;i<segments.length;i++){const s=segments[i];const areas=Object.entries(AREAS).filter(([,words])=>words.some(w=>new RegExp('\\b'+w+'\\b','i').test(s))).map(([name])=>name);const triggers=/\b(must|shall|requires?|prohibited|unless|subject to|may not|only if|prior approval|written consent|should|obliged|mandatory)\b/i.test(s);if(areas.length||triggers)out.push({id:`candidate_${i+1}`,excerpt:s.slice(0,550),areas,rule_candidate:triggers,source:{reference:esc(source).slice(0,200),jurisdiction:esc(jurisdiction),segment:i+1},status:'unverified_candidate',suggested_review:triggers?'Verify applicability, legal interpretation, exceptions and effective dates.':'Check whether this statement creates a material decision dependency.'});}
 return {candidates:out.slice(0,65),notice:'Text screening only. No extracted statement is treated as an authenticated obligation or applicable law.'};
}
export function findMissingRequirements({decision='',present=[],jurisdiction='unspecified'}={}){
 if(typeof decision!=='string'||decision.length>500)throw Error('Provide a short decision description');
 const tokens=new Set((Array.isArray(present)?present:[]).map(x=>String(x).toLowerCase()));const q=decision.toLowerCase();
 const ranked=DECISION_BANK.map(e=>({entry:e,score:(q.includes(e.id.replaceAll('_',' '))?5:0)+e.title.toLowerCase().split(/\W+/).filter(x=>x.length>3&&q.includes(x)).length+e.considerations.filter(c=>q.includes(c.toLowerCase())).length})).sort((a,b)=>b.score-a.score).slice(0,4);
 const categories=[...new Set(ranked.filter(x=>x.score>0).flatMap(x=>x.entry.considerations))];
 const core=['approval authority','contractual obligations','financial consequences','source evidence','effective dates','jurisdiction'];
 const candidates=[...new Set([...core,...categories])];return {suggestions:candidates.filter(c=>!tokens.has(c.toLowerCase())).map(name=>({requirement_area:name,status:'potential_gap',reason:'Screen this area for applicability; absence from supplied information is not proof the requirement applies.'})),matched_families:ranked.filter(x=>x.score>0).map(x=>({id:x.entry.id,title:x.entry.title})),jurisdiction,disclaimer:'Heuristic completeness prompts, not proof that all requirements have been found.'};
}
export function checkLegalSources({rules=[],as_of='2026-10-13',jurisdiction='LB'}={}){
 if(!Array.isArray(rules)||rules.length>60)throw Error('Up to 60 legal-source records supported');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(as_of))throw Error('Date must be YYYY-MM-DD');
 return {as_of,jurisdiction,records:rules.map((r,i)=>{const source=typeof r?.source_url==='string'?r.source_url:'';const jurisdictionOk=r?.jurisdiction===jurisdiction;const temporal=(!r?.effective_from||r.effective_from<=as_of)&&(!r?.effective_to||r.effective_to>=as_of);const reviewed=Boolean(r?.reviewed_by&&r?.review_date&&r?.primary_source_confirmed===true);return {id:String(r?.id||`rule_${i+1}`),title:String(r?.title||'Untitled rule'),jurisdiction:r?.jurisdiction||null,source_url:source,reviewed_by:r?.reviewed_by||null,status:!source?'source_missing':!jurisdictionOk?'jurisdiction_mismatch':!temporal?'outside_declared_effective_period':!reviewed?'review_required':'source_review_recorded',note:reviewed?'Review is declared by the supplied record, not independently authenticated by ECHOS.':'Do not treat this as a verified legal rule.'}}),notice:'This is a provenance and validity-date register. It does not fetch authoritative legal gazettes, confirm legislative amendments, or certify legal advice.'};
}
export const ALLOWED_MODELS=['@cf/meta/llama-3.1-8b-instruct','@cf/google/gemma-3-12b-it'];
export async function runModelExperiment({ai,scenario,models=ALLOWED_MODELS.slice(0,1)}={}){
 if(typeof scenario!=='string'||scenario.length<10||scenario.length>4500)throw Error('Scenario must be 10–4,500 characters');
 if(!Array.isArray(models)||models.length<1||models.length>2||models.some(m=>!ALLOWED_MODELS.includes(m)))throw Error('Only the listed Cloudflare models may be used');
 if(!ai||typeof ai.run!=='function')throw Error('Cloudflare AI binding unavailable');
 const prompt='You are being evaluated on a business decision. Identify relevant changing financial and nonfinancial conditions, any missing evidence, and whether the decision should change, remain, or be escalated. Do not invent laws. Provide concise reasons.\n\n'+scenario;
 const results=[];for(const model of models){try{const result=await ai.run(model,{messages:[{role:'user',content:prompt}],max_tokens:450});results.push({model,response:String(result?.response??JSON.stringify(result)).slice(0,7000),status:'completed'});}catch(e){results.push({model,status:'error',error:String(e.message||e).slice(0,250)})}}
 return {results,scored:false,notice:'Raw model responses only. Scientific scoring needs independent blinded reference judgments, repeated trials, and leakage controls. No model is rated as trustworthy by this call.'};
}