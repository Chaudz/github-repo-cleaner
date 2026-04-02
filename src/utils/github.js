import { Octokit } from '@octokit/rest';

/**
 * Create an authenticated Octokit instance.
 * @param {string} token - GitHub Personal Access Token
 */
export function createOctokit(token) {
  return new Octokit({ auth: token });
}

/**
 * Map an Octokit HTTP error to a human-readable message.
 * @param {Error} err
 */
export function mapGitHubError(err) {
  switch (err?.status) {
    case 401: return 'Unauthorized — invalid or expired token.';
    case 403: return 'Permission denied — token missing Administration: Write scope.';
    case 404: return 'Repository not found or already deleted.';
    default:  return err?.message ?? 'Unknown GitHub API error.';
  }
}
