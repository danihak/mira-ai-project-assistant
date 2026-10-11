// Stakeholder Context — ONLY the requested sprint's tasks are passed, so other sprints cannot leak into the email.
const ctx = $input.first().json;
const { facts, router } = ctx;
const SYSTEM = __PROMPT_STAKEHOLDER__;
const sprintKey = router.sprint ? `Sprint ${router.sprint}` : facts.current_sprint;
const sp = facts.by_sprint[sprintKey] || { counts: { Total: 0 }, tasks: [] };
const FACTS = {
  project: ctx.project.name,
  report_date: facts.report_date,
  sprint: sprintKey,
  audience: router.audience || 'leadership',
  sprint_counts: sp.counts,
  sprint_tasks: sp.tasks.map(t => ({ ...t, overdue: t.status !== 'Done' && t.days_to_due < 0 })),
};
const request = {
  model: ctx.config.specialist_model, temperature: 0.3,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nFACTS:\n${JSON.stringify(FACTS, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Stakeholder Update Agent', scope_task_ids: sp.tasks.map(t => t.id), request, agent_started_ms: Date.now() } }];
