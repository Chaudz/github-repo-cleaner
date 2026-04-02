import { state, $, showPage } from './state.js';
import { applyFilter }        from './repos.js';

// ── Token visibility toggle ────────────────────────────
$('eye-btn').addEventListener('click', () => {
  const inp = $('token-input');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// ── Trigger load on Enter ──────────────────────────────
$('token-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadRepos();
});

$('btn-load').addEventListener('click', loadRepos);

// ── Logout ─────────────────────────────────────────────
$('btn-logout').addEventListener('click', () => {
  state.token = '';
  state.allRepos = [];
  state.selected.clear();
  $('token-input').value = '';
  $('header-user').style.display = 'none';
  showPage('auth');
});

// ── Core: authenticate + fetch repos ──────────────────
export async function loadRepos() {
  const token = $('token-input').value.trim();
  if (!token) return alert('Please enter your GitHub token.');

  const btn     = $('btn-load');
  const spinner = $('load-spinner');
  btn.disabled  = true;
  spinner.style.display = 'inline-block';

  try {
    // Step 1: verify token
    const authRes  = await fetch('/api/auth', jsonPost({ token }));
    const authData = await authRes.json();
    if (!authRes.ok) { alert('Auth error: ' + authData.error); return; }

    state.token = token;
    updateHeaderUser(authData);

    // Step 2: fetch repos
    showPage('main');
    renderSkeletons();

    const reposRes  = await fetch('/api/repos', jsonPost({ token }));
    const reposData = await reposRes.json();
    if (!reposRes.ok) { alert('Error: ' + reposData.error); showPage('auth'); return; }

    state.allRepos = reposData.repos;
    state.selected.clear();
    applyFilter();

  } catch (err) {
    alert('Network error: ' + err.message);
    showPage('auth');
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
  }
}

// ── Helpers ───────────────────────────────────────────
function jsonPost(body) {
  return {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  };
}

function updateHeaderUser({ login, avatar }) {
  $('hd-avatar').src         = avatar;
  $('hd-login').textContent  = login;
  $('header-user').style.display = 'flex';
}

function renderSkeletons() {
  $('repo-grid').innerHTML = Array.from({ length: 8 }, () =>
    `<div class="skeleton skeleton-row"></div>`
  ).join('');
}
