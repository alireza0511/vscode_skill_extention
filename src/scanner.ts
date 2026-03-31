import * as vscode from 'vscode';
import { parseFrontmatter, ParsedSkillFile } from './frontmatter';
import { resolveSource } from './sourceResolver';

export interface SkillFile {
  uri: vscode.Uri;
  parsed: ParsedSkillFile;
  /** Resolved source URL — may come from frontmatter or a sibling source.md */
  resolvedSource?: string;
}

/**
 * Scans the workspace for SKILL.md / CLAUDE.md files that have
 * auto_update: true and a resolved source URL.
 */
export async function scanWorkspace(): Promise<SkillFile[]> {
  const all = await scanAllSkillFiles();
  return all.filter((sf) => sf.parsed.frontmatter.auto_update && sf.resolvedSource);
}

/**
 * Scans the workspace for all SKILL.md / CLAUDE.md files,
 * regardless of auto_update or source presence.
 * For each file, attempts to resolve the source URL from
 * frontmatter first, then from a sibling source.md.
 */
export async function scanAllSkillFiles(): Promise<SkillFile[]> {
  const config = vscode.workspace.getConfiguration('skillSync');
  const patterns: string[] = config.get('filePatterns', ['**/SKILL.md', '**/CLAUDE.md']);

  const results: SkillFile[] = [];

  for (const pattern of patterns) {
    const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    for (const uri of uris) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const content = doc.getText();
      const parsed = parseFrontmatter(content);

      if (!parsed) {
        continue;
      }

      const resolvedSource = await resolveSource(uri, parsed.frontmatter.source);

      results.push({ uri, parsed, resolvedSource });
    }
  }

  return results;
}
