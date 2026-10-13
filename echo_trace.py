"""ECHO-TRACE v0.1 — decision/evidence transition testing research prototype.

Python standard-library only. Not investment advice, a model validator, or a
production-ready financial control system. Deterministic demonstration models.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Mapping

VERSION = "0.1.0"
KNOWN = "verified"
UNRELIABLE = {"missing", "disputed", "expired", "unverified"}


def dec(value: Any) -> Decimal:
    """Use decimals for financial arithmetic (never binary floating point)."""
    if isinstance(value, bool):
        raise ValueError("Boolean values are not financial quantities")
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"Not a valid numeric value: {value!r}") from exc
    if not d.is_finite():
        raise ValueError("Nonfinite numeric values are prohibited")
    return d


def s(value: Decimal | int | str) -> str:
    return format(dec(value), "f")


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


@dataclass
class FinancialState:
    values: dict[str, str]
    evidence: dict[str, str]
    document: dict[str, str] = field(default_factory=dict)

    def clone(self) -> "FinancialState":
        return FinancialState(dict(self.values), dict(self.evidence), dict(self.document))


@dataclass(frozen=True)
class DecisionSpec:
    name: str
    domain: str
    question: str
    variables: tuple[str, ...]
    bounds: dict[str, tuple[str, str]]
    good_action: str
    bad_action: str
    formula: str  # Identifier of a verified implementation, not executable user input
    critical_evidence: tuple[str, ...]
    policy: str
    # Explicit decision limitation: quantitative rule is not full business advice.
    caveat: str


SPECS: dict[str, DecisionSpec] = {
    "liquidity": DecisionSpec(
        name="Liquidity-buffer authorization", domain="liquidity",
        question="Does approving the proposed expenditure satisfy the minimum liquidity buffer?",
        variables=("cash", "spend", "supplier_due", "minimum_buffer"),
        bounds={"cash": ("0", "10000000"), "spend": ("0", "5000000"),
                "supplier_due": ("0", "5000000"), "minimum_buffer": ("0", "5000000")},
        good_action="APPROVE_WITHIN_RULE", bad_action="DEFER_OR_FINANCE",
        formula="cash - spend - supplier_due - minimum_buffer",
        critical_evidence=("cash", "spend", "supplier_due", "minimum_buffer"),
        policy="Approve only if post-spend liquidity is at least the minimum buffer.",
        caveat="This checks one liquidity rule, not the organization's entire funding decision."
    ),
    "pricing": DecisionSpec(
        name="Contribution-margin policy", domain="pricing",
        question="Does the current selling price satisfy the minimum contribution-margin policy?",
        variables=("price", "variable_cost", "minimum_margin"),
        bounds={"price": ("1", "1000"), "variable_cost": ("0", "1000"),
                "minimum_margin": ("0", "0.95")},
        good_action="KEEP_PRICE_WITHIN_RULE", bad_action="REVIEW_PRICE_OR_COST",
        formula="(price - variable_cost) / price - minimum_margin",
        critical_evidence=("price", "variable_cost", "minimum_margin"),
        policy="The contribution-margin percentage must be at least the stated minimum.",
        caveat="Price-policy compliance is not a complete optimal pricing decision."
    ),
    "budget": DecisionSpec(
        name="Available-budget authorization", domain="budget",
        question="Would the proposed spend preserve the minimum uncommitted budget reserve?",
        variables=("budget", "committed", "proposed", "reserve"),
        bounds={"budget": ("0", "10000000"), "committed": ("0", "10000000"),
                "proposed": ("0", "10000000"), "reserve": ("0", "10000000")},
        good_action="APPROVE_WITHIN_RULE", bad_action="REVISE_OR_ESCALATE",
        formula="budget - committed - proposed - reserve",
        critical_evidence=("budget", "committed", "proposed", "reserve"),
        policy="Approve only if the uncommitted budget remains above the reserve.",
        caveat="Budget compliance does not establish project desirability or approval authority."
    ),
    "profitability": DecisionSpec(
        name="Minimum-operating-profit test", domain="profitability",
        question="Does the plan meet the specified minimum operating-profit requirement?",
        variables=("revenue", "variable_cost", "fixed_cost", "minimum_profit"),
        bounds={"revenue": ("0", "10000000"), "variable_cost": ("0", "10000000"),
                "fixed_cost": ("0", "10000000"), "minimum_profit": ("0", "10000000")},
        good_action="MEETS_PROFIT_RULE", bad_action="REASSESS_PROFIT_PLAN",
        formula="revenue - variable_cost - fixed_cost - minimum_profit",
        critical_evidence=("revenue", "variable_cost", "fixed_cost", "minimum_profit"),
        policy="A plan meets the profitability rule only if operating profit meets the minimum.",
        caveat="A one-period operating-profit rule does not determine the optimal operating plan."
    ),
}

BASELINES = {
    "liquidity": FinancialState({"cash":"2000000", "spend":"600000", "supplier_due":"100000", "minimum_buffer":"1000000"},
                                {x:KNOWN for x in SPECS["liquidity"].variables}, {"report_label":"Management accounts Q3"}),
    "pricing": FinancialState({"price":"100", "variable_cost":"60", "minimum_margin":"0.25"},
                              {x:KNOWN for x in SPECS["pricing"].variables}, {"report_label":"Costing sheet"}),
    "budget": FinancialState({"budget":"1000000", "committed":"600000", "proposed":"200000", "reserve":"100000"},
                             {x:KNOWN for x in SPECS["budget"].variables}, {"report_label":"Operating budget"}),
    "profitability": FinancialState({"revenue":"600000", "variable_cost":"380000", "fixed_cost":"150000", "minimum_profit":"50000"},
                                    {x:KNOWN for x in SPECS["profitability"].variables}, {"report_label":"Operating plan"}),
}


def validate(spec: DecisionSpec, state: FinancialState) -> None:
    if set(state.values) != set(spec.variables):
        raise ValueError(f"Expected only {spec.variables}; received {tuple(state.values)}")
    if set(state.evidence) != set(spec.critical_evidence):
        raise ValueError("Evidence statuses must cover exactly all critical fields")
    for key in spec.variables:
        v = dec(state.values[key])
        low, high = map(dec, spec.bounds[key])
        if not low <= v <= high:
            raise ValueError(f"{key}={v} outside [{low}, {high}]")
        if state.evidence[key] not in ({KNOWN} | UNRELIABLE):
            raise ValueError(f"Unsupported evidence status for {key}")


def margin(spec: DecisionSpec, state: FinancialState) -> Decimal:
    """Signed slack: >=0 satisfies the explicit decision constraint."""
    a = {k: dec(v) for k, v in state.values.items()}
    if spec.domain == "liquidity":
        return a["cash"] - a["spend"] - a["supplier_due"] - a["minimum_buffer"]
    if spec.domain == "pricing":
        return ((a["price"] - a["variable_cost"]) / a["price"]) - a["minimum_margin"]
    if spec.domain == "budget":
        return a["budget"] - a["committed"] - a["proposed"] - a["reserve"]
    if spec.domain == "profitability":
        return a["revenue"] - a["variable_cost"] - a["fixed_cost"] - a["minimum_profit"]
    raise ValueError(f"Unknown formula: {spec.domain}")


def reference(spec: DecisionSpec, state: FinancialState) -> dict[str, Any]:
    validate(spec, state)
    deficits = sorted(k for k in spec.critical_evidence if state.evidence[k] != KNOWN)
    # Even when the calculation can be performed, questionable evidence cannot
    # justify the action: abstain rather than implicitly trust the arithmetic.
    slack = margin(spec, state)
    action = "REQUEST_EVIDENCE" if deficits else (spec.good_action if slack >= 0 else spec.bad_action)
    certainty = "insufficient_evidence" if deficits else "rule_determined"
    cert = {
        "domain": spec.domain,
        "formula": spec.formula,
        "evidence": {k: state.evidence[k] for k in spec.critical_evidence},
        "critical_values": {k: state.values[k] for k in spec.variables},
        "signed_slack": s(slack),
        "rule_supports_action": action,
        "evidence_deficits": deficits,
    }
    return {"action": action, "certainty": certainty, "signed_slack": s(slack),
            "deficits": deficits, "certificate": cert, "certificate_hash": digest(cert),
            "policy": spec.policy, "caveat": spec.caveat}


def apply_update(spec: DecisionSpec, state: FinancialState, update: Mapping[str, Any]) -> FinancialState:
    nxt = state.clone()
    for key, value in update.get("values", {}).items():
        if key not in spec.variables:
            raise ValueError(f"Unknown financial variable: {key}")
        nxt.values[key] = s(value)
    for key, value in update.get("evidence", {}).items():
        if key not in spec.critical_evidence:
            raise ValueError(f"Unknown evidence variable: {key}")
        nxt.evidence[key] = str(value)
    for key, value in update.get("document", {}).items():
        nxt.document[str(key)] = str(value)
    validate(spec, nxt)
    return nxt


def compare(spec: DecisionSpec, old: FinancialState, new: FinancialState) -> dict[str, Any]:
    b, n = reference(spec, old), reference(spec, new)
    value_changes = {k:{"before":old.values[k], "after":new.values[k]} for k in spec.variables
                     if dec(old.values[k]) != dec(new.values[k])}
    evidence_changes = {k:{"before":old.evidence[k], "after":new.evidence[k]} for k in spec.critical_evidence
                        if old.evidence[k] != new.evidence[k]}
    presentation_changes = {k:{"before":old.document.get(k), "after":new.document.get(k)}
                            for k in sorted(old.document.keys() | new.document.keys())
                            if old.document.get(k) != new.document.get(k)}
    financially_relevant = bool(value_changes or evidence_changes)
    if n["deficits"]:
        response = "EVIDENCE_REQUIRED"
    elif b["deficits"]:
        response = "EVIDENCE_RESTORED"
    elif n["action"] != b["action"]:
        response = "ADAPT_DECISION"
    elif financially_relevant:
        response = "REASSESS_BUT_PRESERVE"
    else:
        response = "PRESERVE_INVARIANT"
    return {
        "domain":spec.domain, "baseline":b, "updated":n,
        "value_changes":value_changes, "evidence_changes":evidence_changes,
        "presentation_changes":presentation_changes,
        "financially_relevant":financially_relevant, "expected_relation":response,
        "action_changed":b["action"] != n["action"],
        "numeric_slack_changed":dec(b["signed_slack"]) != dec(n["signed_slack"]),
        "evidence_changed":bool(evidence_changes),
        "oracle_signature":digest({"b": b["certificate_hash"], "n": n["certificate_hash"], "response":response}),
    }


def next_decimal(val: Decimal, delta: Decimal) -> Decimal:
    return val + delta


def isolate_boundary(spec: DecisionSpec, baseline: FinancialState, key: str,
                     tolerance: Decimal = Decimal("0.000001")) -> Decimal | None:
    """Bisection for a single numeric input; requires a bracketed sign change.
    Validity and monotonicity are checked; all variables here satisfy this for
    their documented ranges. Domain generalization requires stronger solvers.
    """
    low, high = map(dec, spec.bounds[key])
    if low == high:
        return None
    # Exact analytic roots where the demo rule permits a closed-form solution.
    # Avoid mislabeling an approximate bisection result as an equality boundary.
    a = {k: dec(v) for k, v in baseline.values.items()}
    root = None
    if spec.domain == "pricing":
        if key == "variable_cost": root = a["price"] * (1 - a["minimum_margin"])
        elif key == "minimum_margin": root = (a["price"] - a["variable_cost"]) / a["price"]
        elif key == "price" and a["minimum_margin"] != 1:
            root = a["variable_cost"] / (1 - a["minimum_margin"])
    else:
        positive = {"liquidity": "cash", "budget": "budget", "profitability": "revenue"}[spec.domain]
        if key == positive:
            root = sum((v for k,v in a.items() if k != positive), Decimal("0"))
        else:
            root = a[positive] - sum((v for k,v in a.items() if k != positive and k != key), Decimal("0"))
    if root is not None:
        return root if low <= root <= high else None
    def signed(x: Decimal) -> Decimal:
        cand = baseline.clone()
        cand.values[key] = s(x)
        return margin(spec, cand)
    fl, fh = signed(low), signed(high)
    if fl == 0: return low
    if fh == 0: return high
    if fl * fh > 0: return None
    for _ in range(80):
        mid = (low + high) / 2
        fm = signed(mid)
        if fm == 0 or high - low <= tolerance:
            return mid
        if fl * fm < 0:
            high, fh = mid, fm
        else:
            low, fl = mid, fm
    return (low + high) / 2


def steps(spec: DecisionSpec, key: str) -> Decimal:
    return Decimal("0.001") if key == "minimum_margin" else (Decimal("0.01") if spec.domain == "pricing" else Decimal("100"))


def make_scenario(domain: str, label: str, baseline: FinancialState,
                  update: dict[str, Any], family: str) -> dict[str, Any]:
    spec = SPECS[domain]
    changed = apply_update(spec, baseline, update)
    rel = compare(spec, baseline, changed)
    return {"id": f"{domain}:{label}", "domain": domain, "family":family,
            "baseline":asdict(baseline), "update":update,
            "changed_state":asdict(changed), "oracle": rel}


def generate_cases(seed: int = 43) -> list[dict[str, Any]]:
    """Deterministic financially consistent scenarios in four financial domains.

    Includes near-boundary changes, relevant-but-no-action-flip, irrelevant
    presentation, evidence loss, policy changes and compounded offsets.
    """
    rng = random.Random(seed)
    cases: list[dict[str, Any]] = []
    for domain, spec in SPECS.items():
        base = BASELINES[domain]
        cases.append(make_scenario(domain, "cosmetic", base, {"document":{"report_label":"Reformatted report"}}, "presentation_invariance"))
        key = {"liquidity":"supplier_due", "pricing":"variable_cost", "budget":"committed", "profitability":"variable_cost"}[domain]
        # Relevant but small: financial slack changes; decision generally remains stable.
        old = dec(base.values[key])
        changes = s(old + (Decimal("1") if domain == "pricing" else Decimal("1000")))
        cases.append(make_scenario(domain, "reassess_preserve", base, {"values":{key:changes}}, "relevance_without_action_change"))
        # Evidence loss is a knowledge-boundary flip without altered numeric facts.
        cases.append(make_scenario(domain, "evidence_disputed", base, {"evidence":{key:"disputed"}}, "evidence_boundary"))
        cases.append(make_scenario(domain, "evidence_expired", base, {"evidence":{key:"expired"}}, "evidence_boundary"))
        # Policy threshold changes without changing commercial and operational data.
        policy = {"liquidity":"minimum_buffer", "pricing":"minimum_margin", "budget":"reserve", "profitability":"minimum_profit"}[domain]
        boundary = isolate_boundary(spec, base, policy)
        if boundary is not None:
            epsilon = steps(spec, policy)
            low, high = map(dec, spec.bounds[policy])
            for name, target in (("policy_below", boundary-epsilon), ("policy_above", boundary+epsilon)):
                if low <= target <= high:
                    cases.append(make_scenario(domain, name, base,
                        {"values":{policy:s(target)}}, "decision_boundary_policy"))
        # Financial boundary switches; near and far; captures low-margin counterexamples.
        boundary = isolate_boundary(spec, base, key)
        if boundary is not None:
            epsilon = steps(spec, key)
            low, high = map(dec, spec.bounds[key])
            for name, target in (("near_below",boundary-epsilon), ("at_boundary", boundary), ("near_above",boundary+epsilon)):
                if low <= target <= high:
                    cases.append(make_scenario(domain, name, base,
                        {"values":{key:s(target)}}, "decision_boundary_numeric"))
        # Compound offset: shift cash/budget/revenue and outflow/cost by equal amounts;
        # numeric slack invariant even though multiple components change.
        if domain == "liquidity":
            upd={"values":{"cash":s(dec(base.values["cash"])+Decimal("10000")),
                            "supplier_due":s(dec(base.values["supplier_due"])+Decimal("10000"))}}
        elif domain == "pricing":
            # Need exact same margin: scale price and variable_cost proportionally.
            upd={"values":{"price":"110", "variable_cost":"66"}}
        elif domain == "budget":
            upd={"values":{"budget":s(dec(base.values["budget"])+Decimal("10000")),
                            "committed":s(dec(base.values["committed"])+Decimal("10000"))}}
        else:
            upd={"values":{"revenue":s(dec(base.values["revenue"])+Decimal("10000")),
                            "fixed_cost":s(dec(base.values["fixed_cost"])+Decimal("10000"))}}
        cases.append(make_scenario(domain, "offsetting_changes", base, upd, "compensating_dependencies"))
        # Combined evidence + financial perturbation: action should be evidence request
        if boundary is not None:
            eps = steps(spec, key)
            old_low, old_hi = map(dec, spec.bounds[key])
            target = boundary+eps if boundary+eps <= old_hi else boundary-eps
            cases.append(make_scenario(domain, "cross_boundary_with_missing_evidence", base,
                {"values":{key:s(target)}, "evidence":{policy:"missing"}}, "joint_decision_evidence"))
    rng.shuffle(cases)
    return cases


def public_id(case_id: str) -> str:
    """Nonsemantic case ID; prevents filenames and family tags revealing labels."""
    return "ET-" + hashlib.sha256(("echo-trace-v0.1:" + case_id).encode()).hexdigest()[:12].upper()


def public_case(case: Mapping[str, Any]) -> dict[str, Any]:
    """Export no oracle labels, target action, family names or semantically revealing IDs."""
    spec = SPECS[case["domain"]]
    return {"id":public_id(case["id"]), "domain":case["domain"],
            "question": spec.question, "policy": spec.policy,
            "caveat":spec.caveat, "baseline":case["baseline"],
            "updated_state":case["changed_state"],
            "instruction":"Analyze baseline and updated state. Return ONLY JSON: "
            "{\"baseline_action\":\"...\",\"updated_action\":\"...\","
            "\"changed_fields\":[...],\"evidence_deficits\":[...],"
            "\"reassessed\":true/false,\"explanation\":\"...\"}. "
            "Actions: " + ", ".join([spec.good_action,spec.bad_action,"REQUEST_EVIDENCE"]) + ". "
            "Do not guess missing evidence; clarify data insufficiency."}


def interpret_answer(answer: Any) -> dict[str, Any]:
    if not isinstance(answer, dict):
        raise ValueError("Answer must be a JSON object")
    return {"baseline_action":str(answer.get("baseline_action", "")),
            "updated_action":str(answer.get("updated_action", "")),
            "changed_fields":set(answer.get("changed_fields") or []),
            "evidence_deficits":set(answer.get("evidence_deficits") or []),
            "reassessed":answer.get("reassessed") is True,
            "explanation":str(answer.get("explanation", ""))}


def score(case: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    truth = case["oracle"]
    parsed = interpret_answer(answer)
    actual_fields = set(truth["value_changes"]) | set(truth["evidence_changes"]) | set(truth["presentation_changes"])
    actual_missing = set(truth["updated"]["deficits"])
    expected_action = truth["updated"]["action"]
    act = parsed["updated_action"]
    base_act = parsed["baseline_action"]
    correct_detection = parsed["changed_fields"] == actual_fields
    correct_deficits = parsed["evidence_deficits"] == actual_missing
    correct_action = act == expected_action
    correct_baseline = base_act == truth["baseline"]["action"]
    appropriate_reassess = (parsed["reassessed"] if truth["financially_relevant"] else True)
    # No unverifiable claims about private model reasoning based on explanations.
    errors=[]
    if not correct_detection: errors.append("change_detection")
    if not correct_deficits: errors.append("evidence_recognition")
    if not correct_baseline: errors.append("baseline_decision")
    if not correct_action: errors.append("updated_decision")
    if not appropriate_reassess: errors.append("declared_reassessment")
    failure_type = None
    if not correct_action:
        if truth["updated"]["certainty"] == "insufficient_evidence" and act != "REQUEST_EVIDENCE":
            failure_type = "unsupported_certainty"
        elif truth["baseline"]["certainty"] == "rule_determined" and truth["updated"]["certainty"] == "rule_determined":
            if truth["action_changed"] and act == base_act:
                failure_type = "under_response"
            elif not truth["action_changed"] and act != base_act:
                failure_type = "over_response"
            else:
                failure_type = "wrong_decision"
        else:
            failure_type = "evidence_transition_error"
    return {"id":case["id"], "domain":case["domain"], "family":case["family"],
            "expected_relation":truth["expected_relation"], "expected_action":expected_action,
            "observed_action":act, "correct_action":correct_action,
            "correct_baseline":correct_baseline, "correct_detection":correct_detection,
            "correct_deficits":correct_deficits, "appropriate_reassessment":appropriate_reassess,
            "all_checks_passed": not errors, "errors":errors, "failure_type":failure_type,
            "baseline_hash":truth["baseline"]["certificate_hash"],
            "updated_hash":truth["updated"]["certificate_hash"]}


def mock_target(case: dict[str, Any], kind: str = "naive") -> dict[str, Any]:
    """Synthetic agents for exercising the test harness. NOT real AI results."""
    t=case["oracle"]
    fields=sorted(set(t["value_changes"])|set(t["evidence_changes"])|set(t["presentation_changes"]))
    correct={"baseline_action":t["baseline"]["action"], "updated_action":t["updated"]["action"],
             "changed_fields":fields, "evidence_deficits":t["updated"]["deficits"], "reassessed":True,
             "explanation":"Synthetic test adapter: externally computed reference labels."}
    if kind=="reference": return correct
    if kind=="sticky":
        correct["updated_action"]=correct["baseline_action"]
        correct["reassessed"]=False
        return correct
    if kind=="reactive":
        if fields:
            spec=SPECS[case["domain"]]
            correct["updated_action"]=spec.bad_action if correct["baseline_action"]==spec.good_action else spec.good_action
        return correct
    if kind=="naive":
        # Represents naive reliance on initial output despite later information
        correct["updated_action"]=correct["baseline_action"]
        correct["evidence_deficits"]=[]
        return correct
    raise ValueError(f"Unknown mock target {kind}")


def wilson_interval(successes: int, total: int, z: float = 1.959963984540054) -> list[float] | None:
    if total == 0: return None
    p=successes/total
    den=1+(z*z)/total
    center=(p+z*z/(2*total))/den
    half=z*math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den
    return [round(max(0,center-half),4),round(min(1,center+half),4)]


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    def calc(rows: list[dict[str, Any]], field_name: str) -> dict[str, Any]:
        k=sum(bool(row[field_name]) for row in rows)
        n=len(rows)
        return {"success":k,"total":n,"rate":round(k/n,4) if n else None,
                "wilson95":wilson_interval(k,n)}
    groups:dict[str,list[dict[str,Any]]]={}
    for row in results:
        groups.setdefault(row["family"],[]).append(row)
    action_change=[r for r in results if r["expected_relation"]=="ADAPT_DECISION"]
    action_stability=[r for r in results if r["expected_relation"] in
                      {"REASSESS_BUT_PRESERVE","PRESERVE_INVARIANT"}]
    evidence_cases=[r for r in results if r["expected_relation"]=="EVIDENCE_REQUIRED"]
    return {"total":len(results),
            "action_adaptation":calc(action_change,"correct_action"),
            "action_stability":calc(action_stability,"correct_action"),
            "evidence_abstention":calc(evidence_cases,"correct_action"),
            "updated_action_accuracy":calc(results,"correct_action"),
            "change_detection_exact":calc(results,"correct_detection"),
            "evidence_deficit_exact":calc(results,"correct_deficits"),
            "whole_case_pass":calc(results,"all_checks_passed"),
            "by_family":{group:calc(rows,"correct_action") for group,rows in sorted(groups.items())},
            "failure_counts":{f:sum(r["failure_type"]==f for r in results)
                               for f in ["under_response","over_response","unsupported_certainty","wrong_decision","evidence_transition_error"]}}


class AdaptiveSelector:
    """Heuristic active-test selection; no assertion of optimality.

    Prioritizes boundary/evidence coverage and revisits failure families. The
    ranking is specified and logged; future research must compare against random
    and other test-selection policies with matched budgets.
    """
    def __init__(self, cases: list[dict[str,Any]]):
        self.remaining={case["id"]:case for case in cases}
        self.covered:dict[str,int]={}
        self.failed:dict[str,int]={}
        self.domain_seen:dict[str,int]={}

    def priority(self, case:dict[str,Any]) -> float:
        fam=case["family"]; domain=case["domain"]
        # Each term interpretable, no latent 'intelligence' score.
        novelty=4/(1+self.covered.get(fam,0))
        domain_diversity=2/(1+self.domain_seen.get(domain,0))
        learned_failure=1.5*self.failed.get(fam,0)/(1+self.covered.get(fam,0))
        evidence_bonus=1 if case["oracle"]["expected_relation"]=="EVIDENCE_REQUIRED" else 0
        return novelty+domain_diversity+learned_failure+evidence_bonus

    def choose(self) -> dict[str,Any]:
        if not self.remaining: raise StopIteration
        case=max(self.remaining.values(),key=lambda c:(self.priority(c),c["id"]))
        return self.remaining.pop(case["id"])

    def observe(self, result:dict[str,Any]) -> None:
        fam=result["family"]
        self.covered[fam]=self.covered.get(fam,0)+1
        self.domain_seen[result["domain"]]=self.domain_seen.get(result["domain"],0)+1
        self.failed[fam]=self.failed.get(fam,0)+(0 if result["all_checks_passed"] else 1)


def run_mock(kind: str = "naive", budget: int | None = None, adaptive: bool = False) -> dict[str,Any]:
    cases=generate_cases()
    if budget is None: budget=len(cases)
    results=[]
    if adaptive:
        sel=AdaptiveSelector(cases)
        while len(results)<min(budget,len(cases)):
            case=sel.choose(); result=score(case,mock_target(case,kind)); results.append(result); sel.observe(result)
    else:
        for case in cases[:budget]:results.append(score(case,mock_target(case,kind)))
    return {"version":VERSION, "agent":f"synthetic_{kind}", "mode":"adaptive" if adaptive else "seeded_order",
            "warning":"Synthetic test-harness results; no real language model was evaluated",
            "summary":summarize(results), "results":results}


def markdown_report(payload:dict[str,Any]) -> str:
    summary=payload["summary"]
    lines=["# ECHO-TRACE experimental report", "", f"- Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
           f"- Version: {payload['version']}", f"- Target: {payload['agent']}", f"- Selection: {payload['mode']}",
           f"- **Important:** {payload['warning']}", "", "## Primary measures", "",
           "| Measure | Passed | Total | Rate | 95% Wilson interval |", "|---|---:|---:|---:|---|"]
    for k in ["action_adaptation","action_stability","evidence_abstention","updated_action_accuracy","change_detection_exact","evidence_deficit_exact","whole_case_pass"]:
        r=summary[k]; interval=r["wilson95"]
        lines.append(f"| {k} | {r['success']} | {r['total']} | {r['rate']} | {interval} |")
    lines.extend(["", "## Action accuracy by scenario family", "", "| Family | Passed | Total | Rate |", "|---|---:|---:|---:|"])
    for k,v in summary["by_family"].items():
        lines.append(f"| {k} | {v['success']} | {v['total']} | {v['rate']} |")
    lines.extend(["", "## Selected failures", "", "| Case | Expected | Observed | Failure type |", "|---|---|---|---|"])
    for result in payload["results"]:
        if not result["all_checks_passed"]:
            lines.append(f"| {result['id']} | {result['expected_action']} | {result['observed_action']} | {result['failure_type'] or ', '.join(result['errors'])} |")
    lines.extend(["", "## Interpretation limits", "", "Results are limited to synthetic, deterministic and manually specified decision rules; these do not establish real-world financial validity. Wilson intervals assume independently sampled Bernoulli observations; here scenarios were intentionally designed and correlated within domain, so the interval is illustrative, not a valid generalization to production performance. Human expert validation, external cases and repeat testing remain necessary."])
    return "\n".join(lines)+"\n"


def export_cases(path: Path, key_path: Path) -> int:
    cases=generate_cases()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w",encoding="utf8") as out:
        for c in cases:out.write(json.dumps(public_case(c),sort_keys=True)+"\n")
    with key_path.open("w",encoding="utf8") as out:
        for c in cases:out.write(json.dumps({"id":public_id(c["id"]),"internal_id":c["id"],"domain":c["domain"],"family":c["family"],
                                            "expected_relation":c["oracle"]["expected_relation"],
                                            "expected_action":c["oracle"]["updated"]["action"]},sort_keys=True)+"\n")
    return len(cases)


def assess_answers(path:Path)->dict[str,Any]:
    cases={public_id(c["id"]):c for c in generate_cases()}
    results=[]
    with path.open(encoding="utf8") as f:
        for ln,line in enumerate(f,1):
            if not line.strip():continue
            row=json.loads(line)
            cid=row.get("id"); answer=row.get("answer")
            if cid not in cases:raise ValueError(f"Line {ln}: unknown case ID {cid}")
            if not isinstance(answer,dict):raise ValueError(f"Line {ln}: answer must be an object")
            results.append(score(cases.pop(cid), answer))
    return {"version":VERSION,"agent":path.stem,"mode":"external_answers",
            "warning":"Partial evaluations and intentionally selected cases are not representative of production reliability.",
            "summary":summarize(results),"results":results}


def main() -> None:
    parser=argparse.ArgumentParser(description="ECHO-TRACE research prototype; no external packages required")
    p=parser.add_subparsers(dest="command",required=True)
    demo=p.add_parser("demo",help="run synthetic demonstration and write report")
    demo.add_argument("--target",choices=["reference","naive","sticky","reactive"],default="naive")
    demo.add_argument("--budget",type=int,default=None)
    demo.add_argument("--adaptive",action="store_true")
    demo.add_argument("--output",type=Path,default=Path("output/demo"))
    exp=p.add_parser("export",help="export public inputs and a SEPARATE private answer key")
    exp.add_argument("--cases",type=Path,default=Path("output/public_cases.jsonl"))
    exp.add_argument("--key",type=Path,default=Path("output/private_key.jsonl"))
    score_cmd=p.add_parser("score",help="evaluate external target response JSONL")
    score_cmd.add_argument("--answers",type=Path,required=True)
    score_cmd.add_argument("--output",type=Path,default=Path("output/external"))
    args=parser.parse_args()
    if args.command=="export":
        n=export_cases(args.cases,args.key)
        print(f"Exported {n} public cases to {args.cases}; private key to {args.key}")
        return
    if args.command=="demo":
        payload=run_mock(args.target,args.budget,args.adaptive)
    else:
        payload=assess_answers(args.answers)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.with_suffix(".json").write_text(json.dumps(payload,indent=2),encoding="utf8")
    args.output.with_suffix(".md").write_text(markdown_report(payload),encoding="utf8")
    print(json.dumps(payload["summary"],indent=2))
    print(f"Reports: {args.output.with_suffix('.md')}, {args.output.with_suffix('.json')}")

if __name__ == "__main__":
    main()