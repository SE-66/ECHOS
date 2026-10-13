/** ECHOS phase 1: evidence-led case reconstruction.
 * No LLM inference, no legal conclusions, no automatic verification claims.
 */
const KINDS = new Set(['fact', 'assumption', 'estimate', 'interpretation', 'unknown']);
const STATUSES = new Set(['asserted', 'corroborated', 'disputed', 'superseded', 'unverified']);
const DATA_TYPES = new Set(['money', 'number', 'boolean', 'date', 'text', 'category']);
const ID = /^[a-z][a-z0-9_:-]{0,79}$/;
const fail = (s) => { throw Error(s); };
const string = (s, n = 500) => typeof s === 'string' ? s.trim().slice(0,n) : '';
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const goodDate = s => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10) === s);
function checkDate(x) { if (!goodDate(x)) fail('Invalid date'); return x || null; }
function requireId(s) { if (typeof s !== 'string' || !ID.test(s)) fail('Invalid ID'); return s; }
function canonValue(value, type) {
  if (value == null) return null;
  if (type === 'money' || type === 'number') {
    const s=String(value);
    if (!/^-?\d+(?:\.\d{1,6})?$/.test(s)) fail('Invalid numeric value');
    const [i,f='']=s.split('.');
    const n=BigInt(i.startsWith('-')?i.slice(1):i)*1000000n+BigInt(f.padEnd(6,'0') || '0');
    return (i.startsWith('-') ? -n : n).toString();
  }
  if(type==='boolean'){if(typeof value!=='boolean')fail('Boolean expected');return value;}
  if(type==='date')return checkDate(value);
  if(typeof value!=='string' || value.length>500)fail('Text/category must be a string <=500 characters');
  return value.trim();
}
function reconstruct(input) {
  if(!isObj(input))fail('Case object required');
  if(!Array.isArray(input.sources)||!Array.isArray(input.claims))fail('Supply sources and claims arrays');
  if(input.sources.length>100||input.claims.length>250||input.claims.length===0)fail('Case size out of bounds');
  const asOf=checkDate(input.as_of || new Date().toISOString().slice(0,10));
  const sourceMap=new Map();
  for(const raw of input.sources){
    if(!isObj(raw))fail('Invalid source');
    const id=requireId(raw.id);
    if(sourceMap.has(id))fail('Duplicate source ID');
    const title=string(raw.title,200);if(!title)fail('Source title required');
    const source={id,title,kind:string(raw.kind,60)||'unspecified',reference:string(raw.reference,500)||null,
      document_date:checkDate(raw.document_date),valid_from:checkDate(raw.valid_from),valid_to:checkDate(raw.valid_to),
      reviewer:string(raw.reviewer,100)||null,reviewed_at:checkDate(raw.reviewed_at),
      // A reviewer declaration is recorded, never treated as independent authentication.
      review_declared:raw.review_declared===true};
    if(source.valid_from&&source.valid_to&&source.valid_from>source.valid_to)fail('Invalid source validity interval');
    sourceMap.set(id,source);
  }
  const claims=[]; const ids=new Set();const byKey=new Map();
  for(const raw of input.claims){
    if(!isObj(raw))fail('Invalid claim');const id=requireId(raw.id),key=requireId(raw.key);
    if(ids.has(id))fail('Duplicate claim ID');ids.add(id);
    const kind=raw.kind||'fact',status=raw.status||'asserted',type=raw.type||'text';
    if(!KINDS.has(kind)||!STATUSES.has(status)||!DATA_TYPES.has(type))fail('Invalid claim type/status/kind');
    const refs=raw.source_ids||[];if(!Array.isArray(refs)||refs.length>15||refs.some(x=>!sourceMap.has(x)))fail('Claim references unknown source');
    const appliesFrom=checkDate(raw.applies_from),appliesTo=checkDate(raw.applies_to);
    if(appliesFrom&&appliesTo&&appliesFrom>appliesTo)fail('Invalid claim validity interval');
    const units=type==='money'?string(raw.currency,3):type==='number'?string(raw.unit,40):null;
    if(type==='money'&&!/^[A-Z]{3}$/.test(units))fail('Money requires ISO currency');
    const value=canonValue(raw.value,type);
    if(kind==='unknown' && value!==null)fail('Unknown cannot have a decided value');
    if(kind!=='unknown' && value===null)fail('Missing value must be typed unknown');
    const claim={id,key,label:string(raw.label,200)||key,kind,status,type,value,unit:units,source_ids:refs,
      applies_from:appliesFrom,applies_to:appliesTo,notes:string(raw.notes,500)||null};
    claim.evidence_issues=[];
    if(!refs.length)claim.evidence_issues.push('no_source');
    if(kind==='unknown')claim.evidence_issues.push('unknown_value');
    if(status==='disputed'||status==='unverified')claim.evidence_issues.push(status);
    if(status==='superseded')claim.evidence_issues.push('superseded');
    if((appliesFrom&&asOf<appliesFrom)||(appliesTo&&asOf>appliesTo))claim.evidence_issues.push('outside_claim_period');
    for(const ref of refs){const src=sourceMap.get(ref);
      if((src.valid_from&&asOf<src.valid_from)||(src.valid_to&&asOf>src.valid_to))claim.evidence_issues.push('source_outside_validity:'+ref);
      if(!src.review_declared)claim.evidence_issues.push('source_not_reviewed:'+ref);
    }
    claim.evidence_issues=[...new Set(claim.evidence_issues)];
    claims.push(claim);
    const group=byKey.get(key)||[];group.push(claim);byKey.set(key,group);
  }
  const conflicts=[];
  for(const [key,group] of byKey){
    const active=group.filter(c=>c.kind!=='unknown'&&c.status!=='superseded'&&!c.evidence_issues.includes('outside_claim_period'));
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j];
      const compatible=a.type===b.type&&a.unit===b.unit&&a.value===b.value;
      // Contradiction only if claims apply over potentially overlapping intervals.
      const overlap=(!a.applies_to||!b.applies_from||a.applies_to>=b.applies_from)&&(!b.applies_to||!a.applies_from||b.applies_to>=a.applies_from);
      if(!compatible&&overlap)conflicts.push({key,claims:[a.id,b.id],issue:'incompatible_values_or_units',resolution:'Requires source, time and scope review'});
    }
  }
  const requiredKeys=Array.isArray(input.required_keys)?input.required_keys.map(requireId):[];
  const gaps=[...new Set(requiredKeys)].filter(k=>!byKey.has(k)).map(key=>({key,issue:'required_information_not_supplied'}));
  const unresolved=claims.filter(c=>c.evidence_issues.length||c.kind==='assumption'||c.kind==='estimate'||c.kind==='interpretation').map(c=>({id:c.id,key:c.key,issues:[...c.evidence_issues,...(['assumption','estimate','interpretation'].includes(c.kind)?['not_established_fact']:[])]}));
  const links=[];
  for(const raw of input.links||[]){
    if(!isObj(raw)||!ids.has(raw.from)||!ids.has(raw.to))fail('Link refers to missing claim');
    if(!['supports','challenges','depends_on','affects'].includes(raw.relation))fail('Invalid link relation');
    links.push({from:raw.from,to:raw.to,relation:raw.relation,source_ids:(raw.source_ids||[]).filter(x=>sourceMap.has(x))});
  }
  return {case_id:string(input.case_id,100)||'unnamed',as_of:asOf,summary:{sources:sourceMap.size,claims:claims.length,conflicts:conflicts.length,gaps:gaps.length,unresolved:unresolved.length},
    sources:[...sourceMap.values()],claims,conflicts,gaps,unresolved,links,
    boundary:'Evidence reconstruction only. No claim is independently verified, no legal interpretation is certified, and no business action is approved.'};
}
export {reconstruct};