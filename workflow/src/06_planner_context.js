// Planner Context — selects only what the Planner needs (context minimisation = lower cost, less room to drift).
const ctx = $input.first().json;
const { facts, project, router } = ctx;
const SYSTEM = __PROMPT_PLANNER__;
let source;
if (router.project_ref === 'abcde') {
  source = {
    project: project.name,
    description: project.description,
    timeline_with_dates: facts.phases.map(({ phase, name, weeks, start_date, end_date, key_activities, milestones }) => ({ phase, name, weeks, start_date, end_date, key_activities, milestones })),
    task_list: Object.values(facts.by_sprint).flatMap(s => s.tasks).map(t => ({ id: t.id, name: t.name, status: t.status, assignee: t.assignee, sprint: t.sprint, due: t.due })),
    data_notes: facts.data_notes,
  };
} else {
  source = { project: 'User-described project', description: router.user_supplied_details, timeline_with_dates: 'Not provided', task_list: 'Not provided' };
}
const request = {
  model: ctx.config.specialist_model, temperature: 0.2,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nSOURCE DATA:\n${JSON.stringify(source, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Planner Agent', request, agent_started_ms: Date.now() } }];
