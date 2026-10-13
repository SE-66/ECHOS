/** ECHOS decision bank v0.4. Coverage index, not statutory advice or executable legal rules.
 * Entries represent reusable decision archetypes, not claims that all companies follow them.
 */
const rows = [
 ['capital_investment','Capital investment approval','Investment|Treasury|Governance','cash, return, budget, authority, contracts'],
 ['expansion','Market or capacity expansion','Strategy|Operations|Finance','capacity, cash, policy, approvals, execution risk'],
 ['pricing','Product or service pricing','Commercial|Management control','cost, margin, demand, discount authority'],
 ['discount','Customer discount or rebate','Commercial|Finance|Legal','contract terms, thresholds, approval, margin'],
 ['customer_credit','Customer credit limit','Treasury|Sales|Risk','payment history, exposure, limits, exceptions'],
 ['supplier_contract','Supplier contract renegotiation','Procurement|Treasury|Legal','payment terms, consent, liquidity, supplier risk'],
 ['procurement','Purchase order approval','Procurement|Finance|Governance','budget, delegated authority, supplier policy'],
 ['supplier_selection','Supplier selection','Procurement|Risk|Operations','cost, quality, sanctions screening, continuity'],
 ['inventory','Inventory purchasing policy','Operations|Finance','working capital, reorder policy, obsolescence'],
 ['liquidity','Liquidity reserve decision','Treasury|Risk','cash timing, restrictions, obligations, covenants'],
 ['working_capital','Working capital actions','Treasury|Commercial|Procurement','receivables, payables, inventory, contracts'],
 ['financing','Borrowing or refinancing','Treasury|Legal|Risk','debt capacity, covenants, terms, authorizations'],
 ['dividend','Dividend distribution','Governance|Treasury|Legal','distributable amounts, covenants, approvals, law'],
 ['intercompany','Intercompany funding','Treasury|Tax|Legal','entities, terms, authorizations, transfer pricing'],
 ['fx_hedging','Foreign-exchange hedge','Treasury|Risk','currency exposure, hedge policy, accounting'],
 ['budget_reallocation','Budget reallocation','Management control|Governance','variance, commitments, delegation, targets'],
 ['forecast_revision','Forecast revision','FP&A|Strategy','new evidence, assumptions, materiality, reporting timing'],
 ['cost_reduction','Cost reduction program','Management control|HR|Operations','savings, feasibility, contracts, workforce impacts'],
 ['outsourcing','Outsource a business function','Operations|HR|Legal','service continuity, labor, security, contractual controls'],
 ['hiring','Hiring or headcount plan','HR|FP&A|Legal','payroll, approvals, budget, labor requirements'],
 ['restructure','Corporate restructuring','Strategy|Legal|Tax|Finance','entity structure, creditor rights, viability, procedures'],
 ['asset_disposal','Asset sale or disposal','Accounting|Tax|Treasury','valuation, proceeds, authorizations, recognition'],
 ['tax_position','Tax position or election','Tax|Legal|Finance','jurisdiction, effective rules, eligibility, substance, documentation'],
 ['transfer_pricing','Related-party pricing','Tax|Legal|Finance','functions, risks, comparability, documentation'],
 ['insurance','Insurance coverage decision','Risk|Legal|Treasury','exposure, exclusions, premium, deductibles'],
 ['litigation_settlement','Settlement decision','Legal|Treasury|Governance','exposure, privilege, reserves, approvals, timing'],
 ['compliance_exception','Policy exception request','Risk|Governance|Legal','authority, exception conditions, documented approval'],
 ['financial_reporting','Accounting judgment or disclosure','Accounting|Audit|Governance','evidence, standards, estimates, materiality'],
 ['data_access','Financial data sharing','Technology|Risk|Legal','confidentiality, purpose, authorization, security'],
 ['merger_acquisition','Acquisition or divestiture','Strategy|Legal|Finance','valuation, approvals, cash, liabilities, diligence'],
 ['business_continuity','Business continuity action','Operations|Risk|Treasury','cash, suppliers, critical systems, legal obligations'],
 ['sustainability','Sustainability investment decision','Strategy|Risk|Finance','cost, disclosure, incentives, commitments']
];
export const DECISION_BANK=Object.freeze(rows.map(([id,title,areas,considerations])=>({id,title,areas:areas.split('|'),considerations:considerations.split(', '),status:'archetype_only'})));
export function searchBank({query='',area=''}={}){
 const q=String(query).trim().toLowerCase(),a=String(area).trim().toLowerCase();
 return DECISION_BANK.filter(x=>(!q||[x.title,x.id,...x.areas,...x.considerations].join(' ').toLowerCase().includes(q))&&(!a||x.areas.some(k=>k.toLowerCase()===a)));
}