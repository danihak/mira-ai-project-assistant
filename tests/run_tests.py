"""Mira baseline test runner.

Sends the 12 baseline inputs to the Mira webhook, checks each answer against the "Expected Output Must Contain"
criteria from the problem statement, and writes:
  tests/results/results.json          raw responses (answer, route, grounding flags, tokens, cost, latency)
  tests/results/baseline_results.md   the documentation table the rubric asks for

Usage (standard library only, no pip installs):
  python3 tests/run_tests.py --url https://<your-n8n>/webhook/mira
  python3 tests/run_tests.py --url http://localhost:5678/webhook/mira --only T5 T10
"""
import argparse, json, pathlib, re, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "results"

TESTS = [
    ("T1", "Generate a project plan for the AI Adoption Project at ABCDE Ltd. Use the provided project description.", "Plan (detailed)",
     "Phases, milestones, timeline; grounded in description; no invented goals"),
    ("T2", 'Generate a project plan for: "We want to build a chatbot."', "Plan (vague)",
     "Flags insufficient detail; asks for scope, timeline, team size; no full plan"),
    ("T3", "Generate a risk assessment for the AI Adoption Project at ABCDE Ltd. Use the provided project description.", "Risk (detailed)",
     "Categorised risks relevant to logistics/AI; no generic risks"),
    ("T4", 'Generate a risk assessment for: "New project starting soon."', "Risk (vague)",
     "Flags insufficient; asks for project details; no invented risks"),
    ("T5", "Generate a weekly status report using the sample task board data for Sprint 3.", "Status (data)",
     "Tasks by status; actual Sprint 3 task names; no invented tasks"),
    ("T6", 'Generate a weekly status report for: "Things are going fine."', "Status (no data)",
     "States no task data available; no fabricated statuses or percentages"),
    ("T7", "What are the top 3 risks for the ABCDE Ltd project based on the risk data?", "Risk analysis",
     "References actual risks from the risk CSV; none invented"),
    ("T8", "Which tasks are blocked or at risk of missing their deadline based on the task board?", "Tracking",
     "Identifies T024 (Blocked); checks due dates against progress"),
    ("T9", "Generate a project plan for a 2-week project with no details provided.", "Plan (edge)",
     "Asks for scope, goals, deliverables; no plan from a duration alone"),
    ("T10", "Summarize the current project status: how many tasks are done, in progress, and to do?", "Status summary",
     "Counts match the task board CSV"),
    ("T11", "What milestones are coming up in the next 2 weeks based on the timeline?", "Timeline",
     "Actual milestones from project_timeline.csv; none invented"),
    ("T12", "Generate a stakeholder update email summarizing Sprint 2 progress.", "Comms",
     "References Sprint 2 tasks; professional; no Sprint 3+ tasks"),
]

SPRINT3 = {"T007": "Shortlist AI use cases", "T008": "Define success criteria for each use case",
           "T009": "Vendor evaluation for ML platform", "T025": "Legal review of data usage"}
SPRINT2 = {"T004": "Audit existing data infrastructure", "T005": "Map current logistics workflows",
           "T006": "Identify data gaps and quality issues"}
LATER_SPRINT_NAMES = ["Shortlist AI use cases", "Define success criteria", "Vendor evaluation", "Collect historical demand data",
                      "Design demand forecasting", "Security review", "Legal review"]
TIMELINE_MILESTONES = ["Project charter signed off", "Team structure finalized", "Current systems audit report", "Gap analysis report",
                       "Final list of prioritized use cases", "Working prototype models", "Data pipelines established", "Pilot results report",
                       "User feedback and performance metrics", "Updated models", "Full production rollout", "Training sessions completed",
                       "Project closure report", "Recommendations for future scaling"]


def has(ans, *words):
    return [w for w in words if w.lower() not in ans.lower()]


def mentions(ans, task_id, name):
    return task_id in ans or name.lower() in ans.lower()


def count_near(ans, label, n):
    """True if number n appears within ~25 chars of the status label (either order), e.g. 'Done: 5', '5 tasks done', '| Done | 5 |'."""
    pat = rf"{re.escape(label)}[^0-9\n]{{0,25}}\b{n}\b|\b{n}\b[^0-9\n]{{0,25}}{re.escape(label)}"
    return re.search(pat, ans, re.I) is not None


def check(tid, r):
    """Returns (list of passed checks, list of failed checks)."""
    a, route, g = r.get("answer", ""), r.get("route"), r.get("grounding", {})
    ok, bad = [], []
    def need(cond, label):
        (ok if cond else bad).append(label)
    grounded = g.get("passed", False)
    if tid in ("T2", "T4", "T9"):
        need(route == "clarify", "routed to Clarifier (no plan/risks generated)")
        need("INSUFFICIENT" in a.upper(), "flags insufficient detail")
        if tid in ("T2", "T9"):
            need(not has(a, "scope", "timeline", "team"), "asks for scope, timeline, team")
        if tid == "T9":
            need(not has(a, "deliverables"), "asks for deliverables")
        if tid == "T4":
            need(not has(a, "domain", "scope"), "asks for project details")
    elif tid == "T6":
        need(route == "clarify", "routed to Clarifier")
        need("NO TASK DATA" in a.upper(), "states no task data available")
        need("%" not in a, "no fabricated percentages")
    elif tid == "T1":
        need(route == "plan", "routed to Planner")
        need(not has(a, "phase", "milestone"), "has phases and milestones")
        need(sum(m.lower() in a.lower() for m in TIMELINE_MILESTONES) >= 10, ">=10 timeline milestones present")
        need(not has(a, "15%", "10%"), "uses stated goals (15% delays, 10% cost)")
        need(grounded, "grounding check passed")
    elif tid == "T3":
        need(route == "risk", "routed to Risk Assessor")
        need(len(set(re.findall(r"\bR(?:0[1-9]|10)\b", a))) >= 8, ">=8 register risks R01-R10 covered")
        need(not has(a, "data", "integration", "security"), "logistics/AI-specific categories")
        need(grounded, "grounding check passed")
    elif tid == "T5":
        need(route == "status", "routed to Status Reporter")
        need(all(mentions(a, k, v) for k, v in SPRINT3.items()), "all 4 Sprint 3 tasks named")
        need(grounded, "grounding check passed (no invented / out-of-scope tasks)")
    elif tid == "T7":
        need(route == "risk", "routed to Risk Assessor")
        need(len(set(re.findall(r"\bR(?:0[1-9]|10)\b", a))) >= 3, "cites >=3 register risk IDs")
        need(grounded, "grounding check passed")
    elif tid == "T8":
        need(route == "milestone", "routed to Milestone Tracker")
        need("T024" in a, "identifies T024 (Blocked)")
        need("T006" in a, "flags overdue T006")
        need(grounded, "grounding check passed")
    elif tid == "T10":
        need(route == "status", "routed to Status Reporter")
        for label, n in (("done", 5), ("in progress", 3), ("to do", 16), ("blocked", 1)):
            need(count_near(a, label, n), f"{label} = {n}")
        need(grounded, "grounding check passed")
    elif tid == "T11":
        need(route == "milestone", "routed to Milestone Tracker")
        need(not has(a, "Current systems audit report", "Gap analysis report"), "names the 2 milestones due in window")
        need("2026-04-26" in a, "correct due date 2026-04-26")
        need(grounded, "grounding check passed (no invented dates)")
    elif tid == "T12":
        need(route == "stakeholder_update", "routed to Stakeholder Update agent")
        need(all(mentions(a, k, v) for k, v in SPRINT2.items()), "all 3 Sprint 2 tasks referenced")
        need(not any(n.lower() in a.lower() for n in LATER_SPRINT_NAMES), "no Sprint 3+ tasks mentioned")
        need("subject" in a.lower(), "email format (subject line)")
        need(grounded, "grounding check passed")
    return ok, bad


def call(url, tid, message, timeout):
    body = json.dumps({"message": message, "test_id": tid}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    t = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode())
    data["_wall_ms"] = int((time.time() - t) * 1000)
    return data


def md_escape(s):
    return s.replace("|", "\\|")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", help="Mira webhook URL, e.g. http://localhost:5678/webhook/mira")
    ap.add_argument("--from-json", help="score saved responses (results.json) instead of calling the webhook")
    ap.add_argument("--out", default="baseline_results.md", help="report file name inside tests/results/")
    ap.add_argument("--title", default="Mira - Baseline Test Results")
    ap.add_argument("--only", nargs="*", help="run a subset, e.g. --only T5 T10")
    ap.add_argument("--timeout", type=int, default=180)
    args = ap.parse_args()
    OUT.mkdir(exist_ok=True)

    rows, raw = [], {}
    saved = json.loads(pathlib.Path(args.from_json).read_text()) if args.from_json else None
    if not saved and not args.url:
        ap.error("give --url or --from-json")
    for tid, msg, ttype, expected in TESTS:
        if args.only and tid not in args.only:
            continue
        print(f"{tid} ... ", end="", flush=True)
        try:
            r = saved[tid] if saved else call(args.url, tid, msg, args.timeout)
        except Exception as e:  # noqa
            r = {"answer": f"ERROR: {e}", "route": None, "grounding": {"passed": False, "flags": [str(e)]}, "totals": {}}
        ok, bad = check(tid, r)
        status = "PASS" if not bad else "FAIL"
        print(status, "|", r.get("route"), "|", (r.get("totals") or {}).get("cost_usd"))
        raw[tid] = r
        rows.append((tid, msg, ttype, expected, r, ok, bad, status))

    if not saved:
        (OUT / "results.json").write_text(json.dumps(raw, indent=2), encoding="utf-8")

    passed = sum(1 for x in rows if x[7] == "PASS")
    tot_cost = sum((x[4].get("totals") or {}).get("cost_usd", 0) or 0 for x in rows)
    lines = [f"# {args.title}", "",
             f"Run: {time.strftime('%Y-%m-%d %H:%M')} | Report date used by Mira (as-of): {next((x[4].get('as_of_date') for x in rows if x[4].get('as_of_date')), 'n/a')}",
             f"**Result: {passed}/{len(rows)} passed** | Total LLM cost for the run: ${tot_cost:.4f}", "",
             "## Summary", "",
             "| Test | Type | Route | Auto checks | Grounding check | Tokens in/out | Cost (USD) | Latency (ms) | Result |",
             "|---|---|---|---|---|---|---|---|---|"]
    for tid, msg, ttype, expected, r, ok, bad, status in rows:
        t = r.get("totals") or {}
        g = r.get("grounding") or {}
        lines.append(f"| {tid} | {ttype} | {r.get('route')} | {len(ok)}/{len(ok) + len(bad)} | {'pass' if g.get('passed') else 'FLAGS: ' + md_escape('; '.join(g.get('flags', [])))} | "
                     f"{t.get('input_tokens', 0)}/{t.get('output_tokens', 0)} | {t.get('cost_usd', 0)} | {t.get('latency_ms', r.get('_wall_ms', ''))} | **{status}** |")
    lines += ["", "## Detailed results", ""]
    for tid, msg, ttype, expected, r, ok, bad, status in rows:
        g = r.get("grounding") or {}
        halluc = "No (automatic grounding check passed)" if g.get("passed") else "Yes / review: " + "; ".join(g.get("flags", []))
        lines += [f"### {tid} - {ttype}", "",
                  "| Field | Value |", "|---|---|",
                  f"| Test ID | {tid} |",
                  f"| Input | {md_escape(msg)} |",
                  f"| Expected | {md_escape(expected)} |",
                  f"| Route taken | {r.get('route')} (router reason: {md_escape(str(r.get('router_reason', '')))}) |",
                  f"| Expected keywords present? | Yes: {md_escape('; '.join(ok)) or '-'}. Missing: {md_escape('; '.join(bad)) or 'none'} |",
                  f"| Hallucination detected? | {md_escape(halluc)} - manual review: ____ |",
                  f"| Pass/Fail | **{status}** |", "",
                  "<details><summary>Full output</summary>", "", "```text", r.get("answer", ""), "```", "", "</details>", ""]
    (OUT / args.out).write_text("\n".join(lines), encoding="utf-8")
    print(f"\n{passed}/{len(rows)} passed. Wrote {OUT / args.out}")


if __name__ == "__main__":
    main()
