// Package Response — collects the specialist's output (whichever branch ran) with usage and latency.
const CONTEXT_NODES = ['Planner Context', 'Risk Context', 'Status Context', 'Milestone Context', 'Stakeholder Context', 'Clarifier (rule-based)'];
const ran = CONTEXT_NODES.find(n => { try { return $(n).isExecuted; } catch (e) { return false; } });
const ctx = $(ran).first().json;
const calls = [...(ctx.calls || [])];
let answer;
if (ran === 'Clarifier (rule-based)') {
  answer = ctx.rule_based_answer;
  calls.push({ agent: ctx.agent_name, model: 'none (rule-based)', input_tokens: 0, output_tokens: 0, latency_ms: Date.now() - ctx.agent_started_ms, input: ctx.message, output: answer, start_time: new Date(ctx.agent_started_ms).toISOString(), end_time: new Date().toISOString() });
} else {
  const resp = $input.first().json;
  answer = resp.choices?.[0]?.message?.content || '(no content returned)';
  const u = resp.usage || {};
  calls.push({ agent: ctx.agent_name, model: resp.model || ctx.request.model, input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0, latency_ms: Date.now() - ctx.agent_started_ms, input: ctx.request.messages, output: answer, start_time: new Date(ctx.agent_started_ms).toISOString(), end_time: new Date().toISOString() });
}
const { request, rule_based_answer, ...rest } = ctx;
return [{ json: { ...rest, answer, calls } }];
