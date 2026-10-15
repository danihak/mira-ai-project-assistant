// Offline regression test for the Grounding Check evaluator (no n8n, no API key). Node 18+.
//   node tests/test_grounding_check.mjs
// 1) Injects wrong counts, wrong % complete, wrong health and wrong task statuses -> each must be flagged.
// 2) Re-checks every real answer saved from the two live runs -> the v3 checks must add no false positives.
// It runs the exact Code-node source from workflow/mira_workflow.json (rebuild it first after editing src/).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'workflow/mira_workflow.json'), 'utf8'));
const codeOf = n => wf.nodes.find(x => x.name === n).parameters.jsCode;
const run = async (name, input) => (await new Function('$input', '$execution', `return (async () => { ${codeOf(name)} })();`)(
  { first: () => ({ json: input }), all: () => [{ json: input }] }, { id: 'test' }))[0].json;

let base = await run('Config + Input', { body: { message: 'test' } });
base = await run('Compute Facts', await run('Load Project Data', base));
const f = base.facts;
const check = async (route, answer, sprint = null, scope = null) => {
  const now = new Date().toISOString();
  const ctx = { ...base, answer, ...(scope ? { scope_task_ids: scope } : {}), router: { route, project_ref: 'abcde', sprint },
    calls: [{ agent: 'Test', model: 'gpt-4o-mini', input: [{ role: 'user', content: '' }], output: answer, input_tokens: 0, output_tokens: 0, latency_ms: 0, start_time: now, end_time: now }] };
  return (await run('Grounding Check', ctx)).response.grounding;
};

const alerts = [...f.blocked, ...f.overdue, ...f.at_risk].map(t => `${t.id} ${t.name}`).join(', ');
const cases = [
  ['correct counts, health and alerts', `5 Done, 3 In Progress, 1 Blocked, 16 To Do. Health: AMBER, 20% complete. Alerts: ${alerts}.`, 0],
  ['wrong task counts', `Status: 9 tasks Done and 4 Blocked. Alerts: ${alerts}.`, 2],
  ['wrong count table', `| Status | Count |\n|---|---|\n| Done | 7 |\n| Blocked | 1 |\n\nAlerts: ${alerts}.`, 1],
  ['wrong % complete', `The project is 80% complete. Alerts: ${alerts}.`, 1],
  ['wrong health', `Overall health is GREEN. Alerts: ${alerts}.`, 1],
  ['blocked task called Done', `T024 Security review of AI infrastructure is Done. Alerts: ${alerts}.`, 1],
  ['overdue task called on track', `T006 is on track. Alerts: ${alerts}.`, 1],
  ['To Do task called overdue', `T009 is overdue. Alerts: ${alerts}.`, 1],
];
let fail = 0;
for (const [name, answer, want] of cases) {
  const g = await check('milestone', answer);
  const ok = want === 0 ? g.passed : g.flags.length === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${g.flags.length} flag(s)${g.flags.length ? ' - ' + g.flags.join(' | ') : ''}`);
}
// No false positives on the 12 real answers from the final live run (all passed grounding there)
const saved = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/results/run2_results.json'), 'utf8'));
for (const [id, x] of Object.entries(saved)) {
  if (x.project_ref !== 'abcde') continue;
  const key = x.sprint ? `Sprint ${x.sprint}` : null;
  const scope = key && (x.route === 'stakeholder_update' || x.route === 'status') ? f.by_sprint[key].tasks.map(t => t.id) : null;
  const g = await check(x.route, x.answer, x.sprint, scope);
  if (!g.passed) fail++;
  console.log(`${g.passed ? 'PASS' : 'FAIL'}  real answer ${id} (${x.route}) still grounded${g.passed ? '' : ': ' + g.flags.join(' | ')}`);
}
console.log(fail ? `\n${fail} check(s) failed` : '\nAll grounding checks passed');
process.exit(fail ? 1 : 0);
