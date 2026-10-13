/** Illustrative supplier amendment. All policies and contractual conditions are invented
 * for demonstrating model structure; NOT statements of Lebanese or other law. */
const day='2026-10-13',ref=(type,reference,more={})=>({type,reference,...more});
const A={type:'company_policy',reference:'Example Co. delegated-authority matrix v1',jurisdiction:'internal'};
const C={type:'contract',reference:'Fictional supplier agreement, consent clause',jurisdiction:'internal'};
const T={type:'company_policy',reference:'Example Co. treasury and budget policy',jurisdiction:'internal'};
const R={type:'company_policy',reference:'Example Co. counterparty risk policy',jurisdiction:'internal'};
const L={type:'company_policy',reference:'Example Co. cross-border review procedure (not a statement of law)',jurisdiction:'internal'};
function fact(id,label,kind,value,src,extra={}){return {id,label,kind,value,evidence:'declared_verified',source:src,...extra}}
export const SITUATION={
 id:'supplier_renegotiation',name:'Renegotiating a strategic supplier agreement',entity:'Example Manufacturing Company',jurisdiction:'Lebanon',as_of:day,
 decisions:[
 {id:'supplier_terms',title:'Approve supplier contract amendment',bank_id:'supplier_contract'},
 {id:'liquidity_plan',title:'Maintain short-term liquidity',bank_id:'liquidity'},
 {id:'budget_authority',title:'Authorize revised expenditure',bank_id:'budget_reallocation'},
 {id:'counterparty_risk',title:'Accept supplier exposure',bank_id:'supplier_selection'}
 ],
 facts:[
  fact('cash','Available cash','money','2400000',ref('accounting_record','Treasury balance report'),{unit:'USD'}),
  fact('purchase','Proposed purchase commitment','money','650000',ref('commercial_document','Purchase proposal'),{unit:'USD'}),
  fact('supplier_due','Existing supplier payments due','money','200000',ref('accounting_record','Payables schedule'),{unit:'USD'}),
  fact('cash_floor','Minimum required cash reserve','money','1000000',T,{unit:'USD'}),
  fact('budget','Approved procurement budget','money','1500000',ref('company_policy','Annual procurement budget'),{unit:'USD'}),
  fact('committed','Already committed expenditure','money','600000',ref('accounting_record','Purchase commitments register'),{unit:'USD'}),
  fact('budget_floor','Minimum uncommitted budget reserve','money','100000',T,{unit:'USD'}),
  fact('amendment','Are contract terms changing?','boolean',false,C),
  fact('supplier_consent','Has the supplier accepted the amendment in writing?','boolean',false,C),
  fact('board_approval','Has the required corporate approval been obtained?','boolean',true,A),
  fact('cross_border','Does the proposed structure cross a national border?','boolean',false,L),
  fact('legal_review','Has qualified legal review of that structure been completed?','boolean',false,L),
  fact('policy_exception','Is an internal-policy exception requested?','boolean',false,A),
  fact('exception_approval','Has the exception been approved by the competent authority?','boolean',false,A),
  fact('supplier_risk','Supplier continuity rating','enum','medium',R,{options:['low','medium','high']})
 ],
 calculations:[
  {id:'cash_after',label:'Cash remaining after purchases and scheduled payments',op:'subtract',args:['cash','purchase','supplier_due'],unit:'USD'},
  {id:'budget_after',label:'Uncommitted procurement budget',op:'subtract',args:['budget','committed','purchase'],unit:'USD'}
 ],
 requirements:[
  {id:'min_liquidity',title:'Maintain minimum cash reserve',kind:'comparison',left:'cash_after',op:'gte',right:'cash_floor',decision_ids:['supplier_terms','liquidity_plan'],source:T,category:'finance'},
  {id:'budget_reserve',title:'Maintain available procurement budget',kind:'comparison',left:'budget_after',op:'gte',right:'budget_floor',decision_ids:['supplier_terms','budget_authority'],source:T,category:'finance'},
  {id:'delegation',title:'Corporate approval is required',kind:'predicate',fact:'board_approval',op:'eq',value:true,decision_ids:['supplier_terms','budget_authority'],source:A,category:'governance'},
  {id:'amendment_consent',title:'Supplier consent required for an amended agreement',kind:'predicate',fact:'supplier_consent',op:'eq',value:true,when:{fact:'amendment',op:'eq',value:true},decision_ids:['supplier_terms'],source:C,category:'contract'},
  {id:'cross_border_review',title:'Internal legal review for cross-border structure',kind:'predicate',fact:'legal_review',op:'eq',value:true,when:{fact:'cross_border',op:'eq',value:true},decision_ids:['supplier_terms','counterparty_risk'],source:L,category:'legal_review'},
  {id:'exception_authority',title:'Policy exception needs delegated approval',kind:'predicate',fact:'exception_approval',op:'eq',value:true,when:{fact:'policy_exception',op:'eq',value:true},decision_ids:['budget_authority','supplier_terms'],source:A,category:'governance'},
  {id:'risk_monitoring',title:'High supplier continuity risk requires escalation',kind:'predicate',fact:'supplier_risk',op:'not_in',value:['high'],strength:'advisory',decision_ids:['supplier_terms','counterparty_risk'],source:R,category:'risk'}
 ]
};
export const SITUATION_PRESETS={
 contract_and_budget:{purchase:{value:'850000'},amendment:{value:true}},
 contractual_only:{amendment:{value:true}},
 consent_recorded:{amendment:{value:true},supplier_consent:{value:true}},
 legal_review_missing:{cross_border:{value:true},legal_review:{evidence:'missing'}},
 policy_exception:{policy_exception:{value:true}},
 approval_revoked:{board_approval:{value:false}},
 combined_offsets:{cash:{value:'2600000'},purchase:{value:'850000'}},
 uncertain_evidence:{purchase:{evidence:'disputed'}},
 supplier_risk:{supplier_risk:{value:'high'}},
 original:{}
};