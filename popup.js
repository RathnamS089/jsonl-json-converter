const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const result = document.getElementById('result');
const jsonOutput = document.getElementById('jsonOutput');
const stats = document.getElementById('stats');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toast = document.getElementById('toast');

let currentJson = null;
let currentFilename = null;

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.trim().split('\n').filter(l => l.trim());
      const jsonArray = lines.map(line => JSON.parse(line));
      currentJson = JSON.stringify(jsonArray, null, 2);
      currentFilename = file.name.replace(/\.jsonl$/i, '.json');
      jsonOutput.textContent = currentJson;
      stats.textContent = `${lines.length} lines`;
      result.classList.add('show');
      showToast('Converted');
    } catch (err) {
      showToast('Invalid JSONL: ' + err.message, true);
    }
  };
  reader.readAsText(file);
}

copyBtn.addEventListener('click', async () => {
  if (!currentJson) return;
  await navigator.clipboard.writeText(currentJson);
  showToast('Copied');
});

downloadBtn.addEventListener('click', () => {
  if (!currentJson) return;
  const blob = new Blob([currentJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded');
});

function showToast(msg, error = false) {
  toast.textContent = msg;
  toast.className = 'toast' + (error ? ' error' : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}