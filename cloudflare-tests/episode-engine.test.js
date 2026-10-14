import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEpisode} from '../src/episode-engine.js';
test('missing baseline is not assumed',()=>assert(evaluateEpisode({current_condition:'Demand declines'}).issues.includes('prior_state_not_declared')));
test('user claims materiality but does not establish it',()=>{const x=evaluateEpisode({previous_condition:'Baseline',current_condition:'Stress',materiality:'potentially_material'});assert.equal(x.independent_materiality_established,false)});
test('AI delegation is a proposal, never an authorization',()=>{const x=evaluateEpisode({proposed_authority:'delegated_bounded'});assert.equal(x.decision_authority_established,false)});
test('unknown authority rejected',()=>assert.throws(()=>evaluateEpisode({proposed_authority:'autonomous_signoff'})));
test('comparison trajectories remain conditional',()=>{const x=evaluateEpisode({}, {comparison:{assessments:[{scenario_id:'base',alternative_id:'a',status:'passes_stated_rules'}]}});assert.equal(x.decision_trajectory[0].conditional_result,'passes_stated_rules')});
