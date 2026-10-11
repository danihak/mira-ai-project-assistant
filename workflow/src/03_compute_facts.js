// Compute Facts — deterministic project analytics. Counting, filtering and date maths happen HERE, in code,
// so the LLM agents only format and explain numbers; they never have to calculate them (anti-hallucination design).
const t0 = Date.now();
const { config: cfg, project: p } = $input.first().json;
const DAY = 86400000;
const toDate = s => new Date(s + 'T00:00:00Z');
const fmt = d => d.toISOString().slice(0, 10);
const asOf = toDate(cfg.as_of_date);
const start = toDate(cfg.project_start);
const STATUSES = ['Done', 'In Progress', 'Blocked', 'To Do'];
const sprintNo = s => Number(String(s).replace(/\D/g, '')) || 0;

const tasks = p.tasks.map(t => ({
  id: t.task_id, name: t.task_name, status: t.status, assignee: t.assignee, priority: t.priority,
  sprint: t.sprint, due: t.due_date, label: t.labels, description: t.description,
  days_to_due: Math.round((toDate(t.due_date) - asOf) / DAY),
}));
const compact = t => ({ id: t.id, name: t.name, status: t.status, assignee: t.assignee, priority: t.priority, sprint: t.sprint, due: t.due, days_to_due: t.days_to_due });
const counts = arr => Object.fromEntries([...STATUSES.map(s => [s, arr.filter(t => t.status === s).length]), ['Total', arr.length]]);

// Status counts, whole project and per sprint
const status_counts = counts(tasks);
const sprints = [...new Set(tasks.map(t => t.sprint))].sort((a, b) => sprintNo(a) - sprintNo(b));
const by_sprint = Object.fromEntries(sprints.map(s => {
  const ts = tasks.filter(t => t.sprint === s);
  return [s, { counts: counts(ts), tasks: ts.map(compact) }];
}));

// Delivery signals
const blocked = tasks.filter(t => t.status === 'Blocked').map(t => ({ ...compact(t), reason: `Blocked: ${(t.description.split('BLOCKED:')[1] || t.description).trim()}` }));
const overdue = tasks.filter(t => t.status !== 'Done' && t.days_to_due < 0)
  .map(t => ({ ...compact(t), reason: `Overdue by ${-t.days_to_due} day(s), still ${t.status}` }));
const at_risk = tasks.filter(t => t.days_to_due >= 0 && (
  (t.status === 'In Progress' && t.days_to_due <= cfg.at_risk_days_in_progress) ||
  (t.status === 'To Do' && t.days_to_due <= cfg.at_risk_days_todo)))
  .map(t => ({ ...compact(t), reason: `Due in ${t.days_to_due} day(s), still ${t.status}` }));
const at_risk_rules = `Blocked = status Blocked; Overdue = not Done and due date before ${cfg.as_of_date}; At risk = In Progress and due within ${cfg.at_risk_days_in_progress} days, or To Do and due within ${cfg.at_risk_days_todo} days.`;

// Timeline -> dated phases and milestones (week 1 starts on project_start)
const phases = p.timeline.map(ph => {
  const s = new Date(start.getTime() + (ph.start_week - 1) * 7 * DAY);
  const e = new Date(start.getTime() + (ph.end_week * 7 - 1) * DAY);
  const schedule_status = e < asOf ? 'Past (scheduled end date passed)' : (s <= asOf ? 'Current' : 'Upcoming');
  return {
    phase: ph.phase, name: ph.phase_name, weeks: `${ph.start_week}-${ph.end_week}`, start_date: fmt(s), end_date: fmt(e),
    schedule_status, key_activities: ph.key_activities, milestones: ph.milestones_deliverables.split(';').map(m => m.trim()).filter(Boolean),
  };
});
const milestones = phases.flatMap(ph => ph.milestones.map(m => ({
  milestone: m, phase: `${ph.phase}. ${ph.name}`, due: ph.end_date, days_to_due: Math.round((toDate(ph.end_date) - asOf) / DAY),
})));
const upcoming_milestones = milestones.filter(m => m.days_to_due >= 0 && m.days_to_due <= cfg.milestone_window_days);
const next_after_window = milestones.filter(m => m.days_to_due > cfg.milestone_window_days).slice(0, 3);
const current_phase = phases.find(ph => ph.schedule_status === 'Current') || null;
const project_end = phases.length ? phases[phases.length - 1].end_date : null;

// Current sprint = sprint of the earliest open, non-overdue task
const open = tasks.filter(t => t.status !== 'Done' && t.days_to_due >= 0).sort((a, b) => a.days_to_due - b.days_to_due);
const current_sprint = open.length ? open[0].sprint : null;

// Rule-based health (documented so the LLM never "decides" it)
const health_reasons = [];
blocked.forEach(t => health_reasons.push(`${t.id} ${t.name} is Blocked (${t.priority} priority)`));
overdue.forEach(t => health_reasons.push(`${t.id} ${t.name} is overdue (due ${t.due})`));
if (at_risk.length) health_reasons.push(`${at_risk.length} task(s) at risk of missing due dates in the next ${cfg.at_risk_days_todo} days`);
const issues = blocked.length + overdue.length;
const health = issues >= 3 ? 'RED' : issues >= 1 ? 'AMBER' : 'GREEN';

// Data-quality notes surfaced to agents instead of silently "fixed"
const data_notes = [];
const lastDue = tasks.map(t => t.due).sort().pop();
if (project_end && lastDue < project_end) data_notes.push(`Task board ends ${lastDue}; timeline runs to ${project_end} (week 24). Board and timeline are not fully aligned.`);

const facts = {
  report_date: cfg.as_of_date,
  project_start: cfg.project_start,
  project_end,
  status_counts,
  percent_done: Math.round((status_counts.Done / status_counts.Total) * 100),
  current_sprint,
  current_phase,
  by_sprint,
  blocked, overdue, at_risk, at_risk_rules,
  phases, milestones, upcoming_milestones, next_after_window,
  health, health_reasons,
  data_notes,
  all_task_ids: tasks.map(t => t.id),
  all_risk_ids: p.risks.map(r => r.risk_id),
};

return [{ json: { ...$input.first().json, facts, facts_ms: Date.now() - t0 } }];
