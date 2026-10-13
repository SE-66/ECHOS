/** ECHOS Connected Decision Engine v0.3 — configurable, constrained proof of concept.
 * Financial dependencies and rules MUST be supplied and validated; the engine
 * does not infer business rules, certify documents, or choose optimal actions.
 * No eval, dynamic code execution, external APIs or floating-point finance math.
 */
const SCALE=1000000000n;
const VALID_STATUS=new Set(['verified','missing','disputed','expired','unverified']);
const ID=/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const OPS=new Set(['sum','subtract','product','divide','min','max']);
const CMPS=new Set(['gte','lte','gt','lt','eq']);
function err(s){throw new Error(s)}
function record(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
function decimal(x){
  if(typeof x!=='string'&&typeof x!=='number')err('Each figure must be a number');
  const s=String(x).trim();
  if(!/^[+-]?\d+(?:\.\d{1,9})?$/.test(s))err(`Invalid decimal figure: ${s.slice(0,40)}`);
  let negative=s.startsWith('-'),[w,f='']=s.replace(/^[+-]/,'').split('.');
  const n=BigInt(w)*SCALE+BigInt((f.padEnd(9,'0'))||'0');return negative?-n:n;
}
function printed(v){const neg=v<0n;let a=neg?-v:v;let whole=(a/SCALE).toString(),fract=(a%SCALE).toString().padStart(9,'0').replace(/0+$/,'');return `${neg?'-':''}${whole}${fract?'.'+fract:''}`}
function mul(a,b){return (a*b)/SCALE}
function div(a,b){if(b===0n)err('Division by zero in financial relationship');return (a*SCALE)/b}
function checkId(x){if(typeof x!=='string'||!ID.test(x))err('Invalid identifier in financial model')}
function safeLabel(s){return typeof s==='string'&&s.trim()?s.trim().slice(0,180):err('Missing decision or field label')}
function normalize(model){
 if(!record(model))err('Provide a structured financial decision model');
 const inputs=model.inputs,calculations=model.calculations||[],conditions=model.conditions;
 if(!Array.isArray(inputs)||!Array.isArray(calculations)||!Array.isArray(conditions)||!inputs.length||!conditions.length||inputs.length+calculations.length>120||conditions.length>40)err('Model needs 1–120 financial fields and 1–40 decision requirements');
 const nodes=new Map(),inputIds=[];
 for(const raw of inputs){
   if(!record(raw))err('Invalid financial input');checkId(raw.id);if(nodes.has(raw.id))err('Duplicate field '+raw.id);
   const unit=safeLabel(raw.unit||'USD'),period=safeLabel(raw.period||model.period||'2026-Q4'),entity=safeLabel(raw.entity||model.entity||'Company');
   if(!VALID_STATUS.has(raw.status||'verified'))err('Unknown evidence status for '+raw.id);
   nodes.set(raw.id,{...raw,type:'input',label:safeLabel(raw.label||raw.id),unit,period,entity,value:printed(decimal(raw.value)),status:raw.status||'verified',source:typeof raw.source==='string'?raw.source.slice(0,240):'user supplied'});
   inputIds.push(raw.id);
 }
 for(const raw of calculations){
   if(!record(raw))err('Invalid financial relationship');checkId(raw.id);if(nodes.has(raw.id))err('Duplicate field '+raw.id);
   if(!OPS.has(raw.op)||!Array.isArray(raw.args)||raw.args.length<1||raw.args.length>20||raw.args.some(x=>typeof x!=='string'))err('Invalid calculation for '+raw.id);
   if(raw.op==='divide'&&raw.args.length!==2)err('Division needs two fields');
   if(raw.op==='subtract'&&raw.args.length<2)err('Subtraction needs at least two fields');
   if(raw.op==='product'&&raw.args.length<2)err('Product needs at least two fields');
   nodes.set(raw.id,{...raw,type:'calculated',label:safeLabel(raw.label||raw.id),unit:safeLabel(raw.unit||'USD'),period:safeLabel(raw.period||model.period||'2026-Q4'),entity:safeLabel(raw.entity||model.entity||'Company')});
 }
 const conditionsOut=[];const seen=new Set();
 for(const c of conditions){
   if(!record(c))err('Invalid decision requirement');checkId(c.id);if(seen.has(c.id))err('Duplicate requirement');seen.add(c.id);
   if(!CMPS.has(c.compare)||!nodes.has(c.left)||!nodes.has(c.right))err('Unknown comparator or financial field in '+c.id);
   conditionsOut.push({id:c.id,label:safeLabel(c.label||c.id),left:c.left,right:c.right,compare:c.compare,kind:'required'});
 }
 const order=[],visiting=new Set(),visited=new Set();
 function visit(id){
  if(visited.has(id))return;if(visiting.has(id))err('Circular dependency at '+id);visiting.add(id);
  const n=nodes.get(id);if(!n)err('Missing financial dependency: '+id);
  if(n.type==='calculated')for(const a of n.args)visit(a);
  visiting.delete(id);visited.add(id);order.push(id);
 }
 for(const id of nodes.keys())visit(id);
 const lineage={};
 for(const id of order){const n=nodes.get(id);if(n.type==='input'){lineage[id]=[id];continue}
  const deps=n.args.map(x=>nodes.get(x));
  // Same-period, same-entity arithmetic prevents accidental quarter/entity mixing.
  for(const d of deps){if(d.period!==n.period||d.entity!==n.entity)err('Entity or reporting-period mismatch: '+n.id+' depends on '+d.id)}
  if(['sum','subtract','min','max'].includes(n.op)&&deps.some(d=>d.unit!==n.unit))err('Currency/unit mismatch in '+n.id);
  lineage[id]=[...new Set(n.args.flatMap(a=>lineage[a]))].sort();
 }
 for(const c of conditionsOut){let l=nodes.get(c.left),r=nodes.get(c.right);if(l.unit!==r.unit||l.period!==r.period||l.entity!==r.entity)err('Decision requirement compares incompatible units/periods: '+c.id)}
 const impactedBy={};for(const id of inputIds)impactedBy[id]=conditionsOut.filter(c=>lineage[c.left].includes(id)||lineage[c.right].includes(id)).map(c=>c.id);
 return {name:safeLabel(model.name||'Financial decision'),question:safeLabel(model.question||model.name||'Should the proposed action proceed?'),period:model.period||'2026-Q4',entity:model.entity||'Company',nodes,conditions:conditionsOut,order,lineage,impactedBy,inputIds};
}
function compute(context,updates={}){
 if(!record(updates))err('Financial changes must be a map of field updates');
 for(const [id,delta] of Object.entries(updates))if(!context.inputIds.includes(id)||!record(delta))err('Only financial inputs can be edited: '+id);
 const values={},details={};
 for(const id of context.order){
  const n=context.nodes.get(id);
  if(n.type==='input'){
   const change=updates[id]||{};
   for(const key of Object.keys(change))if(!['value','status','source'].includes(key))err('Cannot silently change input identity, unit or period');
   const status=change.status??n.status;if(!VALID_STATUS.has(status))err('Invalid evidence status for '+id);
   const val=decimal(change.value??n.value);
   values[id]=val;
   details[id]={id,label:n.label,unit:n.unit,period:n.period,entity:n.entity,value:printed(val),status:status==='verified'?'verified':status,source:(change.source??n.source),depends_on:[id]};
  }else{
   const d=n.args.map(a=>values[a]);let x;
   if(n.op==='sum')x=d.reduce((a,b)=>a+b,0n);
   else if(n.op==='subtract')x=d.slice(1).reduce((a,b)=>a-b,d[0]);
   else if(n.op==='product')x=d.slice(1).reduce((a,b)=>mul(a,b),d[0]);
   else if(n.op==='divide')x=div(d[0],d[1]);
   else if(n.op==='min')x=d.reduce((a,b)=>a<b?a:b);
   else x=d.reduce((a,b)=>a>b?a:b);
   values[id]=x;
   const bad=context.lineage[id].filter(a=>details[a].status!=='verified');
   details[id]={id,label:n.label,unit:n.unit,period:n.period,entity:n.entity,value:printed(x),status:bad.length?'unverified':'verified',depends_on:context.lineage[id],evidence_gaps:bad};
  }
 }
 const requirements=context.conditions.map(c=>{
   const gaps=[...new Set([...context.lineage[c.left],...context.lineage[c.right]].filter(x=>details[x].status!=='verified'))].sort();
   const lhs=values[c.left],rhs=values[c.right];
   const passed=c.compare==='gte'?lhs>=rhs:c.compare==='lte'?lhs<=rhs:c.compare==='gt'?lhs>rhs:c.compare==='lt'?lhs<rhs:lhs===rhs;
   return {id:c.id,label:c.label,status:gaps.length?'needs_evidence':passed?'passes':'fails',provisional_pass:passed,evidence_gaps:gaps,actual:printed(lhs),required:printed(rhs),unit:details[c.left].unit,depends_on:[...new Set([...context.lineage[c.left],...context.lineage[c.right]])].sort()};
 });
 const knownFail=requirements.some(c=>c.status==='fails');const unknown=requirements.some(c=>c.status==='needs_evidence');
 const outcome=knownFail?'RULES_NOT_MET':unknown?'NEEDS_EVIDENCE':'WITHIN_RULES';
 const explanation=knownFail?'At least one verified requirement is not met. The proposed action cannot be approved under the stated rules.':unknown?'No verified requirement fails, but critical information needs checking before concluding.':'All stated requirements are satisfied using inputs marked verified.';
 return {outcome,explanation,requirements,details:Object.fromEntries(Object.entries(details).map(([id,d])=>[id,d]))};
}
function evaluate(model,changes={}){
 const ctx=normalize(model),baseline=compute(ctx),updated=compute(ctx,changes);
 const differences=ctx.inputIds.filter(id=>baseline.details[id].value!==updated.details[id].value||baseline.details[id].status!==updated.details[id].status).map(id=>({id,label:ctx.nodes.get(id).label,before:baseline.details[id].value,after:updated.details[id].value,evidence_before:baseline.details[id].status,evidence_after:updated.details[id].status,affects:ctx.impactedBy[id]}));
 const overlap=differences.filter(x=>x.affects.length>1);
 const switches=updated.requirements.filter((r,i)=>r.status!==baseline.requirements[i].status).map(x=>({id:x.id,label:x.label,from:baseline.requirements.find(y=>y.id===x.id).status,to:x.status}));
 const relation=baseline.outcome!==updated.outcome?'DECISION_STATUS_CHANGED':differences.length?'REASSESS_BUT_STATUS_STABLE':'NO_RELEVANT_CHANGE';
 return {model:{name:ctx.name,question:ctx.question,period:ctx.period,entity:ctx.entity},baseline,updated,changes:differences,overlap,requirement_changes:switches,relation,summary:updated.explanation,limits:'Evaluates only explicitly modeled requirements. Input evidence is self-reported, and this is not an optimal decision or proof of real-world causal effects.'};
}
export {normalize,compute,evaluate,decimal,printed};