import { Router } from 'express';
import { createOctokit, mapGitHubError } from '../../utils/github.js';

const router = Router();

/**
 * POST /api/repos
 * Fetch all repositories owned by the authenticated user (paginated).
 */
router.post('/', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required.' });

  const octokit = createOctokit(token);
  try {
    const raw = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page:    100,
      sort:        'updated',
      direction:   'desc',
      affiliation: 'owner',
    });

    const repos = raw.map((r) => ({
      id:          r.id,
      name:        r.name,
      full_name:   r.full_name,
      owner:       r.owner.login,
      url:         r.html_url,
      private:     r.private,
      description: r.description || '',
      language:    r.language    || null,
      stars:       r.stargazers_count,
      forks:       r.forks_count,
      updated_at:  r.updated_at,
      size:        r.size,
    }));

    return res.json({ repos, total: repos.length });
  } catch (err) {
    const status = err?.status === 401 ? 401 : 500;
    return res.status(status).json({ error: mapGitHubError(err) });
  }
});

export default router;
