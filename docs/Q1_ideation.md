# Q1 — Ideation: AI Agents for PM/TPM Productivity at Nexora

**Author:** Danish

## Context
Nexora Pvt. Ltd. (London, 120+ people, clients across Europe and Asia) runs several client projects at once with only a few PMs/TPMs, who also wear other hats. It has just taken on the 6-month AI Adoption Project for ABCDE Ltd. (logistics). The brief names six pain points:
- 3–4 hours to build each project plan
- inconsistent risk assessments
- 1–2 hours per weekly status report
- milestones missed for lack of alerts
- no standard formats
- too few PMs for the number of projects

These three use cases target the biggest time sinks and the biggest trust risks. All three are built into Mira.

---

## Use case 1 — Project Plan Generator

| | |
|---|---|
| **Pain point** | A PM spends 3–4 hours turning a client's high-level description into a phased plan. Every PM uses a different format, so plans are hard to compare or review, and early plans often carry over unstated assumptions. |
| **Agentic solution** | The **Planner Agent** reads the project description and timeline. Code works out the real calendar dates for each phase. The agent writes a 7-section plan (summary, goals, phase table, milestones, team, dependencies and assumptions, open questions) and links existing board tasks to phases. Inferences are tagged `[ASSUMPTION]`. If the input is vague, the rule-based Clarifier asks for scope, deliverables, timeline and team instead of inventing them. |
| **Inputs** | Project description (TXT/brief), phase timeline (CSV), task board export (optional), project start date |
| **Outputs** | A standard-format Markdown plan, ready for the PM to review and send to the client. Open questions for the sponsor are listed separately. |
| **Success metrics** | 1) **Plan groundedness:** 100% of milestones traceable to the timeline or description. 2) **Time to first draft:** from 3–4 hours to under 15 minutes including PM review. 3) **Edit distance / acceptance:** at least 80% of generated sections accepted with only light edits. |
| **Knowledge base needed** | The client's project description and SOW, a timeline template, Nexora's standard plan template, past plans for similar projects (for retrieval or fine-tuning), and a glossary of the client's domain. |

## Use case 2 — Weekly Status & Stakeholder Reporting

| | |
|---|---|
| **Pain point** | Every week a PM spends 1–2 hours exporting the board, counting tasks, chasing owners and rewriting the same facts for leadership, engineering and the client. Manual counts drift, and reports go out late or not at all. |
| **Agentic solution** | **Compute Facts** (code) counts tasks by status and sprint and finds overdue and blocked items. The **Status Reporter Agent** formats this into a weekly report with a rule-based RAG health rating. The **Stakeholder Update Agent** writes an email for one sprint, in a tone set for the audience. Each agent only sees the sprint in scope, so other sprints can't leak into the email. |
| **Inputs** | Task board export (CSV, or Trello/Jira API), sprint or week requested, audience, report date |
| **Outputs** | Weekly status report (Markdown), stakeholder email, and the exact counts as JSON for dashboards |
| **Success metrics** | 1) **Status accuracy:** 100% of counts match the board. 2) **Reporting time:** from 1–2 hours to under 10 minutes a week. 3) **On-time reporting:** at least 95% of weekly reports sent by Friday. |
| **Knowledge base needed** | Live task board (Trello/Jira) or exports, sprint calendar, stakeholder list with each person's preferred format, and Nexora's report template and RAG-rating definitions |

## Use case 3 — Risk & Milestone Early Warning

| | |
|---|---|
| **Pain point** | Risk registers are written at kick-off and never connected to what is actually happening. Milestone slips are found in retrospectives instead of being prevented. Some projects have no risk matrix at all. |
| **Agentic solution** | The **Risk Assessor Agent** combines the project's risk register with live delivery signals. For example, a blocked security review (T024) raises R09 Security, and an open legal review (T025) raises R05 Ethical & Legal. The result is a risk matrix with an evidence column. The **Milestone Tracker Agent** flags blocked, overdue and at-risk tasks and milestones due in the next 14 days, using documented rules. These are the same checks a scheduled daily run would perform. |
| **Inputs** | Risk register (CSV), timeline with milestones, task board, report date, alert windows (7 and 14 days) |
| **Outputs** | Evidence-based risk matrix, top-N risk answer, and an alerts table (Blocked / Overdue / At risk / Upcoming milestone) with suggested actions |
| **Success metrics** | 1) **Risk relevance:** 100% of risks come from the register or are evidenced by a task, with no generic risks. 2) **Early detection:** at least 80% of slipped milestones flagged at least 7 days before their due date. 3) **Risk coverage:** 100% of active projects have a current risk matrix, up from ad hoc. |
| **Knowledge base needed** | Project risk register, Nexora's risk taxonomy (categories and ratings), timeline, live board, and a history of past project risks and incidents (for retrieval and calibration) |

---

## Why these three, and the order to build them
1. **Status reporting first.** It's weekly and high-volume, its accuracy is easy to check against the board, and it gives the fastest return.
2. **Milestone alerts second.** They reuse the same computed facts and turn reporting into prevention.
3. **Planning and risk third.** They are less frequent but carry the highest stakes, so they need a PM review step before anything is shared with the client.

Across all three, the design principle is the same: **code computes, the LLM explains, and Mira asks when it doesn't know.**
