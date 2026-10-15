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
// v3 numeric + attribute checks (after capstone feedback: "grounding checkers pass ungrounded numeric counts if
// entity-attribute links are missing"). Every count, % complete and health rating stated in the answer must match a
// value Compute Facts produced (project-wide or for any sprint), and every task's stated status must match the board.
if (router.project_ref === 'abcde') {
  // a count may match the whole project or the sprint the request is about (not any random sprint)
  const sprintKey = router.sprint ? `Sprint ${router.sprint}` : null;
  const sprintCounts = sprintKey && facts.by_sprint[sprintKey] ? [facts.by_sprint[sprintKey].counts] : [];
  const allCounts = [facts.status_counts, ...sprintCounts];
  const allowed = {
    Done: allCounts.map(c => c.Done || 0), 'In Progress': allCounts.map(c => c['In Progress'] || 0),
    Blocked: allCounts.map(c => c.Blocked || 0), 'To Do': allCounts.map(c => c['To Do'] || 0),
    Overdue: [facts.overdue.length], 'At risk': [facts.at_risk.length],
  };
  const statusOf = w => {
    w = w.toLowerCase().replace(/[-\s]+/g, ' ');
    if (/^(done|completed?|finished)$/.test(w)) return 'Done';
    if (w === 'in progress') return 'In Progress';
    if (w === 'blocked') return 'Blocked';
    if (w === 'to do' || w === 'not started') return 'To Do';
    if (w === 'overdue') return 'Overdue';
    if (w === 'at risk') return 'At risk';
    return null;
  };
  const WORDS = { no: 0, zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const num = s => (/^\d+$/.test(s) ? Number(s) : WORDS[s.toLowerCase()]);
  const STATUS = '(done|completed?|finished|in[- ]progress|blocked|to[- ]do|not[- ]started|overdue|at[- ]risk)';
  const NUM = '(\\d+|no|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
  const claims = [];
  const lb = '(?<!(?:sprint|week|weeks|phase|day|days|wk|by|in)\\s)(?<![\\w.%-])';
  // prose: "5 tasks done", "1 blocked task", "4 at-risk tasks", "no blocked tasks", "1 task currently in progress"
  for (const m of answer.matchAll(new RegExp(`${lb}${NUM}\\s+(?:(?:tasks?|items?|are|is|currently|remain|remaining|still)\\s+){0,3}${STATUS}\\b`, 'gi'))) claims.push([m[0], num(m[1]), statusOf(m[2])]);
  // "completed 2 tasks"
  for (const m of answer.matchAll(new RegExp(`\\b(?:completed|finished)\\s+${NUM}\\s+tasks?\\b`, 'gi'))) claims.push([m[0], num(m[1]), 'Done']);
  // count tables: "| Done | 5 |"
  for (const m of answer.matchAll(new RegExp(`\\|\\s*\\**${STATUS}\\**\\s*\\|\\s*\\**(\\d+)\\**\\s*\\|`, 'gi'))) claims.push([m[0].trim(), Number(m[2]), statusOf(m[1])]);
  for (const [text, n, st] of claims) {
    if (st && n !== undefined && allowed[st] && !allowed[st].includes(n)) flags.push(`Count not in source data: "${text.replace(/\s+/g, ' ').trim()}" (${st} is ${[...new Set(allowed[st])].join(' or ')} at ${sprintKey ? 'project/' + sprintKey + ' level' : 'project level'})`);
  }
  // % complete
  const pcts = [facts.percent_done, ...sprintCounts.map(c => (c.Total ? Math.round(((c.Done || 0) / c.Total) * 100) : 0))];
  for (const m of answer.matchAll(/(\d{1,3})\s*%\s*(?:of\s+(?:all\s+)?tasks\s+)?(?:complete|completed|done)\b/gi)) {
    if (!pcts.includes(Number(m[1]))) flags.push(`Percent complete ${m[1]}% not in source data (project is ${facts.percent_done}%)`);
  }
  // health rating
  for (const m of answer.matchAll(/health[^\n.]{0,30}?\b(RED|AMBER|GREEN)\b/gi)) {
    if (m[1].toUpperCase() !== facts.health) flags.push(`Health stated as ${m[1].toUpperCase()} but computed health is ${facts.health}`);
  }
  // entity-attribute links: the status words right after a task ID must agree with that task's real status
  const byId = Object.fromEntries(allTaskList.map(t => [t.id, t]));
  const overdueIds = facts.overdue.map(t => t.id), blockedIds = facts.blocked.map(t => t.id);
  const seen = new Set();
  for (const m of answer.matchAll(/\bT0\d{2}\b/g)) {
    const t = byId[m[0]]; if (!t) continue;
    const rest = answer.slice(m.index + 4);
    const seg = rest.split(/\bT0\d{2}\b|\n|\.\s/)[0].slice(0, 160);
    const said = new Set();
    for (const w of seg.matchAll(/(?<!un)(?<!to be |must be |be |will be )\b(done|completed|finished|in[- ]progress|blocked|to[- ]do|not[- ]started)\b(?!\s+by)/gi)) said.add(statusOf(w[1]));
    const key = `${t.id}`;
    if (said.size && !said.has(t.status) && !seen.has(key + 'status')) { seen.add(key + 'status'); flags.push(`Task ${t.id} described as ${[...said].join('/')} but its status is ${t.status}`); }
    if (/\boverdue\b/i.test(seg) && !overdueIds.includes(t.id) && !seen.has(key + 'od')) { seen.add(key + 'od'); flags.push(`Task ${t.id} described as overdue but it is not`); }
    if (/\bon[- ]track\b/i.test(seg) && (overdueIds.includes(t.id) || blockedIds.includes(t.id)) && !seen.has(key + 'ot')) { seen.add(key + 'ot'); flags.push(`Task ${t.id} described as on track but it is ${blockedIds.includes(t.id) ? 'Blocked' : 'overdue'}`); }
  }
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
// Experiment attributes (Langfuse "experiments via OpenTelemetry"): run-level on every span, item-level on the root span
const ex = ctx.experiment;
const runAttrs = ex ? [attr('langfuse.experiment.id', ex.run_name), attr('langfuse.experiment.name', ex.run_name),
  ...(ex.dataset_id ? [attr('langfuse.experiment.dataset.id', ex.dataset_id)] : []), attr('langfuse.experiment.metadata.workflow', ex.run_name),
  attr('langfuse.environment', 'experiment')] : [];
const itemAttrs = ex ? [attr('langfuse.experiment.item.id', ex.dataset_item_id), attr('langfuse.experiment.item.root_observation_id', rootId),
  ...(ex.description ? [attr('langfuse.experiment.description', ex.description)] : []),
  ...(ex.expected_output ? [attr('langfuse.experiment.item.expected_output', JSON.stringify(ex.expected_output))] : [])] : [];
const span = (name, parent, start, end, type, attrs) => ({
  traceId, spanId: parent === null ? rootId : hex(16), ...(parent ? { parentSpanId: parent } : {}), name, kind: 1,
  startTimeUnixNano: ns(start), endTimeUnixNano: ns(end),
  attributes: [attr('langfuse.observation.type', type), ...runAttrs, ...(parent === null ? itemAttrs : []), ...attrs], status: {},
});
const endIso = new Date().toISOString();
const tags = ['mira', `route:${router.route}`, `channel:${ctx.channel || 'webhook'}`, grounding.passed ? 'grounded' : 'grounding-flags', ...(ctx.test_id ? [`test:${ctx.test_id}`] : [])];
// The exact source data the specialist agent saw - a constant-named span so an LLM judge can check faithfulness against it
const specialist = ctx.calls[ctx.calls.length - 1];
const agentContext = Array.isArray(specialist.input) ? (specialist.input.find(m => m.role === 'user') || {}).content : `REQUEST: ${ctx.message} (handled by rule-based Clarifier, no source data used)`;
const spans = [
  span('mira-request', null, ctx.started_at, endIso, 'agent', [
    attr('langfuse.trace.name', 'mira-request'), attr('langfuse.trace.tags', tags),
    ...(ctx.session_id ? [attr('langfuse.session.id', ctx.session_id)] : []),
    attr('langfuse.observation.input', ctx.message), attr('langfuse.observation.output', answer),
    attr('langfuse.trace.metadata.test_id', ctx.test_id || ''), attr('langfuse.trace.metadata.route', router.route),
    attr('langfuse.trace.metadata.grounded', String(grounding.passed)), attr('langfuse.trace.metadata.cost_usd', String(totals.cost_usd)),
    attr('langfuse.trace.metadata.as_of_date', facts.report_date), attr('langfuse.trace.metadata.channel', ctx.channel || 'webhook'),
  ]),
  span('Agent Context', rootId, ctx.started_at, ctx.started_at, 'span', [attr('langfuse.observation.input', agentContext)]),
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
const score = { traceId, observationId: rootId, name: 'grounded', value: grounding.passed ? 1 : 0, dataType: 'NUMERIC', comment: flags.join('; ') || 'all cited IDs and dates found in source data' };
response.langfuse_trace_id = traceId;
// `output` is what the n8n chat window displays: the answer plus a one-line audit footer
const footer = router.route === 'clarify'
  ? `_Mira · route: clarify (rule-based, no LLM) · cost $${totals.cost_usd.toFixed(4)}_`
  : `_Mira · route: ${router.route} · grounding: ${grounding.passed ? 'passed ✓' : 'FLAGS: ' + flags.join('; ')} · ${totals.input_tokens + totals.output_tokens} tokens · $${totals.cost_usd.toFixed(4)} · as of ${facts.report_date}_`;
response.output = `${answer}\n\n---\n${footer}`;

if (ex) response.experiment = { run_name: ex.run_name, dataset_item_id: ex.dataset_item_id };

return [{ json: { response, langfuse_enabled: !!cfg.langfuse_enabled, langfuse_url: `${cfg.langfuse_host}/api/public/otel/v1/traces`, langfuse_body: otel, langfuse_score_url: `${cfg.langfuse_host}/api/public/scores`, langfuse_score_body: score } }];
