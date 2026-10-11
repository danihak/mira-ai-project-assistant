# Mira - Baseline Test Results, Run 1 (v1 prompts, gpt-4o-mini)

Run: 2026-10-11 06:11 | Report date used by Mira (as-of): 2026-04-24
**Result: 11/12 passed** | Total LLM cost for the run: $0.0074

## Summary

| Test | Type | Route | Auto checks | Grounding check | Tokens in/out | Cost (USD) | Latency (ms) | Result |
|---|---|---|---|---|---|---|---|---|
| T1 | Plan (detailed) | plan | 5/5 | pass | 3883/1062 | 0.00122 | 12114 | **PASS** |
| T2 | Plan (vague) | clarify | 3/3 | pass | 772/97 | 0.000174 | 1472 | **PASS** |
| T3 | Risk (detailed) | risk | 4/4 | pass | 4038/878 | 0.001132 | 9749 | **PASS** |
| T4 | Risk (vague) | clarify | 3/3 | pass | 770/93 | 0.000171 | 1292 | **PASS** |
| T5 | Status (data) | status | 3/3 | pass | 2545/442 | 0.000647 | 5677 | **PASS** |
| T6 | Status (no data) | clarify | 3/3 | pass | 771/85 | 0.000167 | 1401 | **PASS** |
| T7 | Risk analysis | risk | 3/3 | pass | 4036/993 | 0.001201 | 12499 | **PASS** |
| T8 | Tracking | milestone | 2/4 | pass | 2721/534 | 0.000729 | 5830 | **FAIL** |
| T9 | Plan (edge) | clarify | 4/4 | pass | 773/93 | 0.000172 | 1537 | **PASS** |
| T10 | Status summary | status | 6/6 | pass | 4067/155 | 0.000703 | 2611 | **PASS** |
| T11 | Timeline | milestone | 4/4 | pass | 2719/512 | 0.000716 | 5929 | **PASS** |
| T12 | Comms | stakeholder_update | 5/5 | pass | 1452/228 | 0.000354 | 2917 | **PASS** |

## Detailed results

### T1 - Plan (detailed)

| Field | Value |
|---|---|
| Test ID | T1 |
| Input | Generate a project plan for the AI Adoption Project at ABCDE Ltd. Use the provided project description. |
| Expected | Phases, milestones, timeline; grounded in description; no invented goals |
| Route taken | plan (router reason: The request refers to the loaded project data and is sufficient to generate a project plan.) |
| Expected keywords present? | Yes: routed to Planner; has phases and milestones; >=10 timeline milestones present; uses stated goals (15% delays, 10% cost); grounding check passed. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
## 1. Project Summary
The AI Adoption Project at ABCDE Ltd. aims to enhance operational efficiency, improve customer experience, and drive data-driven decision-making by integrating AI-powered tools into core business functions. The project will be implemented in phases, starting with an assessment of current workflows and data infrastructure, followed by pilot implementations in targeted departments.

## 2. Goals & Success Metrics
- Reduce delivery delays by 15%
- Lower operational costs by 10%
- Improve service responsiveness

## 3. Phase Plan
| Phase                       | Weeks | Dates           | Key Activities                                           | Milestones / Deliverables                                   | Linked Tasks (IDs from the task list) |
|-----------------------------|-------|-----------------|---------------------------------------------------------|-----------------------------------------------------------|---------------------------------------|
| Project Initiation          | 1-2   | 2026-03-30 to 2026-04-12 | Define project scope; Form cross-functional team; Initial stakeholder meeting | Project charter signed off, Team structure finalized      | T001, T002, T003                     |
| Current State Analysis      | 3-4   | 2026-04-13 to 2026-04-26 | Assess existing processes & systems; Identify data sources & gaps | Current systems audit report, Gap analysis report         | T004, T005, T006                     |
| Use Case Selection          | 5-6   | 2026-04-27 to 2026-05-10 | Shortlist priority AI use cases (forecasting, route optimization) | Final list of prioritized use cases with success criteria  | T007, T008, T009, T025               |
| Pilot Design                | 7-10  | 2026-05-11 to 2026-06-07 | Data collection & preparation; Model design and development | Working prototype models, Data pipelines established       | T010, T011, T012                      |
| Pilot Implementation         | 11-14 | 2026-06-08 to 2026-07-05 | Deploy AI models in test environments; Monitor performance | Pilot results report, User feedback and performance metrics | T015, T016, T017                      |
| Evaluation & Iteration      | 15-16 | 2026-07-06 to 2026-07-19 | Evaluate pilot outcomes; Adjust models as needed         | Updated models and process refinements                     | T018                                  |
| Full Deployment             | 17-22 | 2026-07-20 to 2026-08-30 | Scale AI models across selected departments; Train staff  | Full production rollout, Training sessions completed       | T019, T020, T021                      |
| Monitoring & Review         | 23-24 | 2026-08-31 to 2026-09-13 | Continuous performance monitoring; Final project review   | Project closure report, Recommendations for future scaling | T022, T023                            |

## 4. Key Milestones
- Project charter signed off - 2026-04-12
- Team structure finalized - 2026-04-12
- Current systems audit report - 2026-04-26
- Gap analysis report - 2026-04-26
- Final list of prioritized use cases with success criteria - 2026-05-10
- Working prototype models - 2026-06-07
- Data pipelines established - 2026-06-07
- Pilot results report - 2026-07-05
- User feedback and performance metrics - 2026-07-05
- Updated models and process refinements - 2026-07-19
- Full production rollout - 2026-08-30
- Training sessions completed - 2026-08-30
- Project closure report - 2026-09-13
- Recommendations for future scaling - 2026-09-13

## 5. Team & Governance
A cross-functional task force comprising data scientists, IT professionals, and business stakeholders will oversee the deployment and ensure alignment with organizational objectives.

## 6. Dependencies & Assumptions
- Task board ends 2026-08-04; timeline runs to 2026-09-13 (week 24). Board and timeline are not fully aligned. [FROM DATA]
- Not all tasks are aligned with the timeline, which may affect project execution. [ASSUMPTION]

## 7. Open Questions for the Sponsor
- What is the budget allocated for the AI Adoption Project?
- What specific tools or platforms will be used for AI implementation?
- Are there any approval gates or checkpoints required throughout the project?
```

</details>

### T2 - Plan (vague)

| Field | Value |
|---|---|
| Test ID | T2 |
| Input | Generate a project plan for: "We want to build a chatbot." |
| Expected | Flags insufficient detail; asks for scope, timeline, team size; no full plan |
| Route taken | clarify (router reason: Insufficient details provided to create a project plan.) |
| Expected keywords present? | Yes: routed to Clarifier (no plan/risks generated); flags insufficient detail; asks for scope, timeline, team. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
INSUFFICIENT DETAIL - I can't generate a project plan from "We want to build a chatbot." without inventing scope, dates and people.

Please share:
- Project goal and scope (what is being built and why)
- Key deliverables
- Timeline: start date, duration or deadline
- Team size and roles
- Constraints: budget, technology, dependencies
- Success criteria / KPIs

Or ask about the ABCDE Ltd. AI Adoption Project, which is already loaded.
```

</details>

### T3 - Risk (detailed)

| Field | Value |
|---|---|
| Test ID | T3 |
| Input | Generate a risk assessment for the AI Adoption Project at ABCDE Ltd. Use the provided project description. |
| Expected | Categorised risks relevant to logistics/AI; no generic risks |
| Route taken | risk (router reason: The request refers to the loaded project data and does not require additional information.) |
| Expected keywords present? | Yes: routed to Risk Assessor; >=8 register risks R01-R10 covered; logistics/AI-specific categories; grounding check passed. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
## Risk Matrix

| ID  | Category                     | Risk                                      | Impact                                         | Likelihood (H/M/L) | Severity (H/M/L) | Evidence in Project Data                                                                 | Mitigation (register)                                             | Next Action [SUGGESTED]                  |
|-----|------------------------------|-------------------------------------------|------------------------------------------------|---------------------|-------------------|-------------------------------------------------------------------------------------------|------------------------------------------------------------------|------------------------------------------|
| R01 | Data Quality & Availability   | Incomplete or unstructured data           | Poor model performance and inaccurate outcomes  | H                   | H                 | Task T006 (Identify data gaps and quality issues) is overdue and still in progress.      | Perform early data audits and implement robust data governance.  | Accelerate data quality assessment.      |
| R02 | Integration Issues            | Difficulty integrating AI with legacy systems | Delays in deployment and operational disruptions | No current signal    | M                 | No current signal                                                                          | Plan integration roadmap and use APIs/middleware.                | Prepare integration strategy.            |
| R03 | Talent & Skills Gap          | Lack of internal AI/ML expertise          | Overreliance on external vendors and slow progress | No current signal    | M                 | No current signal                                                                          | Provide staff training and hire specialized talent.               | Initiate training programs.              |
| R04 | Change Resistance             | Employees resist adopting AI-driven workflows | Low adoption and reduced ROI                   | No current signal    | M                 | No current signal                                                                          | Strong change management and early engagement.                   | Develop change management plan.         |
| R05 | Ethical & Legal Concerns      | Risks of biased models or data privacy violations | Legal repercussions and reputational damage    | H                   | H                 | Task T025 (Legal review of data usage) is in progress.                                   | Involve legal early and implement fairness checks.                | Ensure legal compliance is prioritized.  |
| R06 | Cost Overruns                | Underestimation of AI development costs   | Budget constraints and project delays          | No current signal    | M                 | No current signal                                                                          | Set realistic budget and build in contingency funds.              | Review budget estimates.                 |
| R07 | Unrealistic Expectations      | Stakeholders expect immediate ROI         | Disillusionment and loss of support           | No current signal    | M                 | No current signal                                                                          | Align expectations and show quick wins.                           | Communicate realistic timelines.         |
| R08 | Model Performance Drift       | AI models lose accuracy over time         | Incorrect decisions and trust erosion          | No current signal    | M                 | No current signal                                                                          | Regular retraining cycles and monitoring dashboards.              | Plan for ongoing model evaluation.       |
| R09 | Security Vulnerabilities      | AI models targeted by adversarial attacks  | Data breaches and operational risks            | H                   | H                 | Task T024 (Security review of AI infrastructure) is blocked.                             | Adopt AI security best practices and penetration testing.         | Resolve security review blockage.        |
| R10 | Vendor Lock-in               | Overdependence on a specific AI platform  | Flexibility loss and future switching costs    | No current signal    | M                 | No current signal                                                                          | Favor open standards and negotiate flexible vendor terms.         | Assess vendor agreements.                |

## Live Signals Driving the Ratings
- T006 - Overdue - 2026-04-21 (affects R01)
- T025 - In Progress - 2026-04-28 (affects R05)
- T024 - Blocked - 2026-05-26 (affects R09)

## Rating Method
The risk register does not provide likelihood or severity scores, so ratings are based on the current evidence from the project data. Risks are assessed based on the status of related tasks and their potential impact on the project.
```

</details>

### T4 - Risk (vague)

| Field | Value |
|---|---|
| Test ID | T4 |
| Input | Generate a risk assessment for: "New project starting soon." |
| Expected | Flags insufficient; asks for project details; no invented risks |
| Route taken | clarify (router reason: Insufficient information provided to assess risks for the new project.) |
| Expected keywords present? | Yes: routed to Clarifier (no plan/risks generated); flags insufficient detail; asks for project details. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
INSUFFICIENT DETAIL - I can't generate a risk assessment from "New project starting soon." without inventing scope, dates and people.

Please share:
- What the project is: domain, scope and goals
- Timeline and current phase
- Team, vendors and technologies involved
- Known constraints (budget, compliance, integrations)
- Any existing risk register or known issues

Or ask about the ABCDE Ltd. AI Adoption Project, which is already loaded.
```

</details>

### T5 - Status (data)

| Field | Value |
|---|---|
| Test ID | T5 |
| Input | Generate a weekly status report using the sample task board data for Sprint 3. |
| Expected | Tasks by status; actual Sprint 3 task names; no invented tasks |
| Route taken | status (router reason: The request refers to the loaded project data and specifies a sprint.) |
| Expected keywords present? | Yes: routed to Status Reporter; all 4 Sprint 3 tasks named; grounding check passed (no invented / out-of-scope tasks). Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
# Weekly Status Report - Sprint 3 - week ending 2026-04-24
**Overall health:** AMBER - T024 Security review of AI infrastructure is Blocked (High priority), T006 Identify data gaps and quality issues is overdue (due 2026-04-21), 4 task(s) at risk of missing due dates in the next 14 days.

## Summary
| Status     | Count |
|------------|-------|
| Done       | 0     |
| In Progress | 2     |
| Blocked    | 0     |
| To Do      | 2     |
| Total      | 4     |

## Completed
None

## In Progress
- T007 - Shortlist AI use cases - Arjun Mehta - due 2026-04-28
- T025 - Legal review of data usage - Sarah Lin - due 2026-04-28

## Blocked
None

## To Do (in scope)
- T008 - Define success criteria for each use case - Sarah Lin - due 2026-05-02
- T009 - Vendor evaluation for ML platform - James Wong - due 2026-05-05

## Overdue / Carry-over
- T006 - Identify data gaps and quality issues - Priya Nair - due 2026-04-21 (Overdue by 3 day(s), still In Progress)

## Upcoming Milestones (next 14 days)
- Current systems audit report - due 2026-04-26
- Gap analysis report - due 2026-04-26

## Asks & Escalations
- T024 Security review of AI infrastructure is Blocked (High priority).
```

</details>

### T6 - Status (no data)

| Field | Value |
|---|---|
| Test ID | T6 |
| Input | Generate a weekly status report for: "Things are going fine." |
| Expected | States no task data available; no fabricated statuses or percentages |
| Route taken | clarify (router reason: The request lacks specific task data needed to generate a status report.) |
| Expected keywords present? | Yes: routed to Clarifier; states no task data available; no fabricated percentages. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
NO TASK DATA AVAILABLE - I can't produce a status report from "Things are going fine.". Reporting progress without task data would mean inventing task statuses and percentages.

Please share:
- Task board export (CSV, Trello or Jira) with task name, status, assignee, due date and sprint
- Reporting period (which week or sprint)

Or ask about the ABCDE Ltd. AI Adoption Project, which is already loaded.
```

</details>

### T7 - Risk analysis

| Field | Value |
|---|---|
| Test ID | T7 |
| Input | What are the top 3 risks for the ABCDE Ltd project based on the risk data? |
| Expected | References actual risks from the risk CSV; none invented |
| Route taken | risk (router reason: The request refers to the loaded project data and asks for a risk assessment.) |
| Expected keywords present? | Yes: routed to Risk Assessor; cites >=3 register risk IDs; grounding check passed. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
1. **R01** - Data Quality & Availability: Incomplete or unstructured data. This ranks as a top risk due to the overdue task (T006) for identifying data gaps and quality issues, which is critical for model performance. Mitigation: Perform early data audits and implement robust data governance.

2. **R02** - Integration Issues: Difficulty integrating AI with legacy systems. This risk is significant as the blocked task (T024) for the security review of AI infrastructure may delay integration efforts. Mitigation: Plan integration roadmap and use APIs/middleware.

3. **R04** - Change Resistance: Employees resist adopting AI-driven workflows. This risk is heightened by the ongoing tasks that require stakeholder engagement and alignment, which are crucial for successful adoption. Mitigation: Strong change management and early engagement.

---

## Risk Matrix
| ID  | Category                     | Risk                                      | Impact                                        | Likelihood (H/M/L) | Severity (H/M/L) | Evidence in Project Data                                       | Mitigation (register)                                      | Next Action [SUGGESTED]                     |
|-----|------------------------------|-------------------------------------------|-----------------------------------------------|---------------------|-------------------|---------------------------------------------------------------|-----------------------------------------------------------|----------------------------------------------|
| R01 | Data Quality & Availability   | Incomplete or unstructured data           | Poor model performance and inaccurate outcomes | H                   | H                 | Overdue task T006: Identify data gaps and quality issues     | Perform early data audits and implement robust data governance | Prioritize completion of T006                |
| R02 | Integration Issues            | Difficulty integrating AI with legacy systems | Delays in deployment and operational disruptions | H                   | H                 | Blocked task T024: Security review of AI infrastructure       | Plan integration roadmap and use APIs/middleware           | Resolve blockage on T024                     |
| R03 | Talent & Skills Gap          | Lack of internal AI/ML expertise          | Overreliance on external vendors and slow progress | M                   | H                 | No current signal                                           | Provide staff training and hire specialized talent         | Initiate staff training program               |
| R04 | Change Resistance             | Employees resist adopting AI-driven workflows | Low adoption and reduced ROI                  | M                   | H                 | Ongoing tasks related to stakeholder engagement               | Strong change management and early engagement              | Conduct stakeholder alignment meetings        |
| R05 | Ethical & Legal Concerns      | Risks of biased models or data privacy violations | Legal repercussions and reputational damage   | M                   | H                 | Ongoing task T025: Legal review of data usage                | Involve legal early and implement fairness checks          | Complete T025 by due date                    |
| R06 | Cost Overruns                | Underestimation of AI development costs   | Budget constraints and project delays         | M                   | M                 | No current signal                                           | Set realistic budget and build in contingency funds        | Review budget estimates                       |
| R07 | Unrealistic Expectations      | Stakeholders expect immediate ROI         | Disillusionment and loss of support          | M                   | M                 | No current signal                                           | Align expectations and show quick wins                     | Communicate project timelines                 |
| R08 | Model Performance Drift       | AI models lose accuracy over time         | Incorrect decisions and trust erosion         | L                   | M                 | No current signal                                           | Regular retraining cycles and monitoring dashboards        | Schedule retraining sessions                  |
| R09 | Security Vulnerabilities      | AI models targeted by adversarial attacks  | Data breaches and operational risks           | M                   | H                 | Blocked task T024: Security review of AI infrastructure       | Adopt AI security best practices and penetration testing   | Resolve blockage on T024                     |
| R10 | Vendor Lock-in               | Overdependence on a specific AI platform  | Flexibility loss and future switching costs   | L                   | M                 | No current signal                                           | Favor open standards and negotiate flexible vendor terms   | Evaluate vendor options                       |

## Live Signals Driving the Ratings
- T006 - Overdue - 2026-04-21 (R01)
- T024 - Blocked - 2026-05-26 (R02, R09)
- T025 - In Progress - 2026-04-28 (R05)

## Rating Method
The risk ratings are derived from the evidence in the project data, including overdue and blocked tasks that indicate potential impacts on project delivery and success.
```

</details>

### T8 - Tracking

| Field | Value |
|---|---|
| Test ID | T8 |
| Input | Which tasks are blocked or at risk of missing their deadline based on the task board? |
| Expected | Identifies T024 (Blocked); checks due dates against progress |
| Route taken | milestone (router reason: The request pertains to identifying blocked tasks or those at risk of missing deadlines, which aligns with the loaded project data.) |
| Expected keywords present? | Yes: routed to Milestone Tracker; grounding check passed. Missing: identifies T024 (Blocked); flags overdue T006 |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **FAIL** |

<details><summary>Full output</summary>

```text
There are currently 1 blocked task and 1 overdue task. Additionally, there are 4 tasks at risk of missing their deadlines.

## Alerts
| Item                                         | Type      | Due         | Owner          | Why                                               | Suggested Action [SUGGESTED]          |
|----------------------------------------------|-----------|-------------|----------------|---------------------------------------------------|---------------------------------------|
| Security review of AI infrastructure         | Blocked   | 2026-05-26  | James Wong     | Blocked: waiting for security team availability    | Follow up with the security team.    |
| Identify data gaps and quality issues        | Overdue   | 2026-04-21  | Priya Nair     | Overdue by 3 day(s), still In Progress            | Prioritize completion immediately.    |
| Shortlist AI use cases                       | At Risk   | 2026-04-28  | Arjun Mehta    | Due in 4 day(s), still In Progress                | Accelerate progress on this task.    |
| Define success criteria for each use case    | At Risk   | 2026-05-02  | Sarah Lin      | Due in 8 day(s), still To Do                      | Start working on this task soon.     |
| Legal review of data usage                   | At Risk   | 2026-04-28  | Sarah Lin      | Due in 4 day(s), still In Progress                | Ensure this task is on track.        |

## Milestone Outlook
Current phase: Current State Analysis (April 13 - April 26, 2026).  
Upcoming milestones:  
- Current systems audit report (Due: April 26, 2026)  
- Gap analysis report (Due: April 26, 2026)  

Next milestone after the window:  
- Final list of prioritized use cases with success criteria (Due: May 10, 2026)

## Method
Report date: April 24, 2026; At-risk rules used: "In Progress and due within 7 days, or To Do and due within 14 days."
```

</details>

### T9 - Plan (edge)

| Field | Value |
|---|---|
| Test ID | T9 |
| Input | Generate a project plan for a 2-week project with no details provided. |
| Expected | Asks for scope, goals, deliverables; no plan from a duration alone |
| Route taken | clarify (router reason: Insufficient details provided to create a project plan.) |
| Expected keywords present? | Yes: routed to Clarifier (no plan/risks generated); flags insufficient detail; asks for scope, timeline, team; asks for deliverables. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
INSUFFICIENT DETAIL - I can't generate a project plan from "a 2-week project with no details provided" without inventing scope, dates and people.

Please share:
- Project goal and scope (what is being built and why)
- Key deliverables
- Timeline: start date, duration or deadline
- Team size and roles
- Constraints: budget, technology, dependencies
- Success criteria / KPIs

Or ask about the ABCDE Ltd. AI Adoption Project, which is already loaded.
```

</details>

### T10 - Status summary

| Field | Value |
|---|---|
| Test ID | T10 |
| Input | Summarize the current project status: how many tasks are done, in progress, and to do? |
| Expected | Counts match the task board CSV |
| Route taken | status (router reason: The request refers to the loaded project data.) |
| Expected keywords present? | Yes: routed to Status Reporter; done = 5; in progress = 3; to do = 16; blocked = 1; grounding check passed. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
There are currently 5 tasks done, 3 tasks in progress, and 16 tasks to do.

| Status       | Count |
|--------------|-------|
| Done         | 5     |
| In Progress   | 3     |
| Blocked      | 1     |
| To Do        | 16    |
| Total        | 25    |
```

</details>

### T11 - Timeline

| Field | Value |
|---|---|
| Test ID | T11 |
| Input | What milestones are coming up in the next 2 weeks based on the timeline? |
| Expected | Actual milestones from project_timeline.csv; none invented |
| Route taken | milestone (router reason: The request refers to the loaded project data and asks for upcoming milestones.) |
| Expected keywords present? | Yes: routed to Milestone Tracker; names the 2 milestones due in window; correct due date 2026-04-26; grounding check passed (no invented dates). Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
The upcoming milestones in the next 2 weeks are the "Current systems audit report" and the "Gap analysis report," both due on April 26, 2026.

## Alerts
| Item                                   | Type                | Due         | Owner         | Why                                                      | Suggested Action [SUGGESTED] |
|----------------------------------------|---------------------|-------------|---------------|----------------------------------------------------------|-------------------------------|
| Current systems audit report           | Upcoming Milestone   | 2026-04-26  | N/A           | Due in 2 days                                           | Ensure completion by due date |
| Gap analysis report                    | Upcoming Milestone   | 2026-04-26  | N/A           | Due in 2 days                                           | Ensure completion by due date |
| Identify data gaps and quality issues  | Overdue             | 2026-04-21  | Priya Nair    | Overdue by 3 day(s), still In Progress                  | Prioritize to complete ASAP   |
| Shortlist AI use cases                 | At Risk             | 2026-04-28  | Arjun Mehta   | Due in 4 day(s), still In Progress                      | Focus on completing this task  |
| Legal review of data usage             | At Risk             | 2026-04-28  | Sarah Lin     | Due in 4 day(s), still In Progress                      | Focus on completing this task  |

## Milestone Outlook
- Current Phase: Current State Analysis (April 13 - April 26, 2026)
- Upcoming Milestones:
  - Current systems audit report - Due: April 26, 2026
  - Gap analysis report - Due: April 26, 2026
- Next Milestone after the window: Final list of prioritized use cases with success criteria - Due: May 10, 2026

## Method
Report date: April 24, 2026; At-risk rules used: "In Progress and due within 7 days, or To Do and due within 14 days."
```

</details>

### T12 - Comms

| Field | Value |
|---|---|
| Test ID | T12 |
| Input | Generate a stakeholder update email summarizing Sprint 2 progress. |
| Expected | References Sprint 2 tasks; professional; no Sprint 3+ tasks |
| Route taken | stakeholder_update (router reason: Task data from Sprint 2 is required to summarize progress.) |
| Expected keywords present? | Yes: routed to Stakeholder Update agent; all 3 Sprint 2 tasks referenced; no Sprint 3+ tasks mentioned; email format (subject line); grounding check passed. Missing: none |
| Hallucination detected? | No (automatic grounding check passed) - manual review: ____ |
| Pass/Fail | **PASS** |

<details><summary>Full output</summary>

```text
Subject: AI Adoption Project — Sprint 2 progress update

Hi all,

In Sprint 2, we have completed 2 tasks and have 1 task currently in progress. There are no blocked tasks in this sprint.

Completed:
- Audit existing data infrastructure - Priya Nair
- Map current logistics workflows - James Wong

In progress:
- Identify data gaps and quality issues - Priya Nair - due date: 2026-04-21; past due

Blocked / risks: None in this sprint

Next steps:
- Complete the identification of data gaps and quality issues.

Regards,  
Mira (Project Intelligence Assistant) on behalf of the PMO
```

</details>
