import test from 'node:test';
import assert from 'node:assert/strict';
import {traceRelationships} from '../src/relationship-engine.js';
const fixture=()=>({
 reconstructed:{case_id:'x',as_of:'2026-10-13',sources:[{id:'memo',review_declared:true,valid_from:null,valid_to:null}],claims:[{id:'terms',label:'Payment terms',evidence_issues:[]}]},
 context:{claims:[{claim_id:'terms',issues:[],context:{modality:'existing'}}]},
 query:{nodes:[{id:'cash',type:'financial',label:'Cash forecast'},{id:'budget',type:'financial',label:'Budget capacity'}],changed_claim_ids:['terms'],relationships:[{from:'terms',to:'cash',relation:'affects',status:'declared',source_ids:['memo']},{from:'cash',to:'budget',relation:'affects',status:'declared',source_ids:['memo']}]}
});
test('traces two connected impacts',()=>{const x=fixture();const v=traceRelationships(x.reconstructed,x.context,x.query);assert(v.exposures.some(e=>e.target_id==='cash'));assert(v.exposures.some(e=>e.target_id==='budget'))});
test('unreferenced dependency requires review',()=>{const x=fixture();x.query.relationships[0].source_ids=[];const v=traceRelationships(x.reconstructed,x.context,x.query);assert(v.exposures.some(e=>e.issues.includes('relationship_evidence_missing')))});
test('different scenario is excluded',()=>{const x=fixture();x.query.relationships[0].scenario='proposed';const v=traceRelationships(x.reconstructed,x.context,x.query);assert.equal(v.exposures.length,0)});
test('cycle does not loop',()=>{const x=fixture();x.query.relationships.push({from:'budget',to:'terms',relation:'affects',source_ids:['memo']});const v=traceRelationships(x.reconstructed,x.context,x.query);assert(v.exposures.length<=2)});
test('rejects unknown changed claim',()=>{const x=fixture();x.query.changed_claim_ids=['nonexistent'];assert.throws(()=>traceRelationships(x.reconstructed,x.context,x.query))});