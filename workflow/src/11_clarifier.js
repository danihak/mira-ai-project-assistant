// Clarifier (rule-based, no LLM) — when data is insufficient Mira asks, it never guesses.
// Deterministic by design: zero hallucination risk and zero token cost on vague inputs.
const ctx = $input.first().json;
const { router } = ctx;
const NEEDS = {
  plan: ['Project goal and scope (what is being built and why)', 'Key deliverables', 'Timeline: start date, duration or deadline', 'Team size and roles', 'Constraints: budget, technology, dependencies', 'Success criteria / KPIs'],
  risk: ['What the project is: domain, scope and goals', 'Timeline and current phase', 'Team, vendors and technologies involved', 'Known constraints (budget, compliance, integrations)', 'Any existing risk register or known issues'],
  status: ['Task board export (CSV, Trello or Jira) with task name, status, assignee, due date and sprint', 'Reporting period (which week or sprint)'],
  milestone: ['Project timeline with milestones and dates', 'Task board export with statuses and due dates'],
  stakeholder_update: ['Task board export for the sprint (task, status, owner, due date)', 'Audience (leadership, engineering or client)'],
};
const LABEL = { plan: 'a project plan', risk: 'a risk assessment', status: 'a status report', milestone: 'a milestone report', stakeholder_update: 'a stakeholder update' };
let answer;
if (router.intent === 'unsupported' || !ctx.message) {
  answer = [
    "I'm Mira, a project intelligence assistant. I can help with:",
    '- Project plans (phases, milestones, timeline)',
    '- Risk assessments and top risks',
    '- Weekly status reports and task counts',
    '- Blocked / at-risk tasks and upcoming milestones',
    '- Stakeholder update emails for a sprint',
    '',
    'Data currently loaded: the ABCDE Ltd. AI Adoption Project (description, timeline, risk register, task board).',
  ].join('\n');
} else {
  const isNoData = ['status', 'milestone', 'stakeholder_update'].includes(router.intent);
  const given = router.user_supplied_details ? `"${router.user_supplied_details}"` : 'no project details';
  answer = [
    isNoData
      ? `NO TASK DATA AVAILABLE - I can't produce ${LABEL[router.intent]} from ${given}. Reporting progress without task data would mean inventing task statuses and percentages.`
      : `INSUFFICIENT DETAIL - I can't generate ${LABEL[router.intent]} from ${given} without inventing scope, dates and people.`,
    '',
    'Please share:',
    ...NEEDS[router.intent].map(n => `- ${n}`),
    ...(router.guardrails.some(g => g.startsWith('Sprint')) ? ['', `Note: ${router.guardrails.join('; ')}.`] : []),
    '',
    'Or ask about the ABCDE Ltd. AI Adoption Project, which is already loaded.',
  ].join('\n');
}
return [{ json: { ...ctx, agent_name: 'Clarifier (rule-based)', rule_based_answer: answer, agent_started_ms: Date.now() } }];
