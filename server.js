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
//  Helpers
// ─────────────────────────────────────────────
function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

function parseUrls(rawText) {
  const lines = rawText.split('\n');
  const valid = [];
  const invalid = [];
  for (const line of lines) {
    const url = line.trim();
    if (!url || url.startsWith('#')) continue;
    const parsed = parseGitHubUrl(url);
    if (parsed) valid.push({ url, ...parsed });
    else invalid.push(url);
  }
  return { valid, invalid };
}

// ─────────────────────────────────────────────
//  POST /api/preview — Validate token + parse URLs
// ─────────────────────────────────────────────
app.post('/api/preview', async (req, res) => {
  const { token, urlsText } = req.body;

  if (!token) return res.status(400).json({ error: 'GitHub token is required.' });
  if (!urlsText) return res.status(400).json({ error: 'No URLs provided.' });

  // Verify token
  const octokit = new Octokit({ auth: token });
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    const { valid, invalid } = parseUrls(urlsText);
    return res.json({ user: user.login, avatar: user.avatar_url, valid, invalid });
  } catch (err) {
    const status = err?.status;
    if (status === 401) return res.status(401).json({ error: 'Invalid or expired token.' });
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/delete — Delete repos with SSE stream
// ─────────────────────────────────────────────
app.post('/api/delete', async (req, res) => {
  const { token, repos } = req.body; // repos: [{ owner, repo, url }]

  if (!token || !repos?.length) {
    return res.status(400).json({ error: 'Token and repos are required.' });
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const octokit = new Octokit({ auth: token });

  for (let i = 0; i < repos.length; i++) {
    const { owner, repo, url } = repos[i];
    send({ type: 'progress', index: i, total: repos.length, owner, repo, status: 'deleting' });

    try {
      await octokit.repos.delete({ owner, repo });
      send({ type: 'result', index: i, owner, repo, url, status: 'success' });
    } catch (err) {
      let reason = err?.message || 'Unknown error';
      const status = err?.status;
      if (status === 403) reason = 'Permission denied (missing Administration: Write scope)';
      else if (status === 404) reason = 'Repo not found or already deleted';
      else if (status === 401) reason = 'Unauthorized — invalid token';
      send({ type: 'result', index: i, owner, repo, url, status: 'failed', reason });
    }

    // Rate-limit delay
    if (i < repos.length - 1) await new Promise((r) => setTimeout(r, 400));
  }

  send({ type: 'done' });
  res.end();
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GitHub Repo Deleter UI running at: http://localhost:${PORT}\n`);
});
