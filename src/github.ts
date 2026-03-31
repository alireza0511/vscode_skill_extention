import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface GitHubFileRef {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

/**
 * Parses a GitHub blob URL into its components.
 * Supports:
 *   https://github.com/owner/repo/blob/branch/path/to/FILE.md
 *   https://github.enterprise.com/owner/repo/blob/branch/path/to/FILE.md
 */
export function parseGitHubUrl(url: string): GitHubFileRef | null {
  try {
    const parsed = new URL(url);
    // pathname: /owner/repo/blob/branch/path...
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 5 || parts[2] !== 'blob') {
      return null;
    }
    return {
      owner: parts[0],
      repo: parts[1],
      branch: parts[3],
      path: parts.slice(4).join('/'),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches raw file content from GitHub's API.
 */
export async function fetchRemoteContent(
  ref: GitHubFileRef,
  token: string,
  apiBaseUrl: string
): Promise<string> {
  // Use the contents API with raw media type
  const url = `${apiBaseUrl}/repos/${ref.owner}/${ref.repo}/contents/${ref.path}?ref=${ref.branch}`;

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.raw+json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'skill-sync-vscode',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode === 200) {
          resolve(body);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`GitHub auth failed (${res.statusCode}). Check your token.`));
        } else if (res.statusCode === 404) {
          reject(new Error(`File not found: ${ref.owner}/${ref.repo}/${ref.path}@${ref.branch}`));
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
