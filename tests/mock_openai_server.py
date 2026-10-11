"""Offline mock of the OpenAI Chat Completions API - for plumbing tests only (no real LLM).
Lets you test the whole n8n workflow (routing, code nodes, grounding check, response) without spending tokens.

  python3 tests/mock_openai_server.py            # listens on http://127.0.0.1:9911/v1/chat/completions
  then set openai_base_url = 'http://127.0.0.1:9911/v1' in the Config + Input node.

Router: keyword rules that mimic a well-behaved model. Specialists: echo the grounded input back.
Put "[inject-hallucination]" in a request to make the specialist cite a fake task/risk/date and an
out-of-scope task - the Grounding Check node must flag it.
"""
import json, re
from http.server import BaseHTTPRequestHandler, HTTPServer


def route(msg):
    m = msg.lower()
    if "plan" in m: intent = "plan"
    elif "stakeholder" in m or "email" in m: intent = "stakeholder_update"
    elif re.search(r"blocked|milestone|deadline", m): intent = "milestone"
    elif "risk" in m: intent = "risk"
    elif re.search(r"status|how many|done", m): intent = "status"
    else: intent = "unsupported"
    ref = "abcde" if re.search(r"abcde|task board|timeline|sprint|risk data|current project", m) else ("other" if re.search(r'"|2-week', m) else "none")
    sp = re.search(r"sprint (\d+)", m)
    quoted = re.search(r'"([^"]+)"', msg)
    return {"intent": intent, "project_ref": ref, "sprint": int(sp.group(1)) if sp else None, "audience": None,
            "user_supplied_details": quoted.group(1) if quoted else "", "sufficient": ref == "abcde",
            "missing_info": [] if ref == "abcde" else ["scope", "timeline", "team"], "reason": "mock router"}


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path.endswith("/api/public/ingestion"):  # mock Langfuse ingestion endpoint
            with open("mock_langfuse_last_batch.json", "w") as f:
                json.dump({"auth": self.headers.get("Authorization", ""), "body": req}, f, indent=1)
            out = json.dumps({"successes": [{"id": e["id"], "status": 201} for e in req.get("batch", [])], "errors": []}).encode()
            self.send_response(207); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(out))); self.end_headers()
            self.wfile.write(out); return
        system, user = req["messages"][0]["content"], req["messages"][1]["content"]
        if "Orchestrator" in system:
            content = json.dumps(route(user.replace("REQUEST: ", "", 1)))
        else:
            content = "[MOCK - offline plumbing test, no LLM]\n" + user
            if "[inject-hallucination]" in user:
                content += "\nAlso see T099, R13, due 2026-12-01, and T010 Collect historical demand data."
        body = {"id": "mock", "object": "chat.completion", "model": req.get("model", "mock") + "-mock",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": sum(len(m["content"]) for m in req["messages"]) // 4, "completion_tokens": len(content) // 4}}
        out = json.dumps(body).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(out))); self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a): pass


if __name__ == "__main__":
    print("Mock OpenAI on http://127.0.0.1:9911/v1")
    HTTPServer(("127.0.0.1", 9911), H).serve_forever()
