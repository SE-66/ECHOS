"""Zero-dependency localhost ECHO-TRACE decision-model explorer.
Run `python web_demo.py` then open http://127.0.0.1:8765.
Uses only synthetic demonstration cases. No API keys and no external data.
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from echo_trace import SPECS, BASELINES, FinancialState, apply_update, compare, reference, generate_cases, public_case, score, asdict

PAGE = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ECHO-TRACE | Financial decision transition explorer</title>
<style>:root{font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#e6efff;background:#07111f}*{box-sizing:border-box}body{margin:0}header{background:#0e1d2e;border-bottom:1px solid #28415b;padding:22px clamp(20px,5vw,72px);display:flex;align-items:center;justify-content:space-between;gap:12px}h1{margin:0;font-size:25px;letter-spacing:-.7px}p{line-height:1.5;color:#9ab3ce}main{max-width:1240px;margin:20px auto;padding:0 20px} .pill{color:#8ad5e3;background:#123445;border:1px solid #23677e;border-radius:20px;padding:7px 10px;font-size:12px}.layout{display:grid;grid-template-columns:1.03fr .97fr;gap:18px}.panel{background:#102034;border:1px solid #263d59;border-radius:14px;padding:21px;min-width:0}.kicker{color:#80b7d5;text-transform:uppercase;letter-spacing:1.6px;font-size:11px;font-weight:700}h2{font-size:19px;margin:8px 0 8px}.fieldrow{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.12fr;gap:8px;align-items:center;margin:10px 0}.fieldrow b{font-size:13px;font-weight:600}.fieldrow.head{font-size:11px;color:#89a5bd}.fieldrow input,.fieldrow select,select,textarea{width:100%;background:#091728;color:#e6efff;border:1px solid #37516b;border-radius:7px;padding:9px;font:inherit;font-size:13px}button{background:#76bce5;border:none;border-radius:8px;padding:10px 14px;color:#071322;font-weight:700;cursor:pointer}.secondary{background:#203a52;color:#dbeaf7}.buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.result{background:#0a1929;border-radius:10px;border:1px solid #32516b;padding:15px;margin:13px 0}.outcome{font-size:19px;font-weight:750;margin:6px 0;overflow-wrap:anywhere}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.muted{color:#97b4cc;font-size:13px}.good{color:#61d2b1}.caution{color:#f2b571}.bad{color:#fc8b88}.tag{font-size:12px;background:#1e3a4f;border-radius:30px;padding:7px 10px;display:inline-block}pre{overflow:auto;max-height:290px;font-size:11px;color:#b4d6e6;background:#071321;padding:10px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}textarea{min-height:140px;font-family:ui-monospace,monospace}footer{margin:18px 0 40px;color:#809db4;font-size:12px}@media(max-width:860px){.layout{grid-template-columns:1fr}.fieldrow{grid-template-columns:1.4fr 1fr 1fr}.fieldrow select{grid-column:2/4}.fieldrow.head{display:none}}</style>
</head><body><header><div><div class="kicker">Finance & AI research prototype</div><h1>ECHO-TRACE</h1></div><span class="pill">Local evaluation • v0.1</span></header>
<main><p>Explore financial and evidential boundaries. The reference result comes from independent coded decision rules, <strong>not</strong> from an LLM. Below you can optionally compare an AI response to the rule. This is a methodological prototype, not financial advice.</p><div class="layout">
<section class="panel"><div class="kicker">Step 1 — Define a financial transition</div><h2>Financial decision case</h2><label class="muted">Decision domain</label><select id="domain" onchange="populate()"></select><p id="question"></p><div class="fieldrow head"><span>Variable</span><span>Baseline</span><span>Updated</span><span>Evidence after</span></div><div id="fields"></div><div class="fieldrow"><b>Report title</b><input id="oldlabel" value="Management report"><input id="newlabel" value="Management report"><span class="muted">Presentation only</span></div><div class="buttons"><button onclick="evaluate()">Evaluate transition</button><button class="secondary" onclick="demoChange()">Generate example change</button><button class="secondary" onclick="populate()">Reset</button></div><div id="error" class="bad"></div></section>
<section class="panel"><div class="kicker">Step 2 — Independent reference</div><h2>Boundary and evidence evaluation</h2><div id="outcome" class="muted">Select a domain and evaluate the proposed change.</div><div class="kicker" style="margin-top:20px">Step 3 — Compare an AI response</div><p class="muted">Paste structured AI output matching the fields below. For a real blind test, use the exported scenario files instead of this exploratory view.</p><textarea id="answer" spellcheck="false"></textarea><div class="buttons"><button class="secondary" onclick="compareAnswer()">Score AI answer</button></div><div id="scoring"></div></section></div><footer>Demo constraints are illustrative. Evidence status is assigned by the experimenter; the system does not verify the underlying documents. The interface does not connect to any external AI service.</footer></main>
<script>
let specs={},caseState=null,caseEvaluation=null;
const $=id=>document.getElementById(id);
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function load(){specs=await (await fetch('/api/specs')).json();Object.entries(specs).forEach(([key,v])=>$('domain').insertAdjacentHTML('beforeend',`<option value="${esc(key)}">${esc(v.name)}</option>`));populate()}
function populate(){const d=$('domain').value,v=specs[d];$('question').textContent=v.question+' '+v.policy;$('fields').innerHTML=v.variables.map((k,i)=>`<div class="fieldrow"><b>${esc(k.replaceAll('_',' '))}</b><input type="number" step="any" disabled value="${esc(v.baseline.values[k])}"><input id="value-${esc(k)}" type="number" step="any" value="${esc(v.baseline.values[k])}"><select id="ev-${esc(k)}"><option>verified</option><option>disputed</option><option>expired</option><option>missing</option><option>unverified</option></select></div>`).join('');$('oldlabel').value=v.baseline.document.report_label||'Baseline report';$('newlabel').value=$('oldlabel').value;$('error').textContent='';$('outcome').innerHTML='<p>Change a financial variable, an evidence status, or a report label, then evaluate.</p>';$('scoring').innerHTML='';caseState=null;caseEvaluation=null;$('answer').value=JSON.stringify({baseline_action:'',updated_action:'',changed_fields:[],evidence_deficits:[],reassessed:false,explanation:''},null,2)}
function demoChange(){const v=specs[$('domain').value];const key=($('domain').value==='pricing'?'variable_cost':$('domain').value==='profitability'?'variable_cost':$('domain').value==='budget'?'committed':'supplier_due');$('value-'+key).value=$('domain').value==='pricing'?80:$('domain').value==='liquidity'?650000:$('domain').value==='budget'?800000:550000;evaluate()}
async function evaluate(){try{const d=$('domain').value, vals={},ev={};for(const k of specs[d].variables){vals[k]=$('value-'+k).value;ev[k]=$('ev-'+k).value}const obj={domain:d,values:vals,evidence:ev,new_label:$('newlabel').value};const r=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});let data=await r.json();if(!r.ok)throw Error(data.error||'Invalid scenario');caseState=data.case;caseEvaluation=data.oracle;let o=data.oracle;const b=o.baseline,n=o.updated;let financial=Object.keys(o.value_changes);let evid=Object.keys(o.evidence_changes);$('outcome').innerHTML=`<div class="two"><div class="result"><div class="kicker">Baseline decision</div><div class="outcome">${esc(b.action)}</div><div class="muted">Rule slack: ${esc(b.signed_slack)}</div></div><div class="result"><div class="kicker">Updated decision</div><div class="outcome ${n.deficits.length?'caution':n.action===b.action?'good':'bad'}">${esc(n.action)}</div><div class="muted">Rule slack: ${esc(n.signed_slack)}</div></div></div><div class="result"><span class="tag">${esc(o.expected_relation)}</span><p>Changed financial fields: ${esc(financial.join(', ')||'None')}</p><p>Changed evidence: ${esc(evid.join(', ')||'None')}</p><p>Evidence deficits: ${esc(n.deficits.join(', ')||'None')}</p><div class="kicker">Independent decision certificate</div><pre>${esc(JSON.stringify(n.certificate,null,2))}</pre></div>`;$('error').textContent='';$('scoring').innerHTML='';/* Never autofill the subject's response from the reference oracle. */}catch(e){$('error').textContent=e.message}}
async function compareAnswer(){try{if(!caseState)throw Error('Evaluate a transition first.');const data={case:caseState,answer:JSON.parse($('answer').value)};const r=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const val=await r.json();if(!r.ok)throw Error(val.error);$('scoring').innerHTML=`<div class="result"><div class="outcome ${val.all_checks_passed?'good':'caution'}">${val.all_checks_passed?'All deterministic checks passed':'One or more checks failed'}</div><p>Decision correct: ${val.correct_action}</p><p>Change detection exact: ${val.correct_detection}</p><p>Evidence deficits correct: ${val.correct_deficits}</p><p>Failure type: ${esc(val.failure_type||'None')}</p></div>`}catch(e){$('scoring').textContent=e.message}}
load();
</script></body></html>'''

class Handler(BaseHTTPRequestHandler):
    def _response(self, code, data, content_type='application/json'):
        blob=(json.dumps(data) if content_type=='application/json' else data).encode('utf8')
        self.send_response(code);self.send_header('Content-Type',content_type+'; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'")
        self.send_header('Content-Length',str(len(blob)));self.end_headers();self.wfile.write(blob)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/': return self._response(200,PAGE,'text/html')
        if path=='/api/specs':
            return self._response(200,{k:{'name':v.name,'question':v.question,'policy':v.policy,
                                          'good_action':v.good_action,'variables':v.variables,
                                          'baseline':asdict(BASELINES[k])} for k,v in SPECS.items()})
        return self._response(404,{'error':'Not found'})
    def do_POST(self):
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0 < length <= 100000:raise ValueError('Request exceeds limit or is empty')
            obj=json.loads(self.rfile.read(length))
            path=urlparse(self.path).path
            if path=='/api/evaluate':
                domain=obj['domain'];spec=SPECS[domain];old=BASELINES[domain]
                upd={'values':obj.get('values',{}),'evidence':obj.get('evidence',{}),
                     'document':{'report_label':obj.get('new_label',old.document.get('report_label',''))}}
                state=apply_update(spec,old,upd)
                oracle=compare(spec,old,state)
                case={'id':'local','domain':domain,'family':'manual',
                      'baseline':asdict(old),'changed_state':asdict(state),'oracle':oracle}
                return self._response(200,{'oracle':oracle,'case':case})
            if path=='/api/score':
                case=obj['case']
                # NEVER trust client-supplied reference keys; recompute from state.
                domain=case['domain'];spec=SPECS[domain]
                old=FinancialState(**case['baseline']);new=FinancialState(**case['changed_state'])
                oracle=compare(spec,old,new)
                trusted={'id':'local','domain':domain,'family':'manual','oracle':oracle}
                return self._response(200,score(trusted,obj['answer']))
            return self._response(404,{'error':'Not found'})
        except Exception as e:
            return self._response(400,{'error':str(e)})
    def log_message(self, *_):pass

if __name__=='__main__':
    print('ECHO-TRACE available at http://127.0.0.1:8765 (Ctrl-C to stop)')
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()