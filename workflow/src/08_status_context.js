// Status Context — pre-computed counts and task lists for the requested scope (a sprint, or the whole project).
const ctx = $input.first().json;
const { facts, router } = ctx;
const SYSTEM = __PROMPT_STATUS__;
const allTasks = Object.values(facts.by_sprint).flatMap(s => s.tasks);
const byStatus = list => Object.fromEntries(['Done', 'In Progress', 'Blocked', 'To Do'].map(s => [s, list.filter(t => t.status === s)]));
const sprintKey = router.sprint ? `Sprint ${router.sprint}` : null;
let scopeFacts;
if (sprintKey && facts.by_sprint[sprintKey]) {
  const sp = facts.by_sprint[sprintKey];
  scopeFacts = {
    scope: sprintKey,
    scope_counts: sp.counts,
    scope_tasks_by_status: byStatus(sp.tasks),
    carry_over_from_earlier_sprints: facts.overdue.filter(t => Number(t.sprint.replace(/\D/g, '')) < router.sprint),
    project_counts: facts.status_counts,
  };
} else if (sprintKey) {
  scopeFacts = { scope: sprintKey, scope_counts: { Total: 0 }, scope_tasks_by_status: {}, note: `${sprintKey} does not exist on the task board` };
} else {
  scopeFacts = {
    scope: 'Whole project',
    scope_counts: facts.status_counts,
    percent_done: facts.percent_done,
    scope_tasks_by_status: byStatus(allTasks),
    current_sprint: facts.current_sprint,
  };
}
const FACTS = {
  report_date: facts.report_date,
  project: ctx.project.name,
  ...scopeFacts,
  overdue: facts.overdue, blocked: facts.blocked, at_risk: facts.at_risk,
  upcoming_milestones_next_14_days: facts.upcoming_milestones,
  health: facts.health, health_reasons: facts.health_reasons,
};
const request = {
  model: ctx.config.specialist_model, temperature: 0,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nFACTS:\n${JSON.stringify(FACTS, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Status Reporter Agent', scope_task_ids: sprintKey ? (facts.by_sprint[sprintKey]?.tasks || []).map(t => t.id) : allTasks.map(t => t.id), request, agent_started_ms: Date.now() } }];
