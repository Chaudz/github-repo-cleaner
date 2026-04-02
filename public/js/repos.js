import { state, $ } from './state.js';
import { timeAgo, escHtml } from './utils.js';

// ── Filter buttons ─────────────────────────────────────
['all', 'public', 'private'].forEach((f) => {
  $(`filter-${f}`).addEventListener('click', () => {
    state.currentFilter = f;
    applyFilter();
  });
});

$('search-input').addEventListener('input', applyFilter);

// ── Select all / clear ─────────────────────────────────
$('btn-select-all').addEventListener('click', () => {
  state.filtered.forEach((r) => state.selected.add(r.full_name));
  renderRepos();
  updateStats();
  updateActionBar();
});

$('btn-clear-sel').addEventListener('click', clearSelection);
$('ab-clear').addEventListener('click', clearSelection);

export function clearSelection() {
  state.selected.clear();
  renderRepos();
  updateStats();
  updateActionBar();
}

// ── Apply filter + search ──────────────────────────────
export function applyFilter() {
  const q = $('search-input').value.toLowerCase();

  state.filtered = state.allRepos.filter((r) => {
    if (state.currentFilter === 'public'  &&  r.private) return false;
    if (state.currentFilter === 'private' && !r.private) return false;
    if (q && !r.full_name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
    return true;
  });

  ['all', 'public', 'private'].forEach((f) => {
    $(`filter-${f}`).classList.toggle('active', state.currentFilter === f);
  });

  renderRepos();
  updateStats();
}

// ── Render repo list ───────────────────────────────────
export function renderRepos() {
  const grid = $('repo-grid');

  if (state.filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>No repositories found.</p></div>`;
    return;
  }

  grid.innerHTML = state.filtered.map((r) => {
    const isSel = state.selected.has(r.full_name);
    return `
      <div class="repo-card ${isSel ? 'selected' : ''}" data-full="${r.full_name}">
        <div class="repo-check">${isSel ? '✓' : ''}</div>
        <div class="repo-body">
          <div class="repo-name-row">
            <span class="repo-name">${r.full_name}</span>
            <span class="badge ${r.private ? 'badge-private' : 'badge-public'}">${r.private ? '🔒 Private' : '🌐 Public'}</span>
            ${r.language ? `<span class="badge badge-lang">${r.language}</span>` : ''}
          </div>
          ${r.description ? `<div class="repo-desc">${escHtml(r.description)}</div>` : ''}
        </div>
        <div class="repo-meta">
          <span>⭐ ${r.stars}</span>
          <span>${timeAgo(r.updated_at)}</span>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.repo-card').forEach((card) => {
    card.addEventListener('click', () => toggleSelect(card.dataset.full));
  });
}

// ── Toggle a single repo selection ────────────────────
export function toggleSelect(fullName) {
  if (state.selected.has(fullName)) state.selected.delete(fullName);
  else state.selected.add(fullName);

  renderRepos();
  updateStats();
  updateActionBar();
}

// ── Stats bar ──────────────────────────────────────────
export function updateStats() {
  $('stat-total').textContent   = state.allRepos.length;
  $('stat-showing').textContent = state.filtered.length;
  $('stat-selected').textContent = state.selected.size;
  $('stat-sel-wrap').style.display = state.selected.size > 0 ? 'flex' : 'none';
}

// ── Floating action bar ────────────────────────────────
export function updateActionBar() {
  $('ab-count').textContent = state.selected.size;
  $('action-bar').classList.toggle('show', state.selected.size > 0);
}
