import { Router } from 'express';
import { createOctokit, mapGitHubError } from '../../utils/github.js';

const DELETION_DELAY_MS = 350;
const router = Router();

/**
 * POST /api/delete
 * Delete selected repositories, streaming progress via Server-Sent Events.
 * Body: { token: string, repos: Array<{ owner, name }> }
 */
router.post('/', async (req, res) => {
  const { token, repos } = req.body;

  if (!token || !Array.isArray(repos) || repos.length === 0) {
    return res.status(400).json({ error: 'token and repos[] are required.' });
  }

  // Set up SSE stream
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const octokit = createOctokit(token);

  for (let i = 0; i < repos.length; i++) {
    const { owner, name } = repos[i];

    send({ type: 'progress', index: i, total: repos.length, owner, repo: name });

    try {
      await octokit.repos.delete({ owner, repo: name });
      send({ type: 'result', index: i, owner, repo: name, status: 'success' });
    } catch (err) {
      send({
        type:   'result',
        index:  i,
        owner,
        repo:   name,
        status: 'failed',
        reason: mapGitHubError(err),
      });
    }

    if (i < repos.length - 1) {
      await new Promise((r) => setTimeout(r, DELETION_DELAY_MS));
    }
  }

  send({ type: 'done' });
  res.end();
});

export default router;
