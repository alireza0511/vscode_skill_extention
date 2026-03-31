import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Resolves the source URL for a skill file.
 *
 * Lookup order:
 *   1. `source` field in the file's own frontmatter (already parsed)
 *   2. `source.md` file in the same directory — supports:
 *      - A bare URL on the first non-empty line
 *      - A YAML frontmatter block with a `source` field
 *
 * Returns undefined if no source can be found.
 */
export async function resolveSource(
  skillFileUri: vscode.Uri,
  frontmatterSource: string | undefined
): Promise<string | undefined> {
  // Prefer the inline frontmatter source
  if (frontmatterSource) {
    return frontmatterSource;
  }

  // Fall back to source.md in the same directory
  const dir = path.dirname(skillFileUri.fsPath);
  const sourceUri = vscode.Uri.file(path.join(dir, 'source.md'));

  try {
    const doc = await vscode.workspace.openTextDocument(sourceUri);
    const content = doc.getText();
    return parseSourceFile(content);
  } catch {
    // source.md doesn't exist — that's fine
    return undefined;
  }
}

/**
 * Parses a source.md file. Supports two formats:
 *
 * Format 1 — bare URL:
 *   https://github.com/org/repo/blob/main/SKILL.md
 *
 * Format 2 — frontmatter:
 *   ---
 *   source: https://github.com/org/repo/blob/main/SKILL.md
 *   ---
 */
function parseSourceFile(content: string): string | undefined {
  const trimmed = content.trim();

  // Try frontmatter first
  const fmMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const match = line.match(/^\s*source:\s*(.+)/);
      if (match) {
        return stripQuotes(match[1].trim());
      }
    }
  }

  // Fall back to first non-empty line as a bare URL
  for (const line of trimmed.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#')) {
      continue;
    }
    if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
      return stripped;
    }
    break;
  }

  return undefined;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
