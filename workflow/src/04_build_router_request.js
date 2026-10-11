// Build Router Request — prepares the Orchestrator Agent call (cheap model, temperature 0, JSON mode).
const ctx = $input.first().json;
const SYSTEM = __PROMPT_ORCHESTRATOR__;
const request = {
  model: ctx.config.router_model,
  temperature: 0,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `REQUEST: ${ctx.message || '(empty)'}` },
  ],
};
return [{ json: { ...ctx, request, router_started_ms: Date.now() } }];
