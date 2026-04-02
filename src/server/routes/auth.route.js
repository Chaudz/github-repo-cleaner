import { Router } from 'express';
import { createOctokit, mapGitHubError } from '../../utils/github.js';

const router = Router();

/**
 * POST /api/auth
 * Verify token and return authenticated user info.
 */
router.post('/', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required.' });

  const octokit = createOctokit(token);
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return res.json({
      login:  user.login,
      avatar: user.avatar_url,
      name:   user.name,
    });
  } catch (err) {
    const status = err?.status === 401 ? 401 : 500;
    return res.status(status).json({ error: mapGitHubError(err) });
  }
});

export default router;
