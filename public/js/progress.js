import { state, $, showPage } from './state.js';
import { clearSelection, applyFilter } from './repos.js';
import { loadRepos } from './auth.js';

// ── Open modal on "Delete Selected" ───────────────────
$('ab-delete').addEventListener('click', () => {
  if (state.selected.size === 0) return;
  $('modal-count').textContent = state.selected.size;
  $('confirm-input').value     = '';
  $('modal-ok').disabled       = true;
  $('modal').classList.remove('hidden');
  setTimeout(() => $('confirm-input').focus(), 100);
});

// ── Close modal ────────────────────────────────────────
$('modal-cancel').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });

$('confirm-input').addEventListener('input', (e) => {
  $('modal-ok').disabled = e.target.value !== 'DELETE';
});

$('modal-ok').addEventListener('click', () => { closeModal(); startDeletion(); });

function closeModal() { $('modal').classList.add('hidden'); }

// ── Stream deletion via SSE ────────────────────────────
async function startDeletion() {
  const toDelete = state.allRepos.filter((r) => state.selected.has(r.full_name));

  showPage('progress');
  $('prog-title').textContent   = `⚙️ Deleting ${toDelete.length} Repositories...`;
  $('prog-sub').textContent     = 'Please keep this window open until the process completes.';
  $('summary-grid').style.display = 'none';
  $('btn-done').style.display     = 'none';
  $('action-bar').classList.remove('show');

  // Render pending list
  $('result-list').innerHTML = toDelete.map((r, i) => `
    <div class="result-item" id="ri-${i}">
      <span id="ri-icon-${i}">📦</span>
      <div style="flex:1;min-width:0">
        <div class="name">${r.full_name}</div>
        <div class="r-reason" id="ri-reason-${i}" style="display:none"></div>
      </div>
      <span class="r-status r-pending" id="ri-status-${i}">Pending</span>
    </div>
  `).join('');

  let done = 0, succeeded = 0, failed = 0;

  try {
    const res = await fetch('/api/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: state.token, repos: toDelete }),
    });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    while (true) {
      const { done: sd, value } = await reader.read();
      if (sd) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const ev = JSON.parse(line.slice(6));
        if      (ev.type === 'progress') updateItem(ev.index, 'deleting');
        else if (ev.type === 'result')   { updateItem(ev.index, ev.status, ev.reason); ev.status === 'success' ? succeeded++ : failed++; done++; }
        else if (ev.type === 'done')     showSummary(toDelete.length, succeeded, failed);
      }
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  }
}

function updateItem(i, status, reason) {
  const statusEl = $(`ri-status-${i}`);
  const iconEl   = $(`ri-icon-${i}`);
  const reasonEl = $(`ri-reason-${i}`);

  if (status === 'deleting') {
    statusEl.className   = 'r-status r-deleting';
    statusEl.textContent = 'Deleting…';
    iconEl.textContent   = '⏳';
    $(`ri-${i}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (status === 'success') {
    statusEl.className   = 'r-status r-success';
    statusEl.textContent = '✅ Deleted';
    iconEl.textContent   = '✅';
  } else {
    statusEl.className   = 'r-status r-failed';
    statusEl.textContent = '❌ Failed';
    iconEl.textContent   = '❌';
    if (reason) { reasonEl.style.display = 'block'; reasonEl.textContent = reason; }
  }

  const total = state.allRepos.filter((r) => state.selected.has(r.full_name)).length;
  const done  = document.querySelectorAll('.r-success, .r-failed').length;
  const pct   = Math.round((done / total) * 100);
  $('bar-fill').style.width = pct + '%';
  $('bar-text').textContent = `${done} / ${total}`;
  $('bar-pct').textContent  = pct + '%';
}

function showSummary(total, succeeded, failed) {
  $('prog-title').textContent   = '✅ Deletion Complete';
  $('prog-sub').textContent     = 'See the summary below.';
  const sg = $('summary-grid');
  sg.style.display = 'flex';
  sg.innerHTML = `
    <div class="sum-card"><div class="sum-num c-total">${total}</div><div class="sum-label">Total</div></div>
    <div class="sum-card"><div class="sum-num c-success">${succeeded}</div><div class="sum-label">Deleted</div></div>
    <div class="sum-card"><div class="sum-num c-failed">${failed}</div><div class="sum-label">Failed</div></div>
  `;
  sg.scrollIntoView({ behavior: 'smooth' });
  $('btn-done').style.display = 'block';
}

// ── Done → reload repo list ────────────────────────────
$('btn-done').addEventListener('click', () => {
  clearSelection();
  applyFilter();
  loadRepos();
});
