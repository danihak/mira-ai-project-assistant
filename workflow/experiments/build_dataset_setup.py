"""Builds workflow/experiments/langfuse_dataset_setup.json - a one-off n8n workflow (manual trigger only, no webhook)
that creates the Langfuse dataset `mira-baseline` with the 12 baseline test items (ids mira-T1 ... mira-T12).
Attach the Langfuse Basic Auth credential to both HTTP nodes, open the workflow, click "Execute workflow" once."""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests"))
from run_tests import TESTS  # noqa: E402

items = [{"id": f"mira-{tid}", "datasetName": "mira-baseline", "input": {"message": msg},
          "expectedOutput": expected, "metadata": {"test_id": tid, "type": ttype}} for tid, msg, ttype, expected in TESTS]
HOST = "https://cloud.langfuse.com"

code = "const items = " + json.dumps(items, indent=1) + ";\nreturn items.map(i => ({ json: i }));"
wf = {
    "name": "Mira - Langfuse dataset setup (run once)",
    "nodes": [
        {"parameters": {}, "name": "Run once", "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [0, 0]},
        {"parameters": {"method": "POST", "url": f"{HOST}/api/public/v2/datasets", "authentication": "genericCredentialType",
                        "genericAuthType": "httpBasicAuth", "sendBody": True, "specifyBody": "json",
                        "jsonBody": json.dumps({"name": "mira-baseline", "description": "Mira capstone - 12 baseline test inputs with expected output criteria",
                                                "metadata": {"source": "Problem Statement - Mira, baseline test dataset"}}),
                        "options": {"response": {"response": {"neverError": True}}}},
         "name": "Create dataset", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [220, 0]},
        {"parameters": {"jsCode": code}, "name": "12 baseline items", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [440, 0]},
        {"parameters": {"method": "POST", "url": f"{HOST}/api/public/dataset-items", "authentication": "genericCredentialType",
                        "genericAuthType": "httpBasicAuth", "sendBody": True, "specifyBody": "json",
                        "jsonBody": "={{ JSON.stringify($json) }}", "options": {}},
         "name": "Create dataset items", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [660, 0]},
    ],
    "connections": {"Run once": {"main": [[{"node": "Create dataset", "type": "main", "index": 0}]]},
                    "Create dataset": {"main": [[{"node": "12 baseline items", "type": "main", "index": 0}]]},
                    "12 baseline items": {"main": [[{"node": "Create dataset items", "type": "main", "index": 0}]]}},
    "settings": {"executionOrder": "v1"}, "pinData": {},
}
out = pathlib.Path(__file__).with_name("langfuse_dataset_setup.json")
out.write_text(json.dumps(wf, indent=2), encoding="utf-8")
print("wrote", out, len(items), "items")
