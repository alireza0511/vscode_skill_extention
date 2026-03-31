import * as vscode from 'vscode';
import { SkillFile } from './scanner';
import { parseGitHubUrl, fetchRemoteContent } from './github';
import { OutdatedFile } from './reviewer';

/**
 * Compares local skill files against their remote sources and returns
 * those that differ. Shared by the status bar flow and the chat participant.
 */
export async function findOutdatedFiles(
  skillFiles: SkillFile[],
  token: string,
  apiBaseUrl: string
): Promise<OutdatedFile[]> {
  const outdated: OutdatedFile[] = [];

  const results = await Promise.allSettled(
    skillFiles.map(async (sf) => {
      const ref = parseGitHubUrl(sf.resolvedSource!);
      if (!ref) {
        return null;
      }

      const remoteContent = await fetchRemoteContent(ref, token, apiBaseUrl);
      const doc = await vscode.workspace.openTextDocument(sf.uri);
      const localContent = doc.getText();

      if (remoteContent.trim() !== localContent.trim()) {
        return { skillFile: sf, remoteContent };
      }
      return null;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      outdated.push(result.value);
    } else if (result.status === 'rejected') {
      console.warn('[SkillSource]', result.reason);
    }
  }

  return outdated;
}
