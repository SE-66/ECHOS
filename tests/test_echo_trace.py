"""Deterministic regression tests; run: python -m unittest discover -s tests -v"""
import unittest
import json
import tempfile
from pathlib import Path
from decimal import Decimal
from echo_trace import (SPECS, BASELINES, reference, apply_update, compare,
                        isolate_boundary, generate_cases, score, mock_target,
                        public_case, public_id, run_mock, wilson_interval, summarize, assess_answers)

class TestDecisionTransition(unittest.TestCase):
    def test_reference_four_domains(self):
        for domain,spec in SPECS.items():
            with self.subTest(domain=domain):
                base=reference(spec,BASELINES[domain])
                self.assertEqual(base['action'],spec.good_action)
                self.assertEqual(base['certainty'],'rule_determined')

    def test_liquidity_decision_flips(self):
        spec=SPECS['liquidity']; base=BASELINES['liquidity']
        nxt=apply_update(spec,base,{'values':{'supplier_due':'650000'}})
        cmp=compare(spec,base,nxt)
        self.assertEqual(cmp['updated']['action'], 'DEFER_OR_FINANCE')
        self.assertEqual(cmp['expected_relation'], 'ADAPT_DECISION')
        self.assertEqual(cmp['updated']['signed_slack'], '-250000')

    def test_irrelevant_presentation(self):
        spec=SPECS['pricing']; base=BASELINES['pricing']
        nxt=apply_update(spec,base,{'document':{'report_label':'new layout'}})
        cmp=compare(spec,base,nxt)
        self.assertFalse(cmp['financially_relevant'])
        self.assertEqual(cmp['expected_relation'],'PRESERVE_INVARIANT')

    def test_relevant_without_action_flip(self):
        spec=SPECS['pricing']; base=BASELINES['pricing']
        nxt=apply_update(spec,base,{'values':{'variable_cost':'70'}})
        cmp=compare(spec,base,nxt)
        self.assertTrue(cmp['financially_relevant'])
        self.assertEqual(cmp['expected_relation'],'REASSESS_BUT_PRESERVE')

    def test_evidence_dropout_triggers_abstention(self):
        spec=SPECS['pricing']; base=BASELINES['pricing']
        nxt=apply_update(spec,base,{'evidence':{'variable_cost':'disputed'}})
        cmp=compare(spec,base,nxt)
        self.assertEqual(cmp['updated']['action'],'REQUEST_EVIDENCE')
        self.assertEqual(cmp['expected_relation'],'EVIDENCE_REQUIRED')

    def test_policy_shift_flips_without_input_changes(self):
        spec=SPECS['pricing']; base=BASELINES['pricing']
        nxt=apply_update(spec,base,{'values':{'minimum_margin':'0.45'}})
        cmp=compare(spec,base,nxt)
        self.assertEqual(cmp['expected_relation'],'ADAPT_DECISION')
        self.assertEqual(cmp['updated']['action'],'REVIEW_PRICE_OR_COST')

    def test_boundaries_near_expected(self):
        spec=SPECS['pricing']; base=BASELINES['pricing']
        self.assertAlmostEqual(float(isolate_boundary(spec,base,'variable_cost')),75.0,places=4)
        self.assertAlmostEqual(float(isolate_boundary(spec,base,'minimum_margin')),0.4,places=4)

    def test_at_boundary_exact_rule_slack(self):
        for domain,spec in SPECS.items():
            with self.subTest(domain=domain):
                case=next(c for c in generate_cases() if c['id']==f'{domain}:at_boundary')
                from echo_trace import FinancialState, margin
                self.assertEqual(margin(spec,FinancialState(**case['changed_state'])), Decimal('0'))

    def test_offsetting_changes_keep_slack(self):
        for domain in SPECS:
            with self.subTest(domain=domain):
                case=next(c for c in generate_cases() if c['id']==f'{domain}:offsetting_changes')
                self.assertEqual(case['oracle']['baseline']['signed_slack'],case['oracle']['updated']['signed_slack'])
                self.assertEqual(case['oracle']['expected_relation'],'REASSESS_BUT_PRESERVE')

    def test_oracle_not_exported(self):
        for case in generate_cases():
            pub=public_case(case)
            self.assertNotIn('oracle',pub)
            self.assertNotIn('expected_action',pub)
            self.assertNotIn('expected_relation',pub)

    def test_reference_oracle_passes(self):
        for case in generate_cases():
            res=score(case,mock_target(case,'reference'))
            self.assertTrue(res['all_checks_passed'],case['id'])

    def test_naive_detects_failures(self):
        r=run_mock('naive')
        self.assertLess(r['summary']['updated_action_accuracy']['rate'],1)
        self.assertGreater(r['summary']['failure_counts']['unsupported_certainty'],0)

    def test_reject_invalid_inputs(self):
        with self.assertRaises(ValueError):
            apply_update(SPECS['pricing'],BASELINES['pricing'],{'values':{'price':0}})
        with self.assertRaises(ValueError):
            apply_update(SPECS['pricing'],BASELINES['pricing'],{'values':{'unrecognized':1}})

    def test_public_ids_do_not_reveal_family(self):
        for case in generate_cases():
            pub=public_case(case)
            self.assertEqual(pub['id'],public_id(case['id']))
            self.assertNotIn(case['family'],json.dumps(pub))
            self.assertNotIn(case['id'],json.dumps(pub))

    def test_case_count_and_category_coverage(self):
        cases=generate_cases()
        self.assertEqual(len(cases),44)
        self.assertEqual(len(set(c['id'] for c in cases)),44)
        categories={c['oracle']['expected_relation'] for c in cases}
        self.assertGreaterEqual(len(categories),4)
        self.assertIn('EVIDENCE_REQUIRED',categories)
        self.assertIn('ADAPT_DECISION',categories)
        self.assertIn('REASSESS_BUT_PRESERVE',categories)
        self.assertIn('PRESERVE_INVARIANT',categories)

    def test_external_answer_format_roundtrip(self):
        case=generate_cases()[0]
        answer=mock_target(case,'reference')
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'answers.jsonl'
            p.write_text(json.dumps({'id':public_id(case['id']), 'answer':answer})+'\n')
            report=assess_answers(p)
            self.assertEqual(report['summary']['whole_case_pass']['rate'],1)

    def test_active_selector_completes(self):
        report=run_mock('sticky',budget=14,adaptive=True)
        self.assertEqual(report['summary']['total'],14)
        self.assertEqual(len(set(r['id'] for r in report['results'])),14)

    def test_wilson(self):
        lo,hi=wilson_interval(2,10)
        self.assertLess(lo,0.2)
        self.assertGreater(hi,0.2)

if __name__ == '__main__': unittest.main()