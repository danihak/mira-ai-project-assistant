// Risk Context — risk register + live delivery signals from the task board.
const ctx = $input.first().json;
const { facts, project, router } = ctx;
const SYSTEM = __PROMPT_RISK__;
let source;
if (router.project_ref === 'abcde') {
  const allTasks = Object.values(facts.by_sprint).flatMap(s => s.tasks);
  const pick = ids => allTasks.filter(t => ids.includes(t.id));
  const governanceIds = project.tasks.filter(t => /security|compliance/i.test(t.labels)).map(t => t.task_id);
  source = {
    project: project.name,
    description: project.description,
    risk_register: project.risks,
    delivery_signals: {
      report_date: facts.report_date,
      current_phase: facts.current_phase && `${facts.current_phase.phase}. ${facts.current_phase.name} (${facts.current_phase.start_date} to ${facts.current_phase.end_date})`,
      blocked: facts.blocked, overdue: facts.overdue, at_risk: facts.at_risk,
      security_and_compliance_tasks: pick(governanceIds),
      vendor_and_platform_tasks: allTasks.filter(t => /vendor|platform/i.test(t.name)),
      people_and_adoption_tasks: allTasks.filter(t => /training|pilot|feedback|stakeholder/i.test(t.name)),
      data_tasks: allTasks.filter(t => /data/i.test(t.name)),
      status_counts: facts.status_counts,
      data_notes: facts.data_notes,
    },
  };
} else {
  source = { project: 'User-described project', description: router.user_supplied_details, risk_register: 'Not provided', delivery_signals: 'Not provided' };
}
const request = {
  model: ctx.config.specialist_model, temperature: 0.2,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nSOURCE DATA:\n${JSON.stringify(source, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Risk Assessor Agent', request, agent_started_ms: Date.now() } }];
