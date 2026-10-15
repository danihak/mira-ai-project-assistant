# Q4 — Reflection and Next Steps

**Author:** Danish

> Based on two live runs of the 12-input baseline on n8n Cloud with gpt-4o-mini (`tests/results/`).

## 1. What the traces showed
- **The biggest risk was in the data, not the model.** The brief describes the task board as "3 Done … the rest To Do", but the CSV has 5 Done, 3 In Progress, 1 Blocked and 16 To Do. Any design that lets the LLM count, or that prompts it with the brief's description, fails T10. Moving all counting and date maths into the *Compute Facts* code node removed this whole class of error.
- **Routing ambiguity is a real failure mode.** "Which tasks are … *at risk* of missing their deadline" looks like a *risk* request to a classifier. I added an explicit disambiguation rule (task delivery = milestone; risk register = risk) and re-ran the suite to confirm the fix.
- **Hidden edge case.** T006 (Sprint 2, due 21 Apr) is still In Progress on the report date, so it is overdue. The correct T8 answer contains two items, not just the deliberately blocked T024, and T006 is the honest "carry-over" in the Sprint 2 email.
- **Vague inputs cost almost nothing.** Because vague requests go to a rule-based Clarifier, T2, T4, T6 and T9 cost about $0.00015 each (router only) and cannot hallucinate. An LLM that "tries to help" on vague input produces longer, more expensive and invented output.
- **Run 1: 11/12; Run 2: 12/12.** All 12 requests were routed correctly in both runs, and all four vague inputs were refused, each costing $0.00017.
- **Failure 1, Milestone Tracker (T8):** it reported "4 at risk" but listed 3, silently dropping T009, and used task names without IDs. The per-agent trace showed the input FACTS were correct, so the agent was at fault, not the data. Fix: alert counts passed from code, plus a "one row per alert, ID first" rule. After the fix, all 6 alerts appear with IDs.
- **Failure 2, Risk Assessor (T7):** it cited the blocked security review as evidence for *Integration* risk and gave a vague "ongoing tasks" justification. Fix: evidence links and the ranking are computed in code, and the agent may only quote them. After the fix, R09 → R01 → R05 with correct evidence, at 40% lower cost.
- **Lesson about evaluators:** my own Grounding Check passed both failures. It caught *invented* IDs, not *missing* or *mislinked* ones. Adding completeness checks and manual review of every output was what exposed them. An automatic metric is only as good as the failure modes it was designed for.
- **Iteration 3, from the capstone grade (78/100 on hallucination control):** the grader found the next blind spot, a wrong *count* still passed. I reproduced it ("9 Done", "health GREEN", "T024 is Done" were all accepted), then extended the Grounding Check to verify every count, % complete, health rating and task status against Compute Facts. A new offline regression test injects 7 errors (all flagged) and replays the 8 real project-data answers (no false positives). Same lesson: each new evaluator check comes from a failure someone actually found.

## 2. Improvement plan
1. **Ask Mira questions in Slack.** Front-end the webhook with the existing n8n Slack bot, threaded per project. Acknowledge immediately to stay within Slack's 3-second limit.
2. **Live data instead of CSV.** Replace *Load Project Data* with Trello/Jira and Google Drive nodes. The agents don't change, because they only consume *Compute Facts*.
3. **Scheduled alerts.** Run the Milestone Tracker every morning per project and post only when something changed (new blocked or overdue item, milestone within 7 days).
4. **Human-in-the-loop.** Plans and stakeholder emails go to the PM for one-click approval before sending. Grounding flags are shown inline.
5. **LLM-as-judge (done).** A `faithfulness` judge (gpt-4.1-mini) now scores every specialist answer in Langfuse against the exact source data the agent saw. **Next:** sample it at 10–20% plus 100% of code-flagged answers, because the dashboard shows it costs more than Mira itself.
6. **Multi-project support.** Key the data and facts by project ID so one PM can ask "which of my projects is red?"

## 3. Evaluation and fine-tuning
**Experiments in Langfuse.** The 12 baseline inputs are a Langfuse dataset. I re-ran them live through the original v1 prompts and the current v2, with the same evaluator. v1 reproduced its failures on a fresh run (T8 dropped T009 again; T7 again tied the security blocker to Integration risk), while v2 passed 12/12. Being able to reproduce a failure, then show the fix removing it on the same inputs, is the strongest evidence the fix is real and not luck.

**The judge needs judging too.** On those reproduced v1 defects, my code checker caught 2 of 3, and the LLM judge (gpt-4.1-mini) caught only 1 of 3. It scored the T8 answer 1.00 while claiming the missing task was present, and it accepted the security→Integration mislink as "related". So: count with code, judge reasoning with an LLM, and test the judge on a labelled set of known-bad answers before trusting its scores.

The course loop is *evaluate → find failure → fix → re-evaluate*. Mira bakes the first step into every request: the Grounding Check records a `grounded` score (0/1) on every Langfuse trace, so groundedness becomes a production metric, not a one-off test. The 12 baseline inputs are the regression suite, and any prompt or model change must pass them again.

Fine-tuning comes **after** prompt and architecture fixes, and only for the agent that still fails. The most likely candidate is the Planner, which has the most free text and the most room to add "helpful" goals. The plan:
- Collect 50–100 PM-edited plans from the pilot as `system / user / assistant` JSONL, including about 15 vague-input examples whose correct answer is "insufficient detail".
- Fine-tune gpt-4o-mini, swap the model ID in *Config + Input*, and re-run the same suite and the Langfuse groundedness metric to compare before and after.

If prompts plus code already achieve over 98% groundedness, fine-tuning isn't worth the cost of maintaining it.

## 4. Privacy considerations
- **Data minimisation:** each agent receives only the slice it needs. For example, the Stakeholder agent sees one sprint, and no agent sees raw files it doesn't use.
- **Personal data:** the only personal data is task assignee names. There are no emails, HR data or customer personal data. Outputs never judge individuals' performance.
- **Vendors:** OpenAI API (no training on API data under its standard terms; add a data-processing agreement and zero-retention if the client requires it) and Langfuse (EU region, 30-day retention on the Hobby tier; self-host if the client contract requires it). Both go on the DPO's register for UK GDPR.
- **Client confidentiality:** ABCDE's data is processed only for ABCDE's project, and no cross-client data appears in prompts. When there are multiple projects, access follows Nexora's project membership.
- **Secrets:** API keys live only in n8n credentials, never in workflow JSON or Git (the exported workflow contains no credentials).

## 5. Rollout to 10 PMs/TPMs
Week numbers follow the 12-week timeline in the Program Charter (§5 and §9): weeks 1–4 are build and hardening, so the rollout starts in week 5.

| Charter week | Phase | Step |
|---|---|---|
| 5–6 | 2. Pilot (shadow mode) | 2 champion PMs run Mira side by side with manual reports on the ABCDE project; differences are logged, fixed and re-tested with the regression suite |
| 7 | 3. Pilot expansion (assisted mode) | Onboard 8 more PMs (30-minute session plus a one-page prompt guide); Slack front end live; daily milestone alerts on |
| 8–10 | 3. Pilot expansion (assisted mode) | Weekly review of the Langfuse dashboard (groundedness, refusals, cost, latency) and time-saved survey; weekly office hours |
| 11–12 | 4. Go / no-go | Steering committee decides against the charter's gates: ≥ 98% grounded, 100% count accuracy, ≥ 8/10 weekly active PMs, ≥ 60 min saved per PM per week. If passed, default mode from week 13 |

**Personal takeaway:** the most valuable design decision wasn't a prompt. It was deciding what the LLM should *not* do. Code computes, the model explains, and the system asks when it doesn't know.
