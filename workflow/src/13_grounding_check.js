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
// v2 completeness checks (after baseline run 1, where T8 silently dropped an at-risk task):
// every alert task must be mentioned (by ID or name) in milestone answers; every in-scope task in sprint reports/emails.
const allTaskList = Object.values(facts.by_sprint).flatMap(s => s.tasks);
const mentioned = id => { const t = allTaskList.find(x => x.id === id); return answer.includes(id) || (t && answer.toLowerCase().includes(t.name.toLowerCase())); };
if (router.route === 'milestone') {
  [...facts.blocked, ...facts.overdue, ...facts.at_risk].map(t => t.id).filter(id => !mentioned(id)).forEach(id => flags.push(`Omitted alert task ${id}`));
}
if ((router.route === 'stakeholder_update' || (router.route === 'status' && router.sprint)) && ctx.scope_task_ids) {
  ctx.scope_task_ids.filter(id => !mentioned(id)).forEach(id => flags.push(`Omitted in-scope task ${id}`));
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

// Langfuse via OpenTelemetry (OTLP/HTTP JSON) - one trace per request:
//   root "mira-request" (agent) -> Compute Facts (span) -> Orchestrator (generation) -> specialist (generation, or span
//   for the rule-based Clarifier) -> Grounding Check (guardrail). The grounded score goes to the Scores API separately.
// (v3: moved off the legacy /api/public/ingestion endpoint, which Langfuse Cloud retires on 16 Nov 2026.)
const hex = n => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const traceId = hex(32), rootId = hex(16);
const ns = iso => `${Date.parse(iso)}000000`;
const str = v => (typeof v === 'string' ? v : JSON.stringify(v));
const attr = (key, v) => (Array.isArray(v) && v.every(x => typeof x === 'string') ? { key, value: { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } } }
  : typeof v === 'number' ? { key, value: { intValue: Math.round(v) } } : { key, value: { stringValue: str(v) } });
const span = (name, parent, start, end, type, attrs) => ({
  traceId, spanId: parent === null ? rootId : hex(16), ...(parent ? { parentSpanId: parent } : {}), name, kind: 1,
  startTimeUnixNano: ns(start), endTimeUnixNano: ns(end),
  attributes: [attr('langfuse.observation.type', type), ...attrs], status: {},
});
const endIso = new Date().toISOString();
const tags = ['mira', `route:${router.route}`, grounding.passed ? 'grounded' : 'grounding-flags'];
const spans = [
  span('mira-request', null, ctx.started_at, endIso, 'agent', [
    attr('langfuse.trace.name', 'mira-request'), attr('langfuse.trace.tags', tags),
    ...(ctx.session_id ? [attr('langfuse.session.id', ctx.session_id)] : []),
    attr('langfuse.observation.input', ctx.message), attr('langfuse.observation.output', answer),
    attr('langfuse.trace.metadata.test_id', ctx.test_id || ''), attr('langfuse.trace.metadata.route', router.route),
    attr('langfuse.trace.metadata.grounded', String(grounding.passed)), attr('langfuse.trace.metadata.cost_usd', String(totals.cost_usd)),
    attr('langfuse.trace.metadata.as_of_date', facts.report_date),
  ]),
  span('Compute Facts (code)', rootId, ctx.started_at, new Date(Date.parse(ctx.started_at) + (ctx.facts_ms || 1)).toISOString(), 'span', [
    attr('langfuse.observation.output', { status_counts: facts.status_counts, health: facts.health, blocked: facts.blocked.map(t => t.id), overdue: facts.overdue.map(t => t.id) }),
  ]),
  ...ctx.calls.map((c, i) => c.model.startsWith('none')
    ? span(c.agent, rootId, c.start_time, c.end_time, 'guardrail', [attr('langfuse.observation.input', c.input), attr('langfuse.observation.output', c.output)])
    : span(c.agent, rootId, c.start_time, c.end_time, 'generation', [
      attr('langfuse.observation.model.name', c.model), attr('langfuse.observation.input', c.input), attr('langfuse.observation.output', c.output),
      attr('langfuse.observation.usage_details', { input: c.input_tokens, output: c.output_tokens, total: c.input_tokens + c.output_tokens }),
      attr('langfuse.observation.cost_details', { total: agents[i].cost_usd }),
    ])),
  span('Grounding Check (code)', rootId, endIso, new Date(Date.parse(endIso) + 1).toISOString(), 'evaluator', [
    attr('langfuse.observation.output', grounding), attr('langfuse.observation.level', grounding.passed ? 'DEFAULT' : 'WARNING'),
  ]),
];
const otel = { resourceSpans: [{ resource: { attributes: [attr('service.name', 'mira-n8n')] }, scopeSpans: [{ scope: { name: 'mira' }, spans }] }] };
const score = { traceId, name: 'grounded', value: grounding.passed ? 1 : 0, dataType: 'NUMERIC', comment: flags.join('; ') || 'all cited IDs and dates found in source data' };
response.langfuse_trace_id = traceId;

return [{ json: { response, langfuse_enabled: !!cfg.langfuse_enabled, langfuse_url: `${cfg.langfuse_host}/api/public/otel/v1/traces`, langfuse_body: otel, langfuse_score_url: `${cfg.langfuse_host}/api/public/scores`, langfuse_score_body: score } }];
