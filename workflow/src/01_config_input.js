// Config + Input — single place to change settings. Normalises the request from Webhook (or Slack/chat later).
const item = $input.first().json;
const body = item.body || {};
const query = item.query || {};
// Sources: Webhook (body.message), n8n Chat Trigger (item.chatInput / item.sessionId), or query string
const message = String(body.message || item.chatInput || body.chatInput || body.text || query.message || '').trim();
const channel = item.chatInput !== undefined ? 'chat' : 'webhook';

const config = {
  // "Today" for the project. The sample task board runs Apr–Aug 2026 and Sprint 3 is the active sprint,
  // so reports are generated as of Fri 24 Apr 2026 (end of timeline week 4). Change here, or pass "as_of_date" in the request.
  as_of_date: body.as_of_date || '2026-04-24',
  project_start: '2026-03-30',          // Monday of timeline week 1 (matches Sprint 1 due dates of 7–10 Apr)
  at_risk_days_in_progress: 7,          // In Progress task due within N days => at risk
  at_risk_days_todo: 14,                // To Do (not started) task due within N days => at risk
  milestone_window_days: 14,            // "upcoming" milestone window
  openai_base_url: 'https://api.openai.com/v1',
  router_model: 'gpt-4o-mini',
  specialist_model: 'gpt-4o-mini',
  // USD per 1M tokens (OpenAI list prices) — used for per-request cost reporting
  prices: {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4.1': { input: 2.00, output: 8.00 },
  },
  langfuse_enabled: false,              // set true after adding the Langfuse Basic Auth credential
  langfuse_host: 'https://cloud.langfuse.com',
};

return [{
  json: {
    config,
    message,
    test_id: body.test_id || null,
    session_id: body.session_id || item.sessionId || null,
    channel,
    trace_id: $execution.id ? `mira-${$execution.id}-${Date.now()}` : `mira-${Date.now()}`,
    started_at: new Date().toISOString(),
    started_ms: Date.now(),
  },
}];
