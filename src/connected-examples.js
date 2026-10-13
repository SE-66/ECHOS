/** The examples illustrate modeling structure; models are extensible via JSON. */
export const EXAMPLE={
 name:'Can we approve the expansion project?',
 question:'Does the proposed expansion satisfy all cash, budget and operating profit requirements at the same time?',
 entity:'Example Manufacturing Co.',period:'2026-Q4',
 inputs:[
  {id:'cash',label:'Available cash',value:'2000000',source:'Treasury cash report',status:'verified'},
  {id:'supplier_due',label:'Payments due this quarter',value:'100000',source:'Supplier payment schedule',status:'verified'},
  {id:'investment',label:'Proposed project investment',value:'600000',source:'Project budget',status:'verified'},
  {id:'minimum_cash',label:'Required minimum cash balance',value:'1000000',source:'Treasury policy',status:'verified'},
  {id:'budget',label:'Total approved budget',value:'1500000',source:'Annual budget',status:'verified'},
  {id:'committed',label:'Already committed budget',value:'700000',source:'Budget ledger',status:'verified'},
  {id:'budget_reserve',label:'Minimum budget reserve',value:'150000',source:'Budget policy',status:'verified'},
  {id:'existing_revenue',label:'Existing period revenue',value:'950000',source:'Revenue forecast',status:'verified'},
  {id:'project_revenue',label:'Expected project revenue this period',value:'150000',source:'Commercial forecast',status:'verified'},
  {id:'baseline_costs',label:'Existing operating costs',value:'850000',source:'Cost forecast',status:'verified'},
  {id:'project_cost',label:'Project operating cost',value:'80000',source:'Project forecast',status:'verified'},
  {id:'profit_floor',label:'Required minimum operating profit',value:'70000',source:'Management profitability policy',status:'verified'}
 ].map(x=>({...x,unit:'USD',entity:'Example Manufacturing Co.',period:'2026-Q4'})),
 calculations:[
  {id:'cash_after',label:'Cash after the proposed investment and supplier payments',op:'subtract',args:['cash','investment','supplier_due'],unit:'USD'},
  {id:'budget_after',label:'Uncommitted budget after investment',op:'subtract',args:['budget','committed','investment'],unit:'USD'},
  {id:'total_revenue',label:'Total expected period revenue',op:'sum',args:['existing_revenue','project_revenue'],unit:'USD'},
  {id:'total_cost',label:'Total expected period operating cost',op:'sum',args:['baseline_costs','project_cost'],unit:'USD'},
  {id:'operating_profit',label:'Expected period operating profit',op:'subtract',args:['total_revenue','total_cost'],unit:'USD'}
 ].map(x=>({...x,entity:'Example Manufacturing Co.',period:'2026-Q4'})),
 conditions:[
  {id:'liquidity',label:'Minimum cash balance',left:'cash_after',compare:'gte',right:'minimum_cash'},
  {id:'budget_capacity',label:'Budget reserve',left:'budget_after',compare:'gte',right:'budget_reserve'},
  {id:'profitability',label:'Operating profit requirement',left:'operating_profit',compare:'gte',right:'profit_floor'}
 ]
};
export const EXAMPLE_CHANGES={
 combined:{supplier_due:{value:'450000'},project_revenue:{value:'30000'}},
 overlapping:{investment:{value:'700000'}},
 offsets:{cash:{value:'2350000'},supplier_due:{value:'450000'}},
 evidence:{project_revenue:{status:'disputed'}},
 budget:{committed:{value:'800000'}},
 nochange:{}
};