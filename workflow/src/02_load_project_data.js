// Load Project Data — the grounding source. The four project files are embedded so the workflow runs anywhere
// (n8n Cloud or self-hosted). To use live data instead, replace this node with Read File / Google Drive / Trello nodes
// that output the same { description, timeline, risks, tasks } shape.
const FILES = __FILES__;

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  const header = rows.shift().map(h => h.trim());
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

const project = {
  name: 'AI Adoption Project — ABCDE Ltd.',
  description: FILES.description.trim(),
  timeline: parseCSV(FILES.timeline).map(p => ({ ...p, phase: Number(p.phase), start_week: Number(p.start_week), end_week: Number(p.end_week) })),
  risks: parseCSV(FILES.risks),
  tasks: parseCSV(FILES.tasks),
};

return [{ json: { ...$input.first().json, project } }];
