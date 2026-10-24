// Parsing runs here so large files never freeze the UI. The worker keeps the last
// result and hands the page small windows of it (lines or table rows) on request.

const MAX_LINE_CHARS = 2000;
const MAX_COLUMNS = 500;
const MAX_CELL_CHARS = 300;
const MAX_ERRORS = 1000;

let state = null; // { records, outputText, lines, maxLineLength, columns, columnsTruncated, direction }

self.onmessage = async ({ data }) => {
  const reply = (payload) => self.postMessage({ id: data.id, ...payload });
  try {
    switch (data.type) {
      case 'convert':
        reply({ result: await convert(data, (progress) => reply({ progress })) });
        break;
      case 'lines':
        reply({ result: state.lines.slice(data.start, data.start + data.count).map(clipLine) });
        break;
      case 'rows':
        reply({ result: getRows(data.start, data.count, data.colStart, data.colEnd) });
        break;
      case 'export':
        reply({ result: data.format === 'csv' ? toCsv() : state.outputText });
        break;
      default:
        throw new Error('Unknown request: ' + data.type);
    }
  } catch (err) {
    reply({ error: err.message || String(err) });
  }
};

async function convert({ file, text, direction, indent, skipInvalid }, onProgress) {
  state = null;
  const started = performance.now();
  if (file) text = await file.text();
  text = text.replace(/^﻿/, '');
  const inputBytes = file ? file.size : new Blob([text]).size;

  let parsedWhole;
  if (direction === 'auto') {
    ({ direction, parsedWhole } = detectDirection(text, file && file.name));
  }

  const { records, errors, totalLines } = direction === 'json2jsonl'
    ? parseJson(text, parsedWhole)
    : parseJsonl(text, onProgress);

  const summary = {
    direction,
    totalLines,
    recordCount: records.length,
    errors: errors.slice(0, MAX_ERRORS),
    errorCount: errors.length,
    inputBytes,
  };

  // In strict mode any bad line means no output; same if nothing parsed at all.
  if ((errors.length && !skipInvalid) || (errors.length && !records.length)) {
    return { ...summary, ok: false, ms: performance.now() - started };
  }

  let outputText;
  if (direction === 'json2jsonl') {
    outputText = records.map((r) => JSON.stringify(r)).join('\n');
  } else {
    outputText = JSON.stringify(records, null, indent || undefined);
  }
  const lines = outputText.split('\n');
  let maxLineLength = 0;
  for (const line of lines) if (line.length > maxLineLength) maxLineLength = line.length;

  const { columns, truncated } = collectColumns(records);
  state = {
    records, outputText, lines, direction, columns,
    columnsTruncated: truncated,
    maxLineLength: Math.min(maxLineLength, MAX_LINE_CHARS + 1),
  };

  return {
    ...summary,
    ok: true,
    lineCount: lines.length,
    maxLineLength: state.maxLineLength,
    columns: columns.map((c) => (c === null ? '(value)' : c)),
    columnsTruncated: truncated,
    outputBytes: new Blob([outputText]).size,
    ms: performance.now() - started,
  };
}

function detectDirection(text, name) {
  const lower = (name || '').toLowerCase();
  if (/\.(jsonl|ndjson)$/.test(lower)) return { direction: 'jsonl2json' };
  const trimmed = text.trimStart();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsedWhole = JSON.parse(text);
      // A single-line object is ambiguous; treat it as one JSONL record.
      if (Array.isArray(parsedWhole) || lower.endsWith('.json')) {
        return { direction: 'json2jsonl', parsedWhole };
      }
    } catch {
      // Not one JSON document, so it's JSON Lines.
    }
  }
  return { direction: 'jsonl2json' };
}

function parseJsonl(text, onProgress) {
  const records = [];
  const errors = [];
  const rawLines = text.split('\n');
  const step = Math.max(10000, Math.floor(rawLines.length / 50));
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      errors.push({ line: i + 1, message: err.message, preview: line.slice(0, 120) });
    }
    if (i % step === 0) onProgress(i / rawLines.length);
  }
  return { records, errors, totalLines: rawLines.length };
}

function parseJson(text, parsedWhole) {
  const totalLines = countLines(text);
  let value = parsedWhole;
  if (value === undefined) {
    try {
      value = JSON.parse(text);
    } catch (err) {
      const match = /position (\d+)/.exec(err.message);
      const line = match ? countLines(text.slice(0, Number(match[1]))) : null;
      const preview = line ? text.split('\n')[line - 1].trim().slice(0, 120) : '';
      return { records: [], errors: [{ line, message: err.message, preview }], totalLines };
    }
  }
  return { records: Array.isArray(value) ? value : [value], errors: [], totalLines };
}

function countLines(text) {
  let n = 1;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) n++;
  return n;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Columns are top-level keys in order of first appearance. `null` stands for
// records that aren't objects (numbers, strings, arrays); they get a "(value)" column.
function collectColumns(records) {
  const seen = new Set();
  let hasNonObject = false;
  let truncated = false;
  for (const r of records) {
    if (!isPlainObject(r)) { hasNonObject = true; continue; }
    if (truncated) continue;
    for (const key in r) {
      if (seen.has(key)) continue;
      if (seen.size >= MAX_COLUMNS) { truncated = true; break; }
      seen.add(key);
    }
  }
  const columns = [...seen];
  if (hasNonObject) columns.unshift(null);
  return { columns, truncated };
}

function cellValue(record, column) {
  if (column === null) return isPlainObject(record) ? undefined : record;
  return isPlainObject(record) ? record[column] : undefined;
}

function cellText(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function getRows(start, count, colStart, colEnd) {
  const cols = state.columns.slice(colStart, colEnd);
  return state.records.slice(start, start + count).map((r) =>
    cols.map((c) => {
      const text = cellText(cellValue(r, c));
      return text === undefined ? null : text.slice(0, MAX_CELL_CHARS);
    })
  );
}

function clipLine(line) {
  return line.length > MAX_LINE_CHARS ? line.slice(0, MAX_LINE_CHARS) + ' …' : line;
}

function csvEscape(text) {
  if (text === undefined) return '';
  // Keep spreadsheets from evaluating cells as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv() {
  const { columns, records } = state;
  const out = [columns.map((c) => csvEscape(c === null ? '(value)' : c)).join(',')];
  for (const r of records) {
    out.push(columns.map((c) => {
      const v = cellValue(r, c);
      return typeof v === 'number' || typeof v === 'boolean' ? String(v) : csvEscape(cellText(v));
    }).join(','));
  }
  // BOM so Excel opens UTF-8 correctly.
  return '﻿' + out.join('\r\n');
}
