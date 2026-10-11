"""Builds workflow/mira_workflow.json from prompts/, data/ and workflow/src/*.js.
Run: python3 workflow/build_workflow.py   (from the repo root)
Single source of truth: edit a prompt or code file, rebuild, re-import into n8n."""
import json, uuid, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "workflow" / "src"
LOCAL_TEST = "--local-test" in sys.argv  # bakes in local credential ids + mock OpenAI URL for CI-style testing

def read(p): return (ROOT / p).read_text(encoding="utf-8")

prompts = {
    "__PROMPT_ORCHESTRATOR__": read("prompts/01_orchestrator.md"),
    "__PROMPT_PLANNER__": read("prompts/02_planner.md"),
    "__PROMPT_RISK__": read("prompts/03_risk_assessor.md"),
    "__PROMPT_STATUS__": read("prompts/04_status_reporter.md"),
    "__PROMPT_MILESTONE__": read("prompts/05_milestone_tracker.md"),
    "__PROMPT_STAKEHOLDER__": read("prompts/06_stakeholder_update.md"),
}
files = {
    "description": read("data/project_description.txt"),
    "timeline": read("data/project_timeline.csv"),
    "risks": read("data/project_risks.csv"),
    "tasks": read("data/sample_task_board.csv"),
}

def code(fname):
    s = (SRC / fname).read_text(encoding="utf-8")
    for k, v in prompts.items():
        s = s.replace(k, json.dumps(v))
    s = s.replace("__FILES__", json.dumps(files, indent=1))
    if LOCAL_TEST:
        s = s.replace("openai_base_url: 'https://api.openai.com/v1'", "openai_base_url: 'http://127.0.0.1:9911/v1'")
        if "--langfuse" in sys.argv:
            s = s.replace("langfuse_enabled: false", "langfuse_enabled: true").replace("langfuse_host: 'https://cloud.langfuse.com'", "langfuse_host: 'http://127.0.0.1:9911'")
    return s

nodes, connections = [], {}

def node(name, ntype, version, pos, params, **extra):
    n = {"parameters": params, "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "mira-" + name)), "name": name,
         "type": ntype, "typeVersion": version, "position": list(pos)}
    n.update(extra)
    nodes.append(n)
    return name

def code_node(name, fname, pos):
    return node(name, "n8n-nodes-base.code", 2, pos, {"jsCode": code(fname)})

OPENAI_CRED = {"openAiApi": {"id": "miraOpenAiLocal", "name": "OpenAI account"}} if LOCAL_TEST else None

def llm_node(name, pos):
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST",
        "url": "={{ $('Config + Input').first().json.config.openai_base_url }}/chat/completions",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "openAiApi",
        "sendBody": True, "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.request) }}",
        "options": {"timeout": 120000},
    }, **({"credentials": OPENAI_CRED} if OPENAI_CRED else {}), retryOnFail=True, maxTries=3, waitBetweenTries=2000)

def connect(a, b, out_index=0):
    connections.setdefault(a, {"main": []})
    main = connections[a]["main"]
    while len(main) <= out_index:
        main.append([])
    main[out_index].append({"node": b, "type": "main", "index": 0})

def sticky(name, text, pos, w, h, color):
    node(name, "n8n-nodes-base.stickyNote", 1, pos, {"content": text, "width": w, "height": h, "color": color})

# ---- canvas -------------------------------------------------------------------------------------------
Y = 460
sticky("Note: Input", "## 1. Input & config\nPOST /webhook/mira with `{\"message\": \"...\"}`.\nAll settings (as-of date, models, prices, Langfuse) live in **Config + Input**.", (-40, 260), 460, 420, 7)
sticky("Note: Data", "## 2. Deterministic data layer\nProject files are parsed and every count, date and risk flag is computed **in code**. LLMs never do arithmetic.", (440, 260), 460, 420, 5)
sticky("Note: Router", "## 3. Orchestrator (Router pattern)\nCheap model classifies intent + checks if there is enough data. Code guardrails override the model.", (920, 260), 880, 420, 6)
sticky("Note: Agents", "## 4. Specialist agents\nEach gets only the data it needs. Vague inputs go to a rule-based Clarifier - no LLM, no guessing.", (1840, -100), 520, 1240, 4)
sticky("Note: Eval", "## 5. Evaluation & observability\nGrounding Check verifies every task ID, risk ID and date against the source data, then sends an OpenTelemetry trace + a grounded score to Langfuse.", (2400, 260), 1180, 420, 3)

wh = node("Webhook", "n8n-nodes-base.webhook", 2, (0, Y),
          {"httpMethod": "POST", "path": "mira", "responseMode": "responseNode", "options": {}},
          webhookId=str(uuid.uuid5(uuid.NAMESPACE_DNS, "mira-webhook")))
c1 = code_node("Config + Input", "01_config_input.js", (220, Y))
c2 = code_node("Load Project Data", "02_load_project_data.js", (480, Y))
c3 = code_node("Compute Facts", "03_compute_facts.js", (700, Y))
c4 = code_node("Build Router Request", "04_build_router_request.js", (960, Y))
orch = llm_node("Orchestrator Agent", (1180, Y))
c5 = code_node("Parse Route", "05_parse_route.js", (1400, Y))

ROUTES = ["plan", "risk", "status", "milestone", "stakeholder_update", "clarify"]
rules = [{
    "conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
        "conditions": [{"id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "rule-" + r)), "leftValue": "={{ $json.router.route }}",
                        "rightValue": r, "operator": {"type": "string", "operation": "equals"}}],
        "combinator": "and"},
    "renameOutput": True, "outputKey": r} for r in ROUTES]
sw = node("Route by Intent", "n8n-nodes-base.switch", 3.2, (1600, Y), {"rules": {"values": rules}, "options": {}})

branches = [
    ("Planner Context", "06_planner_context.js", "Planner Agent"),
    ("Risk Context", "07_risk_context.js", "Risk Assessor Agent"),
    ("Status Context", "08_status_context.js", "Status Reporter Agent"),
    ("Milestone Context", "09_milestone_context.js", "Milestone Tracker Agent"),
    ("Stakeholder Context", "10_stakeholder_context.js", "Stakeholder Update Agent"),
]
pkg = code_node("Package Response", "12_package_response.js", (2460, Y))
for i, (ctxname, f, agent) in enumerate(branches):
    y = 0 + i * 190
    code_node(ctxname, f, (1900, y))
    llm_node(agent, (2140, y))
    connect(sw, ctxname, i)
    connect(ctxname, agent)
    connect(agent, pkg)
clar = code_node("Clarifier (rule-based)", "11_clarifier.js", (2020, 5 * 190))
connect(sw, clar, 5)
connect(clar, pkg)

gc = code_node("Grounding Check", "13_grounding_check.js", (2680, Y))
iff = node("Langfuse Enabled?", "n8n-nodes-base.if", 2.2, (2900, Y), {
    "conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
                   "conditions": [{"id": "lf-enabled", "leftValue": "={{ $json.langfuse_enabled }}", "rightValue": "",
                                    "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
                   "combinator": "and"}, "options": {}})
LF_CRED = {"credentials": {"httpBasicAuth": {"id": "miraLangfuseLocal", "name": "Langfuse"}}} if "--langfuse" in sys.argv else {}
lf = node("Log to Langfuse", "n8n-nodes-base.httpRequest", 4.2, (3120, Y - 110), {
    "method": "POST", "url": "={{ $json.langfuse_url }}",
    "authentication": "genericCredentialType", "genericAuthType": "httpBasicAuth",
    "sendHeaders": True, "headerParameters": {"parameters": [{"name": "x-langfuse-ingestion-version", "value": "4"}]},
    "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.langfuse_body) }}",
    "options": {"timeout": 20000}},
    onError="continueRegularOutput", **({"credentials": {"httpBasicAuth": {"id": "miraLangfuseLocal", "name": "Langfuse"}}} if "--langfuse" in sys.argv else {}))  # attach a Basic Auth credential (public key / secret key) when enabling Langfuse
lfs = node("Log Score to Langfuse", "n8n-nodes-base.httpRequest", 4.2, (3340, Y - 110), {
    "method": "POST", "url": "={{ $('Grounding Check').first().json.langfuse_score_url }}",
    "authentication": "genericCredentialType", "genericAuthType": "httpBasicAuth",
    "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($('Grounding Check').first().json.langfuse_score_body) }}",
    "options": {"timeout": 20000}}, onError="continueRegularOutput", **LF_CRED)
resp = node("Respond to Webhook", "n8n-nodes-base.respondToWebhook", 1.1, (3440, Y + 80), {
    "respondWith": "json",
    "responseBody": "={{ JSON.stringify($('Grounding Check').first().json.response) }}",
    "options": {}})

for a, b in [(wh, c1), (c1, c2), (c2, c3), (c3, c4), (c4, orch), (orch, c5), (c5, sw), (pkg, gc), (gc, iff), (lf, lfs), (lfs, resp)]:
    connect(a, b)
connect(iff, lf, 0)
connect(iff, resp, 1)

wf = {
    "name": "Mira - AI Project Intelligence Assistant",
    "nodes": nodes, "connections": connections,
    "settings": {"executionOrder": "v1"},
    "pinData": {}, "active": False,
    "meta": {"templateCredsSetupCompleted": False},
    "tags": [],
}
if LOCAL_TEST:
    wf["id"] = "miraLocalTest01"
out = ROOT / "workflow" / ("mira_workflow.local-test.json" if LOCAL_TEST else "mira_workflow.json")
out.write_text(json.dumps(wf, indent=2), encoding="utf-8")
print("wrote", out, len(nodes), "nodes")
