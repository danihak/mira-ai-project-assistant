// Parse Route — reads the Orchestrator's JSON and applies deterministic guardrails on top of it.
const ctx = $('Build Router Request').first().json;
const resp = $input.first().json;
const raw = resp.choices?.[0]?.message?.content || '{}';
let r;
try { r = JSON.parse(raw); } catch (e) { r = { intent: 'unsupported', project_ref: 'none', sufficient: false, missing_info: ['Router returned invalid JSON'], reason: 'parse error' }; }

const INTENTS = ['plan', 'risk', 'status', 'milestone', 'stakeholder_update', 'unsupported'];
const intent = INTENTS.includes(r.intent) ? r.intent : 'unsupported';
const msg = ctx.message || '';
const sprintMatch = msg.match(/sprint\s*(\d+)/i);
const sprint = Number.isInteger(r.sprint) ? r.sprint : (sprintMatch ? Number(sprintMatch[1]) : null);
let project_ref = ['abcde', 'other', 'none'].includes(r.project_ref) ? r.project_ref : 'none';

// Guardrails (code wins over the model):
// 1. Empty message => clarify.  2. Data-dependent intents need loaded data.  3. "other" projects must be sufficient.
let route = intent;
const guardrails = [];
if (!msg) { route = 'clarify'; guardrails.push('empty request'); }
else if (intent === 'unsupported') { route = 'clarify'; guardrails.push('unsupported intent'); }
else if (project_ref !== 'abcde') {
  if (['status', 'milestone', 'stakeholder_update'].includes(intent)) {
    route = 'clarify'; guardrails.push('no task data supplied for a non-loaded project');
  } else if (r.sufficient !== true) {
    route = 'clarify'; guardrails.push('insufficient project detail');
  }
}
if (route === 'stakeholder_update' && sprint && !ctx.facts.by_sprint[`Sprint ${sprint}`]) {
  route = 'clarify'; guardrails.push(`Sprint ${sprint} not found on the task board`);
}

const usage = resp.usage || {};
const router = {
  intent, route, project_ref, sprint, audience: r.audience || null,
  user_supplied_details: r.user_supplied_details || '', sufficient: r.sufficient === true,
  missing_info: Array.isArray(r.missing_info) ? r.missing_info : [], reason: r.reason || '', guardrails,
};
const call = {
  agent: 'Orchestrator', model: resp.model || ctx.config.router_model,
  input_tokens: usage.prompt_tokens || 0, output_tokens: usage.completion_tokens || 0,
  latency_ms: Date.now() - ctx.router_started_ms, input: ctx.request.messages, output: raw,
  start_time: new Date(ctx.router_started_ms).toISOString(), end_time: new Date().toISOString(),
};
const { request, ...rest } = ctx;
return [{ json: { ...rest, router, calls: [call] } }];
