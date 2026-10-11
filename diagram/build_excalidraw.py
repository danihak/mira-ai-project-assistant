"""Generates diagram/mira_architecture.excalidraw (open at https://excalidraw.com → menu → Open)."""
import json, random, pathlib

random.seed(7)
els = []
def rid(): return "el" + "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(10))
def base(t, x, y, w, h, **kw):
    e = {"type": t, "id": kw.pop("id", rid()), "x": x, "y": y, "width": w, "height": h, "angle": 0,
         "strokeColor": kw.pop("stroke", "#1e1e1e"), "backgroundColor": kw.pop("bg", "transparent"),
         "fillStyle": "solid", "strokeWidth": kw.pop("sw", 2), "strokeStyle": kw.pop("style", "solid"),
         "roughness": 1, "opacity": 100, "groupIds": [], "frameId": None,
         "roundness": kw.pop("roundness", {"type": 3}), "seed": random.randint(1, 2**31), "version": 1,
         "versionNonce": random.randint(1, 2**31), "isDeleted": False, "boundElements": [],
         "updated": 1791700000000, "link": None, "locked": False}
    e.update(kw); els.append(e); return e

def text(x, y, s, size=16, color="#1e1e1e", container=None, align="center", valign="middle", w=None):
    lines = s.split("\n")
    tw = w or max(len(l) for l in lines) * size * 0.55
    th = len(lines) * size * 1.25
    t = base("text", x, y, tw, th, stroke=color, roundness=None, text=s, originalText=s, fontSize=size,
             fontFamily=2, textAlign=align, verticalAlign=valign, containerId=container["id"] if container else None,
             autoResize=True, lineHeight=1.25)
    if container:
        container["boundElements"].append({"type": "text", "id": t["id"]})
        t["x"] = container["x"] + (container["width"] - tw) / 2
        t["y"] = container["y"] + (container["height"] - th) / 2
    return t

def box(x, y, w, h, label, bg="#ffffff", stroke="#1e1e1e", size=16, style="solid"):
    b = base("rectangle", x, y, w, h, bg=bg, stroke=stroke, style=style)
    text(0, 0, label, size=size, container=b)
    return b

def zone(x, y, w, h, title, bg, stroke, tx=16, ty=10):
    z = base("rectangle", x, y, w, h, bg=bg, stroke=stroke, sw=1)
    text(x + tx, y + ty, title, size=18, color=stroke, align="left", valign="top")
    return z

def arrow(a, b, dashed=False, label=None, pts=None, lx=None, ly=None):
    ax, ay = a["x"] + a["width"] / 2, a["y"] + a["height"]
    bx, by = b["x"] + b["width"] / 2, b["y"]
    points = pts or [[0, 0], [bx - ax, by - ay]]
    ar = base("arrow", ax, ay, abs(points[-1][0]) or 1, abs(points[-1][1]) or 1, stroke="#495057" if not dashed else "#868e96",
              style="dashed" if dashed else "solid", roundness=None, points=points,
              lastCommittedPoint=None, startBinding={"elementId": a["id"], "focus": 0, "gap": 4},
              endBinding={"elementId": b["id"], "focus": 0, "gap": 4}, startArrowhead=None, endArrowhead="arrow", elbowed=False)
    a["boundElements"].append({"type": "arrow", "id": ar["id"]}); b["boundElements"].append({"type": "arrow", "id": ar["id"]})
    if label:
        text(lx, ly, label, size=14, color="#495057", align="left")
    return ar

def side_arrow(a, b, dashed=True):
    """horizontal arrow from right edge of a to left edge of b"""
    ax, ay = a["x"] + a["width"], a["y"] + a["height"] / 2
    bx, by = b["x"], b["y"] + b["height"] / 2
    ar = base("arrow", ax, ay, bx - ax, 1, stroke="#868e96", style="dashed" if dashed else "solid", roundness={"type": 2},
              points=[[0, 0], [bx - ax, by - ay]], lastCommittedPoint=None,
              startBinding={"elementId": a["id"], "focus": 0, "gap": 4}, endBinding={"elementId": b["id"], "focus": 0, "gap": 4},
              startArrowhead="arrow" if dashed else None, endArrowhead="arrow", elbowed=False)
    a["boundElements"].append({"type": "arrow", "id": ar["id"]}); b["boundElements"].append({"type": "arrow", "id": ar["id"]})

# ---- title ----
text(40, 10, "Mira - AI Project Intelligence Assistant", size=32, align="left")
text(40, 56, "Router multi-agent pattern on n8n  ·  code computes, LLM explains  ·  grounding evaluator  ·  Langfuse (OpenTelemetry)", size=16, color="#495057", align="left")

# ---- trigger ----
trig = box(370, 100, 400, 70, "PM / TPM request\nWebhook POST /mira  (or Slack / chat)", bg="#e9ecef")

# ---- 1. data layer ----
zone(40, 210, 1320, 170, "1 · DETERMINISTIC DATA LAYER (code, no LLM)", "#e7f5ff", "#1971c2")
cfg = box(60, 255, 290, 105, "Config + Input\nas-of date 2026-04-24, models,\nprice table, alert windows", stroke="#1971c2")
load = box(380, 255, 380, 105, "Load Project Data\nproject_description.txt · project_timeline.csv\nproject_risks.csv · sample_task_board.csv", stroke="#1971c2")
facts = box(790, 255, 550, 105, "Compute Facts\nstatus counts · overdue / blocked / at-risk rules\ndated phases & milestones · rule-based health\n(LLMs never count, filter or do date maths)", stroke="#1971c2")

# ---- 2. router ----
zone(240, 420, 760, 150, "2 · ORCHESTRATOR (ROUTER)", "#fff9db", "#e67700", tx=420)
orch = box(260, 465, 340, 90, "Orchestrator Agent\ngpt-4o-mini · temp 0 · JSON\nintent + project ref + sufficiency", stroke="#e67700")
parse = box(630, 465, 350, 90, "Parse Route (code guardrails)\noverride model: no data / vague\n→ Clarifier", stroke="#e67700")
openai = box(1060, 440, 260, 110, "OpenAI API\ngpt-4o-mini\nHTTP Request nodes, retry ×3", style="dashed", stroke="#495057")

# ---- 3. specialists ----
zone(40, 610, 1320, 215, "3 · SPECIALIST AGENTS (each gets only the data it needs)", "#f3f0ff", "#6741d9", tx=640, ty=188)
specs = [
    ("Planner\ndescription + dated\ntimeline + tasks\n7-section plan", "#ffffff"),
    ("Risk Assessor\nregister R01-R10 +\ncode-computed\nevidence links", "#ffffff"),
    ("Status Reporter\npre-computed counts\nweekly report", "#ffffff"),
    ("Milestone Tracker\nblocked / overdue /\nat-risk + milestones\n(EXTENDED)", "#ffffff"),
    ("Stakeholder Update\nonly requested sprint\naudience-tuned email\n(EXTENDED)", "#ffffff"),
    ("Clarifier\nrule-based, no LLM\nasks for missing info\n0 tokens", "#fff5f5"),
]
sboxes = []
for i, (lbl, bg) in enumerate(specs):
    sboxes.append(box(60 + i * 215, 655, 200, 125, lbl, bg=bg, stroke="#e03131" if i == 5 else "#6741d9", size=15))

# ---- 4. evaluation ----
zone(40, 865, 860, 150, "4 · EVALUATION", "#ebfbee", "#2f9e44")
pkg = box(60, 910, 300, 85, "Package Response\ntokens · latency · cost per agent", stroke="#2f9e44")
gc = box(390, 910, 490, 85, "Grounding Check (code evaluator)\nevery task ID / risk ID / date must exist\n+ completeness & sprint-scope checks", stroke="#2f9e44")
lf = box(960, 895, 380, 110, "Langfuse\nOTel trace per request · generation per agent\ntokens, cost, latency · 'grounded' score", style="dashed", stroke="#495057")

# ---- output ----
out = box(390, 1055, 490, 80, "Response (JSON)\nanswer · route · grounding flags · tokens · cost · trace id", bg="#e9ecef")

# ---- arrows ----
arrow(trig, load)
side_arrow(cfg, load, dashed=False); side_arrow(load, facts, dashed=False)
fx = facts["x"] + facts["width"] / 2; ox = orch["x"] + orch["width"] / 2
arrow(facts, orch, pts=[[0, 0], [0, 35], [ox - fx, 35], [ox - fx, 105]], label="facts", lx=ox + 8, ly=395)
side_arrow(orch, parse, dashed=False)
side_arrow(parse, openai)
for sb in sboxes:
    tx = sb["x"] + sb["width"] / 2 - (parse["x"] + parse["width"] / 2)
    arrow(parse, sb, pts=[[0, 0], [0, 35], [tx, 35], [tx, 100]])
sx = sboxes[2]["x"] + sboxes[2]["width"] / 2; px = pkg["x"] + pkg["width"] / 2
arrow(sboxes[2], pkg, pts=[[0, 0], [0, 40], [px - sx, 65], [px - sx, 130]], label="whichever agent ran", lx=px + 10, ly=845)
side_arrow(pkg, gc, dashed=False)
side_arrow(gc, lf)
arrow(gc, out)

doc = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com", "elements": els,
       "appState": {"gridSize": 20, "viewBackgroundColor": "#ffffff"}, "files": {}}
p = pathlib.Path(__file__).with_name("mira_architecture.excalidraw")
p.write_text(json.dumps(doc, indent=1), encoding="utf-8")
print("wrote", p, len(els), "elements")
