/**
 * Parse a GitHub URL into { owner, repo }.
 * Supports https://, ssh (git@), and .git suffix.
 * @param {string} url
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

/**
 * Parse a multi-line string of GitHub URLs.
 * Lines starting with # are treated as comments.
 * @param {string} rawText
 * @returns {{ valid: Array, invalid: string[] }}
 */
export function parseUrls(rawText) {
  const valid   = [];
  const invalid = [];

  for (const line of rawText.split('\n')) {
    const url = line.trim();
    if (!url || url.startsWith('#')) continue;
    const parsed = parseGitHubUrl(url);
    if (parsed) valid.push({ url, ...parsed });
    else        invalid.push(url);
  }

  return { valid, invalid };
}
