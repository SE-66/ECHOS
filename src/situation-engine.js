/** ECHOS v0.4 — multi-type, evidence-aware decision-situation evaluation.
 * Explicit, reviewed decision requirements only; NEVER infer law from text.
 * The engine evaluates stated conditions, not legal compliance or optimality.
 */
const DEC=1000000n;
const EVIDENCE=new Set(['declared_verified','unverified','missing','disputed','expired']);
const KINDS=new Set(['number','money','boolean','enum','text','date']);
const SOURCE_TYPES=new Set(['company_policy','contract','statute','regulation','accounting_record','commercial_document','management_assertion','other']);
const COMPARATORS=new Set(['eq','neq','gte','gt','lte','lt','in','not_in']);
const ID=/^[a-z][a-z0-9_]{0,63}$/;
function fail(msg){throw Error(msg)}
function obj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
function mustId(s){if(typeof s!=='string'||!ID.test(s))fail('Invalid identifier: '+String(s).slice(0,30))}
function label(s){if(typeof s!=='string'||!s.trim())fail('Required label is missing');return s.trim().slice(0,180)}
function asDay(s){if(typeof s!=='string'||!/\d{4}-\d{2}-\d{2}/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)fail('Invalid ISO date');return s}
function number(v){if(typeof v!=='string'&&typeof v!=='number')fail('Numeric fact must be a decimal');const s=String(v);if(!/^-?\d+(\.\d{1,6})?$/.test(s))fail('Invalid numerical value: '+s.slice(0,30));const [i,f='']=s.split('.');const n=BigInt(i.replace('-',''))*DEC+BigInt(f.padEnd(6,'0')||'0');return i.startsWith('-')?-n:n}
function print(n){const neg=n<0n;const x=neg?-n:n;const r=(x%DEC).toString().padStart(6,'0').replace(/0+$/,'');return `${neg?'-':''}${x/DEC}${r?'.'+r:''}`}
function parse(kind,value,options){
 if(value===null||value===undefined)return null;
 if(kind==='number'||kind==='money')return number(value);
 if(kind==='boolean'){if(typeof value!=='boolean')fail('Expected yes or no');return value}
 if(kind==='enum'){if(typeof value!=='string'||!options.includes(value))fail('Value is outside the declared choices');return value}
 if(kind==='date')return asDay(value);
 if(typeof value!=='string'||value.length>500)fail('Expected text of at most 500 characters');return value;
}
function safeSource(s){if(!obj(s)||!SOURCE_TYPES.has(s.type)||typeof s.reference!=='string'||!s.reference.trim())fail('Every fact and requirement needs a named source');return {type:s.type,reference:s.reference.slice(0,240),jurisdiction:typeof s.jurisdiction==='string'?s.jurisdiction.slice(0,64):null,effective_from:s.effective_from?asDay(s.effective_from):null,effective_to:s.effective_to?asDay(s.effective_to):null,reviewed_by:s.reviewed_by?String(s.reviewed_by).slice(0,80):null}}
function normalize(raw){
 if(!obj(raw)||!Array.isArray(raw.facts)||!Array.isArray(raw.requirements)||!Array.isArray(raw.decisions))fail('Supply decisions, facts and requirements');
 if(raw.facts.length<1||raw.facts.length>120||raw.requirements.length>80||raw.decisions.length<1||raw.decisions.length>30||!Array.isArray(raw.calculations||[]))fail('Outside prototype model capacity');
 const as_of=asDay(raw.as_of||'2026-10-13'),facts=new Map(),decisions=new Map(),calc=new Map(),requirements=[];
 for(const d of raw.decisions){mustId(d.id);if(decisions.has(d.id))fail('Repeated decision ID');decisions.set(d.id,{id:d.id,title:label(d.title),bank_id:typeof d.bank_id==='string'?d.bank_id:null})}
 for(const f of raw.facts){mustId(f.id);if(facts.has(f.id))fail('Repeated fact ID');if(!KINDS.has(f.kind))fail('Unknown fact type');if(!EVIDENCE.has(f.evidence||'unverified'))fail('Unknown evidence status');const options=f.kind==='enum'?f.options:[];if(f.kind==='enum'&&(!Array.isArray(options)||!options.length||options.length>30||options.some(x=>typeof x!=='string')))fail('Invalid enum choices');
  const value=parse(f.kind,f.value,options);facts.set(f.id,{id:f.id,label:label(f.label),kind:f.kind,unit:f.unit?label(f.unit):null,value,evidence:f.evidence||'unverified',source:safeSource(f.source),options:options||[]});
 }
 for(const c of raw.calculations||[]){mustId(c.id);if(facts.has(c.id)||calc.has(c.id))fail('Repeated calculated ID');if(!['sum','subtract'].includes(c.op)||!Array.isArray(c.args)||c.args.length<2||c.args.length>20)fail('Only bounded sum or subtract calculations are supported');calc.set(c.id,{id:c.id,label:label(c.label),op:c.op,args:c.args,unit:label(c.unit)})}
 const ordered=[],busy=new Set(),done=new Set();function visit(id){if(done.has(id))return;if(busy.has(id))fail('Cyclic calculation');if(facts.has(id)){done.add(id);return}if(!calc.has(id))fail('Unknown dependency '+id);busy.add(id);for(const dep of calc.get(id).args)visit(dep);busy.delete(id);done.add(id);ordered.push(id)}for(const id of calc.keys())visit(id);
 const seen=new Set();for(const r of raw.requirements){mustId(r.id);if(seen.has(r.id))fail('Duplicate requirement');seen.add(r.id);if(!['comparison','predicate'].includes(r.kind))fail('Invalid requirement kind');if(!Array.isArray(r.decision_ids)||!r.decision_ids.length||r.decision_ids.some(id=>!decisions.has(id)))fail('Unknown decision reference');if(r.strength&&!['mandatory','advisory'].includes(r.strength))fail('Unknown requirement strength');
 const source=safeSource(r.source);if(r.kind==='comparison'){if(!calc.has(r.left)&&!facts.has(r.left)||!calc.has(r.right)&&!facts.has(r.right))fail('Unknown comparison field');if(!['gte','gt','lte','lt','eq'].includes(r.op))fail('Invalid comparison operator')}
 else {if(!facts.has(r.fact)||!COMPARATORS.has(r.op))fail('Unknown qualitative predicate');if(['gte','gt','lte','lt'].includes(r.op)&&!['number','money','date'].includes(facts.get(r.fact).kind))fail('Invalid ordering comparison');if(['in','not_in'].includes(r.op)&&(!Array.isArray(r.value)||!r.value.length))fail('Membership test requires choices')}
 if(r.when)validateTest(r.when,facts);
 if(source.effective_from&&source.effective_to&&source.effective_from>source.effective_to)fail('Rule effective dates reversed');requirements.push({...r,title:label(r.title),strength:r.strength||'mandatory',source,decision_ids:[...new Set(r.decision_ids)]});}
 return {id:raw.id||'example',name:label(raw.name),as_of,entity:label(raw.entity||'Illustrative company'),jurisdiction:label(raw.jurisdiction||'unclassified'),decisions:[...decisions.values()],facts,calc,ordered,requirements};
}
function validateTest(t,facts,depth=0){if(!obj(t)||depth>5)fail('Invalid conditional rule');if(Array.isArray(t.all)||Array.isArray(t.any)){const a=t.all||t.any;if(!a.length||a.length>12)fail('Invalid logical group');for(const x of a)validateTest(x,facts,depth+1);return}if(t.not){validateTest(t.not,facts,depth+1);return}if(!facts.has(t.fact)||!COMPARATORS.has(t.op))fail('Condition refers to unknown fact');if(['in','not_in'].includes(t.op)&&!Array.isArray(t.value))fail('Invalid membership condition')}
function update(ctx,updates){if(!obj(updates))fail('Expected object of changed facts');for(const k of Object.keys(updates))if(!ctx.facts.has(k))fail('Changes can only update declared facts: '+k);
 const facts=new Map();for(const [id,f] of ctx.facts){const change=updates[id];if(change!==undefined&&(!obj(change)||Object.keys(change).some(k=>!['value','evidence'].includes(k))))fail('Only fact value and evidence may be updated');const val=change&&Object.hasOwn(change,'value')?parse(f.kind,change.value,f.options):f.value;let evidence=change?.evidence??f.evidence;if(!EVIDENCE.has(evidence))fail('Invalid updated evidence');if(f.source.effective_to&&ctx.as_of>f.source.effective_to)evidence='expired';if(f.source.effective_from&&ctx.as_of<f.source.effective_from)evidence='unverified';facts.set(id,{...f,value:val,evidence});}return facts}
function truth(op,left,right){if(op==='in')return right.includes(left);if(op==='not_in')return !right.includes(left);if(op==='eq')return left===right;if(op==='neq')return left!==right;if(op==='gte')return left>=right;if(op==='gt')return left>right;if(op==='lte')return left<=right;if(op==='lt')return left<right;fail('Unknown comparison')}
function testCondition(t,facts){if(t.all){const rs=t.all.map(x=>testCondition(x,facts));return rs.includes(false)?false:rs.includes(null)?null:true}if(t.any){const rs=t.any.map(x=>testCondition(x,facts));return rs.includes(true)?true:rs.includes(null)?null:false}if(t.not){let a=testCondition(t.not,facts);return a===null?null:!a}const f=facts.get(t.fact);if(f.value===null||f.evidence!=='declared_verified')return null;let val=t.value;try{if(['number','money','date'].includes(f.kind)&&!Array.isArray(val))val=parse(f.kind,val,f.options)}catch{return null}return truth(t.op,f.value,val)}
function compute(ctx,changes={}){
 const facts=update(ctx,changes),nodes=new Map();for(const [id,f] of facts)nodes.set(id,{...f,dependencies:[id]});
 for(const id of ctx.ordered){const c=ctx.calc.get(id);const args=c.args.map(a=>nodes.get(a));if(args.some(a=>!['number','money'].includes(a.kind)||a.unit!==c.unit))fail('Calculated field has incompatible numeric units');let v=args[0].value;for(let i=1;i<args.length;i++)v=v===null||args[i].value===null?null:c.op==='sum'?v+args[i].value:v-args[i].value;const bad=args.find(a=>a.evidence!=='declared_verified');nodes.set(id,{...c,kind:'number',value:v,evidence:bad?.evidence||'declared_verified',dependencies:[...new Set(args.flatMap(a=>a.dependencies))],source:null})}
 const reqs=ctx.requirements.map(r=>{
 const deps=r.kind==='comparison'?[...new Set([...nodes.get(r.left).dependencies,...nodes.get(r.right).dependencies])]:[r.fact];
 const applicable=r.when?testCondition(r.when,facts):true;
 const whenDeps=r.when?collectTestDeps(r.when):[];
 const uses=[...new Set([...deps,...whenDeps])];
 let status,reason='';if(applicable===false){status='not_applicable';reason='The declared triggering condition is not present.'}
 else if(applicable===null){status='needs_review';reason='The condition that triggers this rule is uncertain.'}
 else if(r.source.effective_from&&ctx.as_of<r.source.effective_from){status='not_applicable';reason='The supplied rule has not entered its stated effective period.'}
 else if(r.source.effective_to&&ctx.as_of>r.source.effective_to){status='needs_review';reason='The supplied rule has expired; check the applicable replacement.'}
 else if(r.source.jurisdiction&&r.source.jurisdiction!==ctx.jurisdiction&&r.source.jurisdiction!=='internal'){status='needs_review';reason='The stated jurisdiction does not match this situation.'}
 else if(['statute','regulation'].includes(r.source.type)&&!r.source.reviewed_by){status='needs_review';reason='External legal rule has not been reviewed by a qualified professional for this jurisdiction and date.'}
 else if(uses.some(k=>facts.get(k).value===null||facts.get(k).evidence!=='declared_verified')){status='needs_review';reason='One or more supporting facts need verification.'}
 else {
 let passed;
 if(r.kind==='predicate'){const fact=facts.get(r.fact);const rhs=['in','not_in'].includes(r.op)?r.value:parse(fact.kind,r.value,fact.options);passed=truth(r.op,fact.value,rhs)}
 else {const left=nodes.get(r.left),right=nodes.get(r.right);if(left.value===null||right.value===null||left.unit!==right.unit||!['number','money'].includes(left.kind)||!['number','money'].includes(right.kind))fail('Incompatible comparison');passed=truth(r.op,left.value,right.value)}
 status=passed?'passes':'fails';reason=passed?'Stated requirement is satisfied.':'Stated requirement is not satisfied.';
 }
 return {id:r.id,title:r.title,status,reason,strength:r.strength,source:r.source,decision_ids:r.decision_ids,dependencies:uses,category:r.category||'business',actual:r.kind==='comparison'?formatNode(nodes.get(r.left)):formatNode(nodes.get(r.fact)),required:r.kind==='comparison'?formatNode(nodes.get(r.right)):Array.isArray(r.value)?r.value.join(', '):String(r.value)};
 });
 const decisions=ctx.decisions.map(d=>{const requirements=reqs.filter(r=>r.decision_ids.includes(d.id));const mandatory=requirements.filter(r=>r.strength==='mandatory');const blocked=mandatory.some(x=>x.status==='fails'),unknown=mandatory.some(x=>x.status==='needs_review');return {...d,status:blocked?'blocked':unknown?'needs_review':'conditions_met',requirements:requirements.map(x=>x.id),advisories:requirements.filter(x=>x.strength==='advisory'&&x.status!=='passes'&&x.status!=='not_applicable').map(x=>x.id)}});
 const blocked=decisions.some(x=>x.status==='blocked'),unknown=decisions.some(x=>x.status==='needs_review');const outcome=blocked?'BLOCKED':unknown?'NEEDS_REVIEW':'CONDITIONS_MET';
 const values=Object.fromEntries([...facts].map(([id,f])=>[id,{kind:f.kind,value:formatNode(f),evidence:f.evidence,label:f.label,source:f.source}]));
 return {outcome,requirements:reqs,decisions,values};
}
function collectTestDeps(t){if(t.all)return t.all.flatMap(collectTestDeps);if(t.any)return t.any.flatMap(collectTestDeps);if(t.not)return collectTestDeps(t.not);return [t.fact]}
function formatNode(n){if(!n||n.value===null)return null;if(n.kind==='number'||n.kind==='money')return print(n.value);return n.value}
function evaluateSituation(model,changes={}){const ctx=normalize(model);const original=compute(ctx),updated=compute(ctx,changes),changed=[];
 for(const [id,f] of ctx.facts){const b=original.values[id],a=updated.values[id];if(b.value!==a.value||b.evidence!==a.evidence){const requirements=ctx.requirements.filter(r=>updated.requirements.find(x=>x.id===r.id).dependencies.includes(id)).map(r=>r.id);const decisions=[...new Set(ctx.requirements.filter(r=>requirements.includes(r.id)).flatMap(r=>r.decision_ids))];changed.push({id,label:f.label,before:b.value,after:a.value,evidence_before:b.evidence,evidence_after:a.evidence,affected_requirements:requirements,affected_decisions:decisions})}}
 const requirement_changes=updated.requirements.filter(r=>r.status!==original.requirements.find(b=>b.id===r.id).status).map(r=>({id:r.id,title:r.title,from:original.requirements.find(b=>b.id===r.id).status,to:r.status}));
 return {situation:{id:ctx.id,name:ctx.name,entity:ctx.entity,jurisdiction:ctx.jurisdiction,as_of:ctx.as_of},baseline:original,updated,changes:changed,overlap:changed.filter(x=>x.affected_requirements.length>1||x.affected_decisions.length>1),requirement_changes,summary:updated.outcome==='BLOCKED'?'One or more stated mandatory requirements are not met.':updated.outcome==='NEEDS_REVIEW'?'No confirmed mandatory failure, but some requirements cannot be resolved without further evidence or review.':'All currently applicable, stated mandatory requirements are satisfied; this is not a full business or legal approval.',limitations:'Only specified rules are evaluated. Source review and evidence status are user-declared; legal interpretation and current law are not independently verified.'};}
export {normalize,compute,evaluateSituation};