import test from 'node:test';
import assert from 'node:assert/strict';
import {runWorkflow} from '../src/workflow-engine.js';
function sample(){return {
 case:{case_id:'supplier',as_of:'2026-10-13',sources:[{id:'contract',title:'Signed agreement',review_declared:true}],claims:[{id:'terms',key:'payment_days',kind:'fact',type:'number',value:60,source_ids:['contract']}]},
 annotations:[{claim_id:'terms',modality:'existing',force:'observation',actor:'supplier',reviewed:true}],
 graph:{scenario:'existing',changed_claim_ids:['terms'],nodes:[{id:'cash',label:'Cash',type:'financial'}],relationships:[{from:'terms',to:'cash',relation:'affects',source_ids:['contract'],status:'reviewed'}]},
 decision:{decision:'Supplier terms',alternatives:[{id:'accept',label:'Accept'},{id:'negotiate',label:'Negotiate'}],criteria:[{id:'liquidity',label:'Minimum cash',type:'number',role:'hard',operator:'gte',threshold:'100',source:'Treasury policy'}],scenarios:[{id:'base',label:'Baseline'}],observations:{base:{accept:{liquidity:{value:'120',evidence:'documented'}},negotiate:{liquidity:{value:'110',evidence:'documented'}}}}}},
 provenance:[{criterion_id:'liquidity',claim_ids:['terms'],target_ids:['cash']}]
}}
test('integrates five-stage inputs with traceable criterion',()=>{const o=runWorkflow(sample());assert.equal(o.status,'mapped_with_declared_sources');assert.equal(o.comparison.assessments.length,2);assert.equal(o.criterion_trace[0].status,'linked_as_declared')});
test('does not treat an unmapped decision criterion as grounded',()=>{const s=sample();s.provenance=[];const o=runWorkflow(s);assert.equal(o.status,'requires_review');assert(o.open_issues.includes('criterion_unresolved:liquidity'))});
test('flags missing relationship evidence',()=>{const s=sample();s.graph.relationships[0].source_ids=[];const o=runWorkflow(s);assert.equal(o.status,'requires_review');assert(o.open_issues.includes('criterion_unresolved:liquidity'))});
test('rejects unknown claim mappings',()=>{const s=sample();s.provenance[0].claim_ids=['missing'];assert.throws(()=>runWorkflow(s),/unknown claim/i)});
test('keeps private answer key out of HTTP workflow results',()=>{const s=sample();s.experiment={pairs:[{id:'p1',material_change:false,baseline:s.decision,changed:s.decision}]};const o=runWorkflow(s,{includeExperiment:true});assert(o.experiment.public_cases.length===2);assert.equal(JSON.stringify(o).includes('private_answer_key'),false)});