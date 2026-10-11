// Milestone Context — dated timeline + delivery alerts for the Milestone Tracker (extended capability).
const ctx = $input.first().json;
const { facts } = ctx;
const SYSTEM = __PROMPT_MILESTONE__;
const FACTS = {
  report_date: facts.report_date,
  project: ctx.project.name,
  current_phase: facts.current_phase,
  phase_schedule: facts.phases.map(({ phase, name, weeks, start_date, end_date, schedule_status }) => ({ phase, name, weeks, start_date, end_date, schedule_status })),
  alert_window_days: ctx.config.milestone_window_days,
  upcoming_milestones_in_window: facts.upcoming_milestones,
  next_milestones_after_window: facts.next_after_window,
  blocked: facts.blocked, overdue: facts.overdue, at_risk: facts.at_risk,
  at_risk_rules: facts.at_risk_rules,
  data_notes: facts.data_notes,
};
const request = {
  model: ctx.config.specialist_model, temperature: 0,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `USER REQUEST: ${ctx.message}\n\nFACTS:\n${JSON.stringify(FACTS, null, 1)}` },
  ],
};
return [{ json: { ...ctx, agent_name: 'Milestone Tracker Agent', request, agent_started_ms: Date.now() } }];
