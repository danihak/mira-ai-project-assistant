# Q3 — Program Charter: Mira, AI Project Intelligence Assistant

**Program owner:** Danish (AI PM/TPM) · **Sponsor:** CTO, Nexora Pvt. Ltd. · **Version:** 1.0

## 1. Vision
Every Nexora PM/TPM can get an accurate plan, risk view and status report for any project in minutes. Every number in those outputs traces back to the project's own data, and PMs spend the hours they get back on clients and delivery, not paperwork.

**Problem statement.** Nexora runs several client projects with a handful of PMs/TPMs. Plans take 3–4 hours each, weekly status reports take 1–2 hours, risk assessments vary by person, and missed milestones are only discovered in retrospectives. There is no standard format across the team.

## 2. Objectives
1. Cut the time to produce a project plan from 3–4 hours to **under 15 minutes** of PM review.
2. Cut weekly status reporting from 1–2 hours to **under 10 minutes** per project.
3. Give **every active project** a current, evidence-based risk matrix.
4. Flag at-risk milestones **at least 7 days before** they are due.
5. Standardise plan, status and risk formats across all PMs.

## 3. Scope

| In scope (MVP, this program) | Out of scope (later / never) |
|---|---|
| Project plan generation from a description and timeline | Writing directly back to Jira/Trello (Mira is read-only in the MVP) |
| Risk assessment and top-risk Q&A grounded in the risk register | Resource and capacity planning (extension candidate) |
| Weekly status report and task-count Q&A from the board | Budget and financial forecasting |
| Milestone alert system (blocked, overdue, at risk, upcoming) | Sending email to clients without a human (always PM-approved) |
| Stakeholder update emails per sprint and audience | Automated people-performance judgements (never) |
| Webhook API, Slack front end, Langfuse tracing, grounding evaluator | Multi-language outputs |
| Pilot on the ABCDE Ltd. AI Adoption Project, then 10 PMs | Fine-tuned models (Phase 3, only if the evaluation shows a need) |

**Assumptions:** PMs keep task boards current. Client data may be processed by OpenAI under Nexora's API data-processing terms. n8n is hosted by Nexora.
**Constraints:** LLM spend under $50/month for the pilot. No client data stored outside approved systems. UK GDPR applies.

## 4. Success criteria (go-live gates)

| Area | Metric | Target |
|---|---|---|
| Trust | Groundedness rate (all cited IDs and dates exist in source) | ≥ 98% |
| Trust | Correct refusals on vague or no-data inputs | 100% on the test set |
| Accuracy | Status counts match the board | 100% |
| Accuracy | Baseline test suite (12 inputs) | 12/12 pass before pilot; no regression on each release |
| Value | Time saved per PM per week | ≥ 60 minutes (survey + time log) |
| Adoption | Pilot PMs using Mira weekly | ≥ 8 of 10 by week 4 of the pilot |
| Cost | LLM cost per request / per PM per month | < $0.002 / < $1 |
| Performance | p95 latency | < 15 s |

## 5. Timeline (12 weeks)

| Phase | Weeks | Key activities | Exit milestone |
|---|---|---|---|
| 0. Build & evaluate (capstone) | 1–2 | Router + 5 agents, grounding evaluator, Langfuse, baseline test suite | 12/12 baseline tests pass; architecture signed off by CTO |
| 1. Harden | 3–4 | Trello/Jira connectors, Slack front end, PM review step, prompt fixes from traces | Security & privacy review passed |
| 2. Pilot (ABCDE project) | 5–6 | 2 PMs use Mira on the live ABCDE project; weekly reports compared side by side with manual ones | Accuracy 100%, groundedness ≥ 98%, PM sign-off |
| 3. Pilot expansion | 7–10 | 10 PMs across 3–5 projects; scheduled daily milestone alerts; collect edits for a fine-tuning dataset | Adoption ≥ 8/10, time saved ≥ 60 min/week |
| 4. Go / no-go & scale | 11–12 | Review metrics, cost, incidents; decide on company-wide rollout and the Phase-2 backlog | Steering committee decision |

## 6. Stakeholders & RACI

| Stakeholder | Interest | Plan | Build | Pilot | Go/No-go |
|---|---|---|---|---|---|
| CTO (sponsor) | Productivity, risk, cost | A | I | I | **A** |
| AI PM/TPM — program owner (Danish) | Delivery of Mira | R | A | A | R |
| ML / AI engineer | Prompts, evaluation, fine-tuning | C | R | C | C |
| Software developer (n8n, integrations) | Connectors, hosting | C | R | C | I |
| PMs/TPMs (users) | Time saved, trust in outputs | C | C | R | C |
| IT security & Data Protection Officer | Client data, UK GDPR, vendor terms | C | C | C | C (veto on privacy) |
| Delivery heads | Consistent reporting across accounts | I | I | C | C |
| Client — ABCDE Ltd. PMO | Receives Mira-assisted reports | I | – | I | I |

R = Responsible · A = Accountable · C = Consulted · I = Informed

## 7. Decision-making & governance
- **Steering committee** (CTO, program owner, a delivery head, DPO) meets every two weeks and decides scope changes, phase gates and spend above budget.
- **Weekly working session** (program owner, engineers, 2 pilot PMs) reviews the Langfuse dashboard (groundedness, failures, cost) and agrees prompt or rule changes.
- **Decision rights:** the program owner decides prompts, models within budget and backlog order. The CTO decides phase gates and go/no-go. The DPO can veto any change to the data flow.
- **Change control:** every prompt or model change re-runs the 12-input baseline suite. A regression blocks release.
- **Human-in-the-loop policy:** nothing Mira generates goes to a client or leadership without PM review. Grounding flags are shown to the PM before sharing.

## 8. Risks & mitigations

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | Hallucinated milestones, statuses or risks reach a client | M | H | Counts and dates computed in code; context limited to what each agent needs; Grounding Check on every answer; PM approval before sharing | Program owner |
| 2 | Client data privacy (UK GDPR, client contracts) | M | H | DPO review; API data-processing terms with no training on data; send only the data each agent needs; no personal data beyond assignee names; logs kept for 30 days | DPO |
| 3 | Stale or inconsistent board data gives wrong reports | H | M | Data-quality notes surfaced (e.g. board vs timeline mismatch); "as-of" date on every report; PMs own board hygiene | PMs |
| 4 | Low adoption — PMs don't trust or use it | M | H | Pilot with champions; side-by-side comparison with manual reports; Slack front end; collect and act on feedback weekly | Program owner |
| 5 | Model or vendor changes break outputs (drift) | M | M | Pinned model versions; regression suite on every change; model choice is one config setting | ML engineer |
| 6 | Cost overrun at scale | L | M | gpt-4o-mini by default, small per-agent context, rule-based Clarifier; cost tracked per request in Langfuse | Program owner |
| 7 | Vendor lock-in (OpenAI, n8n) | L | M | Plain HTTP calls to an OpenAI-compatible API (swappable); prompts and code kept in Git | Developer |

## 9. Rollout plan
1. **Shadow mode (weeks 5–6):** 2 pilot PMs produce their reports both manually and with Mira; differences are logged and fixed.
2. **Assisted mode (weeks 7–10):** 10 PMs use Mira drafts and review them before sending. Daily milestone alerts post to each project's Slack channel. Weekly office hours are held.
3. **Default mode (week 11+, if the gate is passed):** Mira's report becomes the standard weekly format, and the PM review step stays.
4. **Enablement:** a 30-minute training session, a one-page "how to ask Mira" guide, a prompt library and a feedback button in Slack.
5. **Measurement:** a Langfuse dashboard (groundedness, refusals, cost, latency) plus a monthly time-saved survey reported to the steering committee.

## 10. Budget (pilot)
LLM about $3/month for 10 PMs at gpt-4o-mini (see the cost analysis in the Q2 write-up). Langfuse is on the free Hobby tier (50k units/month). The rest is n8n hosting on existing infrastructure plus about 2 weeks of engineering time for Phase 1.
