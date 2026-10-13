import {traceRelationships} from './relationship-engine.js';
import {contextualize as contextualizeCase} from './context-interpreter.js';
import {reconstruct as reconstructCase} from './case-engine.js';
import {extractCandidates,findMissingRequirements,checkLegalSources,runModelExperiment,ALLOWED_MODELS} from './research-lab.js';
import {evaluate as evaluateConnected} from './context-engine.js';
import {evaluateSituation} from './situation-engine.js';
import {SITUATION,SITUATION_PRESETS} from './situation-example.js';
import {DECISION_BANK} from './decision-bank.js';
import {EXAMPLE,EXAMPLE_CHANGES} from './connected-examples.js';
/** ECHOS Cloudflare Workers adapter: deterministic, synthetic research examples only.
 * This JS port intentionally keeps the Python reference implementation untouched.
 * Do NOT use the public demo's visible rules for confidential blind evaluations.
 */

const SCALE = 1_000_000_000n;
const VERIFIED = 'verified';
const EVIDENCE_STATUSES = new Set(['verified','missing','disputed','expired','unverified']);
const SPECS = {
  liquidity: {
    name:'Liquidity-buffer authorization',domain:'liquidity',
    question:'Does approving the proposed expenditure satisfy the minimum liquidity buffer?',
    variables:['cash','spend','supplier_due','minimum_buffer'],
    bounds:{cash:['0','10000000'],spend:['0','5000000'],supplier_due:['0','5000000'],minimum_buffer:['0','5000000']},
    good_action:'APPROVE_WITHIN_RULE',bad_action:'DEFER_OR_FINANCE',
    formula:'cash - spend - supplier_due - minimum_buffer',
    policy:'Approve only if post-spend liquidity is at least the minimum buffer.',
    caveat:"This checks one liquidity rule, not the organization's entire funding decision."
  },
  pricing: {
    name:'Contribution-margin policy',domain:'pricing',
    question:'Does the current selling price satisfy the minimum contribution-margin policy?',
    variables:['price','variable_cost','minimum_margin'],
    bounds:{price:['1','1000'],variable_cost:['0','1000'],minimum_margin:['0','0.95']},
    good_action:'KEEP_PRICE_WITHIN_RULE',bad_action:'REVIEW_PRICE_OR_COST',
    formula:'(price - variable_cost) / price - minimum_margin',
    policy:'The contribution-margin percentage must be at least the stated minimum.',
    caveat:'Price-policy compliance is not a complete optimal pricing decision.'
  },
  budget: {
    name:'Available-budget authorization',domain:'budget',
    question:'Would the proposed spend preserve the minimum uncommitted budget reserve?',
    variables:['budget','committed','proposed','reserve'],
    bounds:{budget:['0','10000000'],committed:['0','10000000'],proposed:['0','10000000'],reserve:['0','10000000']},
    good_action:'APPROVE_WITHIN_RULE',bad_action:'REVISE_OR_ESCALATE',
    formula:'budget - committed - proposed - reserve',
    policy:'Approve only if the uncommitted budget remains above the reserve.',
    caveat:'Budget compliance does not establish project desirability or approval authority.'
  },
  profitability: {
    name:'Minimum-operating-profit test',domain:'profitability',
    question:'Does the plan meet the specified minimum operating-profit requirement?',
    variables:['revenue','variable_cost','fixed_cost','minimum_profit'],
    bounds:{revenue:['0','10000000'],variable_cost:['0','10000000'],fixed_cost:['0','10000000'],minimum_profit:['0','10000000']},
    good_action:'MEETS_PROFIT_RULE',bad_action:'REASSESS_PROFIT_PLAN',
    formula:'revenue - variable_cost - fixed_cost - minimum_profit',
    policy:'A plan meets the profitability rule only if operating profit meets the minimum.',
    caveat:'A one-period operating-profit rule does not determine the optimal operating plan.'
  }
};
const BASELINES = {
  liquidity:{values:{cash:'2000000',spend:'600000',supplier_due:'100000',minimum_buffer:'1000000'},document:{report_label:'Management accounts Q3'}},
  pricing:{values:{price:'100',variable_cost:'60',minimum_margin:'0.25'},document:{report_label:'Costing sheet'}},
  budget:{values:{budget:'1000000',committed:'600000',proposed:'200000',reserve:'100000'},document:{report_label:'Operating budget'}},
  profitability:{values:{revenue:'600000',variable_cost:'380000',fixed_cost:'150000',minimum_profit:'50000'},document:{report_label:'Operating plan'}}
};
for(const [domain,state] of Object.entries(BASELINES)) {
  state.evidence = Object.fromEntries(SPECS[domain].variables.map(v=>[v,VERIFIED]));
}
function fail(message) {throw new Error(message)}
function isRecord(v) {return v!==null && typeof v==='object' && !Array.isArray(v)}
function keysEqual(obj,keys){return isRecord(obj) && Object.keys(obj).length===keys.length && keys.every(k=>Object.hasOwn(obj,k))}
/** Convert decimal string to exact, scaled BigInt; no floating point rule arithmetic. */
function parseDecimal(raw) {
  if(typeof raw !== 'string' && typeof raw !== 'number') fail('Invalid numeric input');
  const value=String(raw).trim();
  if(!/^[+-]?(?:\d+)(?:\.\d{1,9})?$/.test(value)) fail('Numeric input must be a finite decimal with at most 9 fractional digits');
  const negative=value.startsWith('-');
  const unsigned=value.replace(/^[+-]/,'');
  const [whole,frac='']=unsigned.split('.');
  const result=BigInt(whole)*SCALE+BigInt(frac.padEnd(9,'0')||'0');
  return negative?-result:result;
}
function decimalString(value) {
  const negative=value<0n;
  let n=negative?-value:value;
  const whole=(n/SCALE).toString(),fraction=(n%SCALE).toString().padStart(9,'0').replace(/0+$/,'');
  return (negative?'-':'')+whole+(fraction?'.'+fraction:'');
}
function formatRatio(numerator,denominator,places=15) {
  if(denominator===0n) fail('Invalid zero denominator');
  const sign=(numerator<0n)!==(denominator<0n)?'-':'';
  let n=numerator<0n?-numerator:numerator;
  let d=denominator<0n?-denominator:denominator;
  const whole=n/d;
  let remain=n%d, fraction='';
  for(let i=0;i<places && remain!==0n;i++){remain*=10n;fraction+=(remain/d).toString();remain%=d;}
  fraction=fraction.replace(/0+$/,'');
  return (sign && (whole!==0n || fraction)?sign:'')+whole.toString()+(fraction?'.'+fraction:'');
}
function normalizedState(spec,source) {
  if(!isRecord(source)||!keysEqual(source.values,spec.variables)||!keysEqual(source.evidence,spec.variables)) fail('Financial case has missing or extra fields');
  const values={},evidence={};
  for(const key of spec.variables){
    const num=parseDecimal(source.values[key]);
    const [low,high]=spec.bounds[key].map(parseDecimal);
    if(num<low||num>high) fail(`${key} is outside permitted range [${spec.bounds[key].join(', ')}]`);
    values[key]=decimalString(num);
    if(!EVIDENCE_STATUSES.has(source.evidence[key])) fail(`Invalid evidence status for ${key}`);
    evidence[key]=source.evidence[key];
  }
  const document={report_label:String(source.document?.report_label??'').slice(0,200)};
  return {values,evidence,document};
}
function signedSlack(spec,state) {
  const a=Object.fromEntries(spec.variables.map(key=>[key,parseDecimal(state.values[key])]));
  if(spec.domain==='pricing'){
    // numerator/denominator is in the original units of the margin ratio,
    // with exact rational comparison at the decision boundary.
    const numerator=(a.price-a.variable_cost)*SCALE-a.minimum_margin*a.price;
    return {num:numerator,den:a.price*SCALE,display:formatRatio(numerator,a.price*SCALE)};
  }
  let slack;
  if(spec.domain==='liquidity')slack=a.cash-a.spend-a.supplier_due-a.minimum_buffer;
  else if(spec.domain==='budget')slack=a.budget-a.committed-a.proposed-a.reserve;
  else slack=a.revenue-a.variable_cost-a.fixed_cost-a.minimum_profit;
  return {num:slack,den:SCALE,display:decimalString(slack)};
}
async function sha256(value){
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
async function reference(spec,state){
  const deficits=spec.variables.filter(k=>state.evidence[k]!==VERIFIED).sort();
  const slack=signedSlack(spec,state);
  const action=deficits.length?'REQUEST_EVIDENCE':(slack.num>=0n?spec.good_action:spec.bad_action);
  const certificate={domain:spec.domain,formula:spec.formula,
    evidence:Object.fromEntries(spec.variables.map(k=>[k,state.evidence[k]])),
    critical_values:Object.fromEntries(spec.variables.map(k=>[k,state.values[k]])),
    signed_slack:slack.display,rule_supports_action:action,evidence_deficits:deficits};
  const certificate_hash=await sha256(certificate);
  return {action,certainty:deficits.length?'insufficient_evidence':'rule_determined',signed_slack:slack.display,
    deficits,certificate,certificate_hash,policy:spec.policy,caveat:spec.caveat,
    _slack:slack};
}
async function compare(spec,old,newer) {
  const b=await reference(spec,old),n=await reference(spec,newer);
  const value_changes={},evidence_changes={},presentation_changes={};
  for(const k of spec.variables){
    if(old.values[k]!==newer.values[k])value_changes[k]={before:old.values[k],after:newer.values[k]};
    if(old.evidence[k]!==newer.evidence[k])evidence_changes[k]={before:old.evidence[k],after:newer.evidence[k]};
  }
  for(const k of new Set([...Object.keys(old.document),...Object.keys(newer.document)])){
    if(old.document[k]!==newer.document[k])presentation_changes[k]={before:old.document[k]??null,after:newer.document[k]??null};
  }
  const financially_relevant=Object.keys(value_changes).length>0||Object.keys(evidence_changes).length>0;
  let response;
  if(n.deficits.length) response='EVIDENCE_REQUIRED';
  else if(b.deficits.length) response='EVIDENCE_RESTORED';
  else if(n.action!==b.action) response='ADAPT_DECISION';
  else if(financially_relevant) response='REASSESS_BUT_PRESERVE';
  else response='PRESERVE_INVARIANT';
  const numeric_slack_changed=b._slack.num*n._slack.den!==n._slack.num*b._slack.den;
  delete b._slack;delete n._slack;
  return {domain:spec.domain,baseline:b,updated:n,value_changes,evidence_changes,presentation_changes,
    financially_relevant,expected_relation:response,action_changed:b.action!==n.action,
    numeric_slack_changed,evidence_changed:Object.keys(evidence_changes).length>0,
    oracle_signature:await sha256({b:b.certificate_hash,n:n.certificate_hash,response})};
}
/** ECHOS v0.2: reconstructable rule impact analysis.
 * Contributions are exact finite-difference allocations over the explicit financial
 * formula, not claims about real-world causality or an AI's internal reasoning.
 * Factorial subset weighting ensures the allocated impacts sum to total rule change.
 */
function ruleCushion(spec,state){
  const v=Object.fromEntries(spec.variables.map(k=>[k,parseDecimal(state.values[k])]));
  if(spec.domain==='pricing')return (v.price-v.variable_cost)*SCALE-v.minimum_margin*v.price;
  return signedSlack(spec,state).num*SCALE;
}
function factorial(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function changedContributions(spec,old,newer){
  const keys=spec.variables.filter(k=>old.values[k]!==newer.values[k]);
  const n=keys.length;
  if(!n)return [];
  const metric=[];
  for(let mask=0;mask<(1<<n);mask++){
    const state={...old,values:{...old.values}};
    keys.forEach((key,i)=>{if(mask&(1<<i))state.values[key]=newer.values[key]});
    metric.push(ruleCushion(spec,state));
  }
  const total=factorial(n);
  const results=keys.map((key,i)=>{
    let weighted=0n;
    for(let mask=0;mask<(1<<n);mask++){
      if(mask&(1<<i))continue;
      const subsetCount=mask.toString(2).replace(/0/g,'').length;
      const weight=factorial(subsetCount)*factorial(n-subsetCount-1);
      weighted+=BigInt(weight)*(metric[mask|(1<<i)]-metric[mask]);
    }
    return {field:key,before:old.values[key],after:newer.values[key],
      impact:formatRatio(weighted,BigInt(total)*SCALE*SCALE,6),
      direction:weighted<0n?'reduces_cushion':weighted>0n?'increases_cushion':'no_cushion_effect'};
  });
  results.sort((a,b)=>{
    const aa=Math.abs(Number(a.impact)),bb=Math.abs(Number(b.impact));
    return bb-aa;
  });
  return results;
}
function presentAnalysis(spec,old,newer,oracle){
  const b=oracle.baseline,n=oracle.updated;
  const cushion=ruleCushion(spec,newer);
  const marginFormat=spec.domain==='pricing'?'per product unit':'in the scenario’s financial units';
  const gap=cushion<0n?formatRatio(-cushion,SCALE*SCALE,6):'0';
  const cushionBefore=formatRatio(ruleCushion(spec,old),SCALE*SCALE,6);
  const cushionAfter=formatRatio(cushion,SCALE*SCALE,6);
  const relation=oracle.expected_relation;
  let title='',summary='',next_step='',tone='neutral';
  if(relation==='EVIDENCE_REQUIRED'){
    title='We need better evidence before deciding';
    summary=`The information for ${n.deficits.join(', ').replaceAll('_',' ')} is not verified. A calculated result alone is not enough to approve this decision.`;
    next_step='Check the missing or disputed information, then evaluate again.';
    tone='warning';
  } else if(relation==='EVIDENCE_RESTORED'){
    title='The evidence is available again';
    summary=cushion<0n?'The information is now verified, but the current plan does not meet the stated financial rule.':'The information is now verified and the stated financial rule is satisfied.';
    next_step=cushion<0n?'Review the plan and the policy requirement.':'The rule check is complete; confirm other business considerations separately.';
    tone=cushion<0n?'warning':'positive';
  } else if(relation==='ADAPT_DECISION'){
    title='The financial decision needs to change';
    summary=cushion<0n?'The updated figures no longer satisfy the stated financial limit.':'The updated figures now satisfy the stated financial limit.';
    next_step=cushion<0n?'Reconsider the plan before approving it.':'The rule permits the plan; verify other requirements before acting.';
    tone='warning';
  } else if(relation==='REASSESS_BUT_PRESERVE'){
    title='The numbers changed, but the decision can stay';
    summary=cushion<0n?'The plan still fails the financial rule, even after the update.':'The plan still meets the financial rule after the update.';
    next_step='Document the reassessment; a changed number does not always require a new decision.';
    tone='positive';
  } else {
    title='No change to the financial decision';
    summary=Object.keys(oracle.presentation_changes).length?'Only the report presentation changed; the rule-relevant figures and evidence stayed the same.':'Nothing affecting this rule changed.';
    next_step='Keep the previous rule-based conclusion unless other business information changes.';
    tone='positive';
  }
  return {title,summary,next_step,tone,rule_status:cushion>=0n?'within_limit':'outside_limit',
    evidence_status:n.deficits.length?'needs_verification':'all_marked_verified',
    rule_cushion_before:cushionBefore,rule_cushion_after:cushionAfter,
    rule_gap:gap,units:marginFormat,
    // Financial impact is defined only for numerical inputs; evidence failures remain distinct.
    contributors:changedContributions(spec,old,newer),
    changed_evidence:oracle.evidence_changes,
    presentation_only_changes:oracle.presentation_changes,
    limitations:'Synthetic rule demonstration. Evidence statuses are user-provided, not document-authenticated. Impacts represent changes in an explicit rule, not causal effects or full financial advice.'};
}
function responseJson(data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
}
function getBaseline(domain){
  if(!Object.hasOwn(SPECS,domain)) fail('Unknown financial domain');
  return normalizedState(SPECS[domain],BASELINES[domain]);
}
function updatedState(spec,old,obj){
  if(!isRecord(obj)||!isRecord(obj.values)||!isRecord(obj.evidence)) fail('Expected values and evidence objects');
  for(const key of [...Object.keys(obj.values),...Object.keys(obj.evidence)]){
    if(!spec.variables.includes(key)) fail(`Unknown variable: ${key}`);
  }
  return normalizedState(spec,{values:{...old.values,...obj.values},evidence:{...old.evidence,...obj.evidence},
    document:{report_label:String(obj.new_label??old.document.report_label).slice(0,200)}});
}
function sameSets(left,right){return left.size===right.size&&[...left].every(k=>right.has(k))}
function asSet(val){return Array.isArray(val) && val.every(x=>typeof x==='string')?new Set(val):new Set()}
function score(caseRecord,answer){
  if(!isRecord(answer))fail('Answer must be a JSON object');
  const truth=caseRecord.oracle;
  const actualFields=new Set([...Object.keys(truth.value_changes),...Object.keys(truth.evidence_changes),...Object.keys(truth.presentation_changes)]);
  const correct_detection=sameSets(asSet(answer.changed_fields),actualFields);
  const correct_deficits=sameSets(asSet(answer.evidence_deficits),new Set(truth.updated.deficits));
  const correct_action=answer.updated_action===truth.updated.action;
  const correct_baseline=answer.baseline_action===truth.baseline.action;
  const appropriate_reassessment=!truth.financially_relevant||answer.reassessed===true;
  const errors=[];
  if(!correct_detection)errors.push('change_detection');
  if(!correct_deficits)errors.push('evidence_recognition');
  if(!correct_baseline)errors.push('baseline_decision');
  if(!correct_action)errors.push('updated_decision');
  if(!appropriate_reassessment)errors.push('declared_reassessment');
  let failure_type=null;
  if(!correct_action){
    if(truth.updated.certainty==='insufficient_evidence'&&answer.updated_action!=='REQUEST_EVIDENCE')failure_type='unsupported_certainty';
    else if(truth.baseline.certainty==='rule_determined'&&truth.updated.certainty==='rule_determined'){
      if(truth.action_changed&&answer.updated_action===answer.baseline_action)failure_type='under_response';
      else if(!truth.action_changed&&answer.updated_action!==answer.baseline_action)failure_type='over_response';
      else failure_type='wrong_decision';
    } else failure_type='evidence_transition_error';
  }
  return {id:caseRecord.id,domain:caseRecord.domain,family:caseRecord.family,
    expected_relation:truth.expected_relation,expected_action:truth.updated.action,
    observed_action:String(answer.updated_action??''),correct_action,correct_baseline,correct_detection,correct_deficits,
    appropriate_reassessment,all_checks_passed:errors.length===0,errors,failure_type,
    baseline_hash:truth.baseline.certificate_hash,updated_hash:truth.updated.certificate_hash};
}
async function handleApi(request,env){
  const pathname=new URL(request.url).pathname;
  if(pathname==='/api/lab/models'&&request.method==='GET')return responseJson({models:ALLOWED_MODELS,configured:Boolean(env?.AI)});
  if(pathname==='/api/health'&&request.method==='GET')return responseJson({ok:true,version:'0.4.0',platform:'cloudflare-workers'});
  if(pathname==='/api/bank'&&request.method==='GET')return responseJson(DECISION_BANK);
  if(pathname==='/api/situation/example'&&request.method==='GET')return responseJson({model:SITUATION,presets:SITUATION_PRESETS});
  if(pathname==='/api/connected/example'&&request.method==='GET')return responseJson({model:EXAMPLE,presets:EXAMPLE_CHANGES});
  if(pathname==='/api/specs'&&request.method==='GET'){
    return responseJson(Object.fromEntries(Object.entries(SPECS).map(([domain,spec])=>[domain,{
      name:spec.name,question:spec.question,policy:spec.policy,good_action:spec.good_action,
      variables:spec.variables,baseline:BASELINES[domain]}])));
  }
  if(request.method!=='POST')return responseJson({error:'Method not allowed'},405);
  const size=Number(request.headers.get('content-length')||'0');
  if(size>32768)return responseJson({error:'Request too large'},413);
  const raw=await request.text();
  if(raw.length>32768)return responseJson({error:'Request too large'},413);
  let obj;
  try {obj=JSON.parse(raw)}catch {return responseJson({error:'Invalid JSON'},400)}
  try {
    if(!isRecord(obj))fail('Invalid request body');
    if(pathname==='/api/case/relationships'){const reconstructed=reconstructCase(obj);const context=contextualizeCase(reconstructed,obj.annotations||[]);return responseJson({reconstructed,context,graph:traceRelationships(reconstructed,context,obj.graph||{})});}
    if(pathname==='/api/case/context'){const reconstructed=reconstructCase(obj);return responseJson({reconstructed,context:contextualizeCase(reconstructed,obj.annotations||[])});}
    if(pathname==='/api/case/reconstruct')return responseJson(reconstructCase(obj));
    if(pathname==='/api/lab/extract')return responseJson(extractCandidates(obj));
    if(pathname==='/api/lab/gaps')return responseJson(findMissingRequirements(obj));
    if(pathname==='/api/lab/legal')return responseJson(checkLegalSources(obj));
    if(pathname==='/api/lab/test-ai'){
      if(!env?.ECHOS_LAB_KEY||request.headers.get('x-echos-lab-key')!==env.ECHOS_LAB_KEY)return responseJson({error:'Private lab access required'},403);
      return responseJson(await runModelExperiment({ai:env.AI,scenario:obj.scenario,models:obj.models}));
    }
    if(pathname==='/api/situation/evaluate')return responseJson(evaluateSituation(obj.model,obj.changes||{}));
    if(pathname==='/api/connected/evaluate')return responseJson(evaluateConnected(obj.model,obj.changes||{}));
    if(pathname==='/api/evaluate'){
      const spec=SPECS[obj.domain];if(!spec)fail('Unknown financial domain');
      const old=getBaseline(obj.domain),next=updatedState(spec,old,obj);
      const oracle=await compare(spec,old,next);
      const caseRecord={id:'cloudflare-demo',domain:obj.domain,family:'manual',baseline:old,changed_state:next};
      return responseJson({oracle,insights:presentAnalysis(spec,old,next,oracle),case:caseRecord});
    }
    if(pathname==='/api/score'){
      const supplied=obj.case;
      if(!isRecord(supplied)||!Object.hasOwn(SPECS,supplied.domain))fail('Invalid case');
      const spec=SPECS[supplied.domain];
      const old=getBaseline(supplied.domain);
      const next=normalizedState(spec,supplied.changed_state);
      const oracle=await compare(spec,old,next);
      return responseJson(score({id:'cloudflare-demo',domain:supplied.domain,family:'manual',oracle},obj.answer));
    }
    return responseJson({error:'Not found'},404);
  } catch(error){return responseJson({error:error.message||'Invalid request'},400)}
}
export default {
  async fetch(request,env){
    const pathname=new URL(request.url).pathname;
    if(pathname.startsWith('/api/'))return handleApi(request,env);
    if(env?.ASSETS)return env.ASSETS.fetch(request);
    return new Response('Not found',{status:404});
  }
};
export {SPECS, BASELINES, getBaseline, updatedState, signedSlack, reference, compare, score, parseDecimal, decimalString, ruleCushion, changedContributions, presentAnalysis};