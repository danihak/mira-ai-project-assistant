// Grounding Check — automatic post-generation evaluator. Every task ID, risk ID and date in the answer must exist
// in the source data; stakeholder emails may only mention in-scope sprint tasks. Flags are returned with the answer
// and sent to Langfuse, so hallucinations show up in traces and metrics.
const ctx = $input.first().json;
const { facts, router, config: cfg } = ctx;
const answer = ctx.answer || '';
const uniq = a => [...new Set(a)];
const flags = [];

const taskIds = uniq(answer.match(/\bT0\d{2}\b/g) || []);
const riskIds = uniq(answer.match(/\bR\d{2}\b/g) || []);
const dates = uniq(answer.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || []);

taskIds.filter(id => !facts.all_task_ids.includes(id)).forEach(id => flags.push(`Unknown task ID ${id}`));
riskIds.filter(id => !facts.all_risk_ids.includes(id)).forEach(id => flags.push(`Unknown risk ID ${id}`));

const knownDates = new Set([
  facts.report_date, facts.project_start, facts.project_end,
  ...Object.values(facts.by_sprint).flatMap(s => s.tasks.map(t => t.due)),
  ...facts.phases.flatMap(p => [p.start_date, p.end_date]),
]);
if (router.project_ref === 'abcde') dates.filter(d => !knownDates.has(d)).forEach(d => flags.push(`Date ${d} not found in source data`));

if (router.route === 'stakeholder_update' && ctx.scope_task_ids) {
  taskIds.filter(id => !ctx.scope_task_ids.includes(id)).forEach(id => flags.push(`Out-of-scope task ${id} mentioned in sprint update`));
}
if (router.route === 'status' && router.sprint && ctx.scope_task_ids) {
  const allowed = new Set([...ctx.scope_task_ids, ...facts.overdue.map(t => t.id), ...facts.blocked.map(t => t.id), ...facts.at_risk.map(t => t.id)]);
  taskIds.filter(id => !allowed.has(id)).forEach(id => flags.push(`Task ${id} is outside the requested scope`));
}
const notes = [];
if (router.route !== 'clarify' && router.project_ref !== 'abcde') notes.push('Answer is based only on user-supplied details (no project files loaded) - review before sharing');

// Cost per call (USD) from the price table in Config
const price = m => cfg.prices[Object.keys(cfg.prices).find(k => (m || '').startsWith(k))] || { input: 0, output: 0 };
const agents = ctx.calls.map(c => ({
  agent: c.agent, model: c.model, input_tokens: c.input_tokens, output_tokens: c.output_tokens, latency_ms: c.latency_ms,
  cost_usd: Number(((c.input_tokens * price(c.model).input + c.output_tokens * price(c.model).output) / 1e6).toFixed(6)),
}));
const totals = agents.reduce((a, c) => ({
  input_tokens: a.input_tokens + c.input_tokens, output_tokens: a.output_tokens + c.output_tokens,
  cost_usd: Number((a.cost_usd + c.cost_usd).toFixed(6)),
}), { input_tokens: 0, output_tokens: 0, cost_usd: 0 });
totals.latency_ms = Date.now() - ctx.started_ms;

const grounding = { passed: flags.length === 0, flags, notes, task_ids_cited: taskIds, risk_ids_cited: riskIds };
const response = {
  test_id: ctx.test_id, request: ctx.message, as_of_date: facts.report_date,
  route: router.route, intent: router.intent, project_ref: router.project_ref, sprint: router.sprint,
  router_reason: router.reason, guardrails: router.guardrails,
  answer, grounding, agents, totals, trace_id: ctx.trace_id,
};

// Langfuse ingestion batch: 1 trace + 1 generation per LLM call + spans for the deterministic steps
const now = new Date().toISOString();
const ev = (type, body, i) => ({ id: `${ctx.trace_id}-${i}`, timestamp: now, type, body });
const batch = [
  ev('trace-create', {
    id: ctx.trace_id, name: 'mira-request', input: ctx.message, output: answer, sessionId: ctx.session_id || undefined,
    tags: ['mira', `route:${router.route}`, grounding.passed ? 'grounded' : 'grounding-flags'],
    metadata: { test_id: ctx.test_id, router, grounding, totals, as_of_date: facts.report_date },
  }, 0),
  ev('span-create', { id: `${ctx.trace_id}-facts`, traceId: ctx.trace_id, name: 'Compute Facts (code)', startTime: ctx.started_at, endTime: new Date(Date.parse(ctx.started_at) + (ctx.facts_ms || 0)).toISOString(), output: { status_counts: facts.status_counts, health: facts.health } }, 1),
  ...ctx.calls.map((c, i) => c.model.startsWith('none')
    ? ev('span-create', { id: `${ctx.trace_id}-call${i}`, traceId: ctx.trace_id, name: c.agent, startTime: c.start_time, endTime: c.end_time, input: c.input, output: c.output }, 2 + i)
    : ev('generation-create', {
      id: `${ctx.trace_id}-call${i}`, traceId: ctx.trace_id, name: c.agent, model: c.model, startTime: c.start_time, endTime: c.end_time,
      input: c.input, output: c.output,
      usage: { input: c.input_tokens, output: c.output_tokens, total: c.input_tokens + c.output_tokens, unit: 'TOKENS' },
      usageDetails: { input: c.input_tokens, output: c.output_tokens },
      costDetails: { total: agents[i].cost_usd },
      metadata: { cost_usd: agents[i].cost_usd },
    }, 2 + i)),
  ev('span-create', { id: `${ctx.trace_id}-ground`, traceId: ctx.trace_id, name: 'Grounding Check (code)', startTime: now, endTime: new Date().toISOString(), output: grounding, level: grounding.passed ? 'DEFAULT' : 'WARNING' }, 9),
  ev('score-create', { id: `${ctx.trace_id}-score`, traceId: ctx.trace_id, name: 'grounded', value: grounding.passed ? 1 : 0, comment: flags.join('; ') || 'all cited IDs and dates found in source data' }, 10),
];

return [{ json: { response, langfuse_enabled: !!cfg.langfuse_enabled, langfuse_url: `${cfg.langfuse_host}/api/public/ingestion`, langfuse_body: { batch } } }];
