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

## 2. Improvement plan
1. **Ask Mira questions in Slack.** Front-end the webhook with the existing n8n Slack bot, threaded per project. Acknowledge immediately to stay within Slack's 3-second limit.
2. **Live data instead of CSV.** Replace *Load Project Data* with Trello/Jira and Google Drive nodes. The agents don't change, because they only consume *Compute Facts*.
3. **Scheduled alerts.** Run the Milestone Tracker every morning per project and post only when something changed (new blocked or overdue item, milestone within 7 days).
4. **Human-in-the-loop.** Plans and stakeholder emails go to the PM for one-click approval before sending. Grounding flags are shown inline.
5. **LLM-as-judge.** Add a second evaluator (gpt-4o, sampled at 10%) that scores each plan for "goal invented?" and "generic risk?", alongside the deterministic grounding check, and log it to Langfuse as a score.
6. **Multi-project support.** Key the data and facts by project ID so one PM can ask "which of my projects is red?"

## 3. Evaluation and fine-tuning
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
| Week | Step |
|---|---|
| 1 | Pick 2 champion PMs; shadow mode on the ABCDE project, with Mira and manual reports side by side |
| 2 | Fix the top issues from traces and feedback; re-run the regression suite |
| 3 | Onboard 8 more PMs (30-minute session plus a one-page prompt guide); Slack front end live; daily alerts on |
| 4–6 | Weekly review of the Langfuse dashboard (groundedness, refusals, cost, latency) and time-saved survey |
| 7 | Go/no-go against the charter's gates: ≥ 98% grounded, 100% count accuracy, ≥ 8/10 weekly active PMs, ≥ 60 min saved per PM per week |

**Personal takeaway:** the most valuable design decision wasn't a prompt. It was deciding what the LLM should *not* do. Code computes, the model explains, and the system asks when it doesn't know.
