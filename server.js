import express from 'express';
import { Octokit } from '@octokit/rest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─────────────────────────────────────────────
// POST /api/auth — Verify token + get user info
// ─────────────────────────────────────────────
app.post('/api/auth', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required.' });

  const octokit = new Octokit({ auth: token });
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return res.json({ login: user.login, avatar: user.avatar_url, name: user.name });
  } catch (err) {
    const status = err?.status;
    if (status === 401) return res.status(401).json({ error: 'Invalid or expired token.' });
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/repos — Fetch all repos (paginated)
// ─────────────────────────────────────────────
app.post('/api/repos', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required.' });

  const octokit = new Octokit({ auth: token });
  try {
    // Use paginate to get all repos automatically
    const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
      affiliation: 'owner', // only repos the user owns (not collaborator/org)
    });

    const result = repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner.login,
      url: r.html_url,
      private: r.private,
      description: r.description || '',
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updated_at: r.updated_at,
      size: r.size,
    }));

    return res.json({ repos: result, total: result.length });
  } catch (err) {
    const status = err?.status;
    if (status === 401) return res.status(401).json({ error: 'Invalid or expired token.' });
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/delete — Delete selected repos (SSE)
// ─────────────────────────────────────────────
app.post('/api/delete', async (req, res) => {
  const { token, repos } = req.body;

  if (!token || !repos?.length) {
    return res.status(400).json({ error: 'Token and repos are required.' });
  }

  // Server-Sent Events setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const octokit = new Octokit({ auth: token });

  for (let i = 0; i < repos.length; i++) {
    const { owner, name } = repos[i];
    send({ type: 'progress', index: i, total: repos.length, owner, repo: name, status: 'deleting' });

    try {
      await octokit.repos.delete({ owner, repo: name });
      send({ type: 'result', index: i, owner, repo: name, status: 'success' });
    } catch (err) {
      let reason = err?.message || 'Unknown error';
      const status = err?.status;
      if (status === 403) reason = 'Permission denied — token missing Administration: Write scope';
      else if (status === 404) reason = 'Repo not found or already deleted';
      else if (status === 401) reason = 'Unauthorized — invalid token';
      send({ type: 'result', index: i, owner, repo: name, status: 'failed', reason });
    }

    if (i < repos.length - 1) await new Promise((r) => setTimeout(r, 350));
  }

  send({ type: 'done' });
  res.end();
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GitHub Repo Deleter UI → http://localhost:${PORT}\n`);
});
