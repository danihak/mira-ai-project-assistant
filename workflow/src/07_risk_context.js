// Risk Context — risk register + DETERMINISTIC evidence links between task-board signals and register risks.
// v2 (after baseline run 1): the LLM previously linked the blocked security review (T024) to R02 Integration and
// cited vague "ongoing tasks" with no ID. Links and the evidence-based ranking are now computed here, in code;
// the agent may only use these links.
const ctx = $input.first().json;
const { facts, project, router } = ctx;
const SYSTEM = __PROMPT_RISK__;
let source;
if (router.project_ref === 'abcde') {
  const byId = Object.fromEntries(Object.values(facts.by_sprint).flatMap(s => s.tasks).map(t => [t.id, t]));
  const raw = Object.fromEntries(project.tasks.map(t => [t.task_id, t]));
  const signalOf = id => {
    if (facts.blocked.find(t => t.id === id)) return { type: 'Blocked', weight: 3, reason: facts.blocked.find(t => t.id === id).reason };
    if (facts.overdue.find(t => t.id === id)) return { type: 'Overdue', weight: 2, reason: facts.overdue.find(t => t.id === id).reason };
    if (facts.at_risk.find(t => t.id === id)) return { type: 'At risk', weight: 1, reason: facts.at_risk.find(t => t.id === id).reason };
    return null;
  };
  // Which task-board work relates to which register risk (keyword rules on task name / label / description)
  const RULES = {
    R01: t => /data/i.test(t.task_name) && !/legal|security|compliance/i.test(t.labels + ' ' + t.task_name),
    R02: t => /integrat|deploy|rollout/i.test(t.task_name),
    R03: t => /training/i.test(t.task_name),
    R04: t => /training|pilot|feedback/i.test(t.task_name),
    R05: t => /compliance|legal/i.test(t.labels + ' ' + t.task_name),
    R08: t => /monitoring|drift|retrain/i.test(t.task_name + ' ' + t.description),
    R09: t => /security/i.test(t.labels + ' ' + t.task_name),
    R10: t => /vendor|platform/i.test(t.task_name),
  };
  const PRIORITY = { High: 3, Medium: 2, Low: 1 };
  const evidence = project.risks.map(r => {
    const tasks = Object.values(raw).filter(t => RULES[r.risk_id] && RULES[r.risk_id](t) && t.status !== 'Done');
    const live = tasks.map(t => ({ id: t.task_id, name: t.task_name, status: t.status, due: t.due_date, priority: t.priority, signal: signalOf(t.task_id) }))
      .filter(x => x.signal);
    const planned = tasks.filter(t => !signalOf(t.task_id)).map(t => `${t.task_id} ${t.task_name} (${t.status}, due ${t.due_date})`);
    const score = live.reduce((a, x) => a + x.signal.weight * 10 + (PRIORITY[x.priority] || 0), 0);
    return {
      risk_id: r.risk_id, category: r.category,
      evidence_strength: live.length ? 'LIVE SIGNAL' : planned.length ? 'PLANNED WORK ONLY' : 'NO CURRENT SIGNAL',
      live_signals: live.map(x => `${x.id} ${x.name} - ${x.signal.reason.startsWith('Blocked') ? x.signal.reason : x.signal.type + ': ' + x.signal.reason}`),
      planned_related_tasks: planned,
      evidence_score: score,
    };
  });
  const STRENGTH = { 'LIVE SIGNAL': 2, 'PLANNED WORK ONLY': 1, 'NO CURRENT SIGNAL': 0 };
  const ranking = [...evidence].sort((a, b) => b.evidence_score - a.evidence_score || STRENGTH[b.evidence_strength] - STRENGTH[a.evidence_strength] || a.risk_id.localeCompare(b.risk_id))
    .map((e, i) => `${i + 1}. ${e.risk_id} (${e.evidence_strength}, score ${e.evidence_score})`);
  source = {
    project: project.name,
    description: project.description,
    report_date: facts.report_date,
    current_phase: facts.current_phase && `${facts.current_phase.phase}. ${facts.current_phase.name} (${facts.current_phase.start_date} to ${facts.current_phase.end_date})`,
    risk_register: project.risks,
    evidence_links: evidence,
    evidence_ranking: ranking,
    ranking_rule: 'Score = sum over linked live signals of (Blocked 30 / Overdue 20 / At risk 10) + task priority (High 3, Medium 2, Low 1). Ties: planned work before no signal, then risk ID.',
  };
} else {
  source = { project: 'User-described project', description: router.user_supplied_details, risk_register: 'Not provided', evidence_links: 'Not provided' };
}
const request = {
  model: ctx.config.specialist_model, temperature: 0.1,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nSOURCE DATA:\n${JSON.stringify(source, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Risk Assessor Agent', request, agent_started_ms: Date.now() } }];
