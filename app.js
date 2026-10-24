const $ = (id) => document.getElementById(id);

const dropZone = $('dropZone');
const dropText = $('dropText');
const fileInput = $('fileInput');
const pasteInput = $('pasteInput');
const indentSelect = $('indentSelect');
const skipInvalid = $('skipInvalid');
const statusEl = $('status');
const statusText = $('statusText');
const progressBar = $('progressBar');
const errorsEl = $('errors');
const errorsSummary = $('errorsSummary');
const errorList = $('errorList');
const resultEl = $('result');
const stats = $('stats');
const textTab = $('textTab');
const tableHead = $('tableHead');
const vlistEl = $('vlist');
const note = $('note');
const toast = $('toast');

const ROW_HEIGHT = 20;
const COL_WIDTH = 180;
const NUM_COL_WIDTH = 64;
// Browsers cap element height (~33M px in Chrome); past this the scrollbar is scaled.
const MAX_SPACER_HEIGHT = 10_000_000;

const settings = { direction: 'auto', view: 'text' };
let lastInput = null;   // { file } or { text }, so option changes can re-run it
let current = null;     // summary of the last successful conversion
let baseName = 'converted';

// ---------- Worker ----------

let worker = null;
let busy = false;
let nextId = 1;
const pending = new Map();

function startWorker() {
  worker = new Worker('worker.js');
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    if ('progress' in data) return p.onProgress && p.onProgress(data.progress);
    pending.delete(data.id);
    data.error ? p.reject(new Error(data.error)) : p.resolve(data.result);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Worker crashed'));
    pending.clear();
  };
}

function call(type, payload = {}, onProgress) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    worker.postMessage({ id, type, ...payload });
  });
}

// A new conversion while one is running: drop the old worker rather than wait.
function restartWorker() {
  worker.terminate();
  for (const p of pending.values()) p.reject(new Error('cancelled'));
  pending.clear();
  startWorker();
}

startWorker();

// ---------- Input ----------

document.querySelectorAll('[data-input]').forEach((tab) => {
  tab.addEventListener('click', () => showInputTab(tab.dataset.input));
});

function showInputTab(name) {
  document.querySelectorAll('[data-input]').forEach((t) => t.classList.toggle('active', t.dataset.input === name));
  $('filePane').hidden = name !== 'file';
  $('pastePane').hidden = name !== 'paste';
  if (name === 'paste') pasteInput.focus();
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
  fileInput.value = '';
});

// The whole page is a drop target, so a slightly missed drop doesn't open the file in the tab.
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.body.classList.add('drag-over'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('drag-over'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// Paste anywhere outside the textarea converts straight away.
document.addEventListener('paste', (e) => {
  if (e.target === pasteInput) return;
  const file = e.clipboardData.files[0];
  if (file) { e.preventDefault(); loadFile(file); return; }
  const text = e.clipboardData.getData('text');
  if (!text.trim()) return;
  e.preventDefault();
  showInputTab('paste');
  pasteInput.value = text;
  loadText(text);
});

$('convertBtn').addEventListener('click', () => loadText(pasteInput.value));
pasteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); loadText(pasteInput.value); }
});

function loadFile(file) {
  showInputTab('file');
  dropText.textContent = file.name;
  baseName = file.name.replace(/\.(jsonl|ndjson|json|txt|log)$/i, '') || 'converted';
  lastInput = { file };
  run();
}

function loadText(text) {
  if (!text.trim()) { showToast('Nothing to convert', true); return; }
  baseName = 'converted';
  lastInput = { text };
  run();
}

// ---------- Options ----------

document.querySelectorAll('[data-dir]').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.direction = btn.dataset.dir;
    document.querySelectorAll('[data-dir]').forEach((b) => b.classList.toggle('active', b === btn));
    rerun();
  });
});
indentSelect.addEventListener('change', rerun);
skipInvalid.addEventListener('change', rerun);

function rerun() {
  if (lastInput) run();
}

// ---------- Conversion ----------

async function run() {
  if (busy) restartWorker();
  busy = true;
  setStatus('Parsing…', 0);
  try {
    const summary = await call('convert', {
      ...lastInput,
      direction: settings.direction,
      indent: Number(indentSelect.value),
      skipInvalid: skipInvalid.checked,
    }, (p) => setStatus('Parsing…', p));
    busy = false;
    setStatus(null);
    showSummary(summary);
  } catch (err) {
    if (err.message === 'cancelled') return;
    busy = false;
    setStatus(null);
    showToast(err.message, true);
  }
}

function showSummary(summary) {
  renderErrors(summary);

  if (!summary.ok) {
    current = null;
    resultEl.hidden = true;
    if (!summary.recordCount && summary.errorCount) {
      showToast(summary.direction === 'json2jsonl' ? 'Invalid JSON' : 'No valid lines found', true);
    } else {
      showToast(`${summary.errorCount} invalid line${plural(summary.errorCount)} — turn on “Skip invalid lines” to continue`, true);
    }
    return;
  }

  current = summary;
  resultEl.hidden = false;
  const toJsonl = summary.direction === 'json2jsonl';
  textTab.textContent = toJsonl ? 'JSONL' : 'JSON';
  $('downloadBtn').textContent = toJsonl ? 'Save .jsonl' : 'Save .json';
  stats.textContent = [
    `${summary.recordCount.toLocaleString()} record${plural(summary.recordCount)}`,
    summary.errorCount ? `${summary.errorCount.toLocaleString()} skipped` : null,
    `${formatBytes(summary.inputBytes)} → ${formatBytes(summary.outputBytes)}`,
    `${Math.round(summary.ms)} ms`,
  ].filter(Boolean).join(' · ');
  showView(settings.view);
  showToast(toJsonl ? 'Converted to JSONL' : 'Converted to JSON');
}

function renderErrors(summary) {
  errorList.replaceChildren();
  if (!summary.errorCount) { errorsEl.hidden = true; return; }
  errorsEl.hidden = false;
  const what = summary.direction === 'json2jsonl' ? 'JSON parse error' : `invalid line${plural(summary.errorCount)}`;
  errorsSummary.textContent = summary.direction === 'json2jsonl'
    ? what
    : `${summary.errorCount.toLocaleString()} ${what}${summary.ok ? ' skipped' : ''}`;
  for (const err of summary.errors) {
    const li = document.createElement('li');
    const where = document.createElement('span');
    where.className = 'err-line';
    where.textContent = err.line ? `Line ${err.line}: ` : '';
    const preview = document.createElement('span');
    preview.className = 'err-preview';
    preview.textContent = err.preview;
    li.append(where, err.message, preview);
    errorList.append(li);
  }
  if (summary.errorCount > summary.errors.length) {
    const li = document.createElement('li');
    li.textContent = `…and ${(summary.errorCount - summary.errors.length).toLocaleString()} more`;
    errorList.append(li);
  }
  errorsEl.open = summary.errorCount <= 5;
}

function setStatus(text, progress) {
  statusEl.hidden = !text;
  if (!text) return;
  statusText.textContent = progress ? `${text} ${Math.round(progress * 100)}%` : text;
  progressBar.style.width = `${Math.round((progress || 0) * 100)}%`;
}

// ---------- Virtualized viewer ----------
// Only the rows in view exist in the DOM; each scroll asks the worker for that window.

const spacer = document.createElement('div');
spacer.className = 'vl-spacer';
const rowsEl = document.createElement('div');
rowsEl.className = 'vl-rows';
vlistEl.append(spacer, rowsEl);

let rowCount = 0;
let contentWidth = 0;
let renderToken = 0;
let frame = 0;

vlistEl.addEventListener('scroll', () => {
  tableHead.scrollLeft = vlistEl.scrollLeft;
  scheduleRender();
});
new ResizeObserver(scheduleRender).observe(vlistEl);

function scheduleRender() {
  if (!frame) frame = requestAnimationFrame(() => { frame = 0; renderRows(); });
}

function setRows(count, width) {
  rowCount = count;
  contentWidth = width;
  spacer.style.height = `${Math.min(count * ROW_HEIGHT, MAX_SPACER_HEIGHT)}px`;
  spacer.style.width = `${width}px`;
  vlistEl.scrollTop = 0;
  vlistEl.scrollLeft = 0;
  rowsEl.replaceChildren();
  scheduleRender();
}

async function renderRows() {
  if (!current || !rowCount) return;
  const { scrollTop, scrollLeft, clientHeight, clientWidth } = vlistEl;
  const visible = Math.ceil(clientHeight / ROW_HEIGHT) + 1;
  let start, shift;
  if (rowCount * ROW_HEIGHT <= MAX_SPACER_HEIGHT) {
    start = Math.floor(scrollTop / ROW_HEIGHT);
    shift = scrollTop - start * ROW_HEIGHT;
  } else {
    const maxScroll = Math.max(1, vlistEl.scrollHeight - clientHeight);
    start = Math.round((scrollTop / maxScroll) * Math.max(0, rowCount - visible + 1));
    shift = 0;
  }

  const token = ++renderToken;
  const view = settings.view;
  let rows, colStart = 0;
  try {
    if (view === 'text') {
      rows = await call('lines', { start, count: visible });
    } else {
      colStart = Math.max(0, Math.floor((scrollLeft - NUM_COL_WIDTH) / COL_WIDTH));
      const colEnd = Math.ceil((scrollLeft + clientWidth - NUM_COL_WIDTH) / COL_WIDTH) + 1;
      rows = await call('rows', { start, count: visible, colStart, colEnd });
    }
  } catch {
    return;
  }
  if (token !== renderToken) return;

  rowsEl.style.transform = `translateY(${scrollTop}px)`;
  rowsEl.style.height = `${clientHeight}px`;
  rowsEl.style.width = `${Math.max(contentWidth, clientWidth)}px`;
  const inner = document.createElement('div');
  inner.style.transform = `translateY(${-shift}px)`;
  rows.forEach((row, i) => {
    inner.append(view === 'text' ? textRow(start + i, row) : tableRow(start + i, row, colStart));
  });
  rowsEl.replaceChildren(inner);
}

function textRow(index, line) {
  const el = document.createElement('div');
  el.className = 'vl-row';
  const ln = document.createElement('span');
  ln.className = 'ln';
  ln.textContent = index + 1;
  el.append(ln, line);
  return el;
}

function tableRow(index, cells, colStart) {
  const el = document.createElement('div');
  el.className = 'vl-row tr';
  el.append(cell('td num', index + 1, 0, NUM_COL_WIDTH));
  cells.forEach((text, i) => {
    const left = NUM_COL_WIDTH + (colStart + i) * COL_WIDTH;
    el.append(text === null ? cell('td empty', '—', left, COL_WIDTH) : cell('td', text, left, COL_WIDTH, text));
  });
  return el;
}

function cell(className, text, left, width, title) {
  const el = document.createElement('div');
  el.className = className;
  el.style.left = `${left}px`;
  el.style.width = `${width}px`;
  el.textContent = text;
  if (title && title.length > 20) el.title = title;
  return el;
}

const charWidth = (() => {
  const probe = document.createElement('span');
  probe.className = 'vl-row';
  probe.style.cssText = 'position:absolute;visibility:hidden';
  probe.textContent = 'x'.repeat(100);
  vlistEl.append(probe);
  const w = probe.getBoundingClientRect().width / 100 || 7.2;
  probe.remove();
  return w;
})();

// ---------- Views ----------

document.querySelectorAll('[data-view]').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});

function showView(view) {
  settings.view = view;
  document.querySelectorAll('[data-view]').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  if (!current) return;

  const notes = [];
  if (view === 'text') {
    tableHead.hidden = true;
    const gutter = 5.25 * charWidth;
    setRows(current.lineCount, gutter + current.maxLineLength * charWidth + 16);
    if (current.maxLineLength > 2000) notes.push('Very long lines are cut off in the preview; Copy and Download include everything.');
  } else {
    tableHead.hidden = false;
    const head = [cell('th num', '#', 0, NUM_COL_WIDTH)];
    current.columns.forEach((name) => head.push(cell('th', name, 0, COL_WIDTH, name)));
    head.forEach((h) => { h.style.position = 'static'; });
    tableHead.replaceChildren(...head);
    setRows(current.recordCount, NUM_COL_WIDTH + current.columns.length * COL_WIDTH);
    if (current.columnsTruncated) notes.push(`Showing the first ${current.columns.length} columns.`);
    notes.push('Nested values are shown as JSON. Hover a cell to see more.');
  }
  note.textContent = notes.join(' ');
  note.hidden = !notes.length;
}

// ---------- Copy / Download ----------

$('copyBtn').addEventListener('click', async () => {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(await call('export', { format: 'output' }));
    showToast('Copied');
  } catch (err) {
    showToast('Copy failed: ' + err.message, true);
  }
});

$('downloadBtn').addEventListener('click', async () => {
  if (!current) return;
  const toJsonl = current.direction === 'json2jsonl';
  download(await call('export', { format: 'output' }),
    `${baseName}.${toJsonl ? 'jsonl' : 'json'}`,
    toJsonl ? 'application/x-ndjson' : 'application/json');
});

$('csvBtn').addEventListener('click', async () => {
  if (!current) return;
  download(await call('export', { format: 'csv' }), `${baseName}.csv`, 'text/csv');
});

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Saved ${filename}`);
}

// ---------- Side panel vs. tab ----------

const inTab = new URLSearchParams(location.search).get('view') === 'tab';
const canOpenTab = typeof chrome !== 'undefined' && chrome.tabs;
document.body.classList.toggle('in-tab', inTab);
$('openTabBtn').hidden = inTab || !canOpenTab;
$('openTabBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('app.html?view=tab') });
});

// ---------- Helpers ----------

let toastTimer = 0;
function showToast(msg, error = false) {
  toast.textContent = msg;
  toast.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), error ? 3500 : 1500);
}

function plural(n) {
  return n === 1 ? '' : 's';
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
