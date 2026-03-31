import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { scanWorkspace, scanAllSkillFiles, SkillFile } from './scanner';
import { findOutdatedFiles } from './service';
import { setAutoUpdate } from './frontmatter';
import { OutdatedFile } from './reviewer';

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  authManager: AuthManager
): void {
  // Guard: vscode.chat may not exist if Copilot Chat is not installed
  if (!vscode.chat?.createChatParticipant) {
    console.log('[SkillSource] Copilot Chat not available — chat participant disabled.');
    return;
  }

  const participant = vscode.chat.createChatParticipant(
    'skillsource.participant',
    async (request, _context, response, token) => {
      switch (request.command) {
        case 'update':
          await handleUpdate(authManager, response, token);
          break;

        case 'status':
          await handleStatus(authManager, response, token);
          break;

        case 'token':
          await handleToken(authManager, response);
          break;

        case 'disable':
          await handleDisable(response);
          break;

        default:
          response.markdown(
            'Available commands:\n\n' +
            '- `/update` — Check and update all outdated skill files\n' +
            '- `/status` — Show sync status of all skill files\n' +
            '- `/token` — Set or update your GitHub PAT\n' +
            '- `/disable` — Set `auto_update: false` on the current file'
          );
      }
    }
  );

  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon-128.png');
  context.subscriptions.push(participant);
}

async function handleUpdate(
  authManager: AuthManager,
  response: vscode.ChatResponseStream,
  cancellation: vscode.CancellationToken
): Promise<void> {
  const token = await authManager.getToken();
  if (!token) {
    response.markdown('No GitHub token configured. Run `/token` to set one.');
    return;
  }

  response.markdown('Scanning workspace for skill files...\n\n');

  const skillFiles = await scanWorkspace();
  if (skillFiles.length === 0) {
    response.markdown('No tracked skill files found in this workspace.');
    return;
  }

  const config = vscode.workspace.getConfiguration('skillSync');
  const apiBaseUrl = config.get<string>('githubBaseUrl', 'https://api.github.com');

  const outdated = await findOutdatedFiles(skillFiles, token, apiBaseUrl);

  if (outdated.length === 0) {
    response.markdown('All skill files are up to date.');
    return;
  }

  response.markdown(
    `**${outdated.length} file(s) outdated:**\n\n` +
    outdated.map((o) => {
      const rel = vscode.workspace.asRelativePath(o.skillFile.uri);
      const ver = o.skillFile.parsed.frontmatter.version;
      return `- \`${rel}\`${ver ? ` (v${ver})` : ''}`;
    }).join('\n') +
    '\n'
  );

  for (const item of outdated) {
    const rel = vscode.workspace.asRelativePath(item.skillFile.uri);
    response.button({
      command: 'skillSync.acceptUpdate',
      title: `Accept: ${rel}`,
      arguments: [item.skillFile.uri.toString(), item.remoteContent],
    });
  }

  response.button({
    command: 'skillSync.checkForUpdates',
    title: 'Open Review Panel',
  });
}

async function handleStatus(
  authManager: AuthManager,
  response: vscode.ChatResponseStream,
  cancellation: vscode.CancellationToken
): Promise<void> {
  const allFiles = await scanAllSkillFiles();
  if (allFiles.length === 0) {
    response.markdown('No skill files found in this workspace.');
    return;
  }

  const token = await authManager.getToken();
  const config = vscode.workspace.getConfiguration('skillSync');
  const apiBaseUrl = config.get<string>('githubBaseUrl', 'https://api.github.com');

  // Split files into tracked vs manual
  const tracked = allFiles.filter(
    (f) => f.parsed.frontmatter.auto_update && f.resolvedSource
  );
  const manual = allFiles.filter((f) => !f.parsed.frontmatter.auto_update);
  const noSource = allFiles.filter(
    (f) => f.parsed.frontmatter.auto_update && !f.resolvedSource
  );

  // Check outdated status for tracked files if we have a token
  let outdatedUris = new Set<string>();
  if (token && tracked.length > 0) {
    const outdated = await findOutdatedFiles(tracked, token, apiBaseUrl);
    outdatedUris = new Set(outdated.map((o) => o.skillFile.uri.toString()));
  }

  let table = '| File | Status | Version |\n|---|---|---|\n';

  for (const sf of tracked) {
    const rel = vscode.workspace.asRelativePath(sf.uri);
    const ver = sf.parsed.frontmatter.version ?? '—';
    const isOutdated = outdatedUris.has(sf.uri.toString());
    const status = !token ? '🔒 no token' : isOutdated ? '↑ outdated' : '✓ up to date';
    table += `| \`${rel}\` | ${status} | ${ver} |\n`;
  }

  for (const sf of manual) {
    const rel = vscode.workspace.asRelativePath(sf.uri);
    const ver = sf.parsed.frontmatter.version ?? '—';
    table += `| \`${rel}\` | — manual | ${ver} |\n`;
  }

  for (const sf of noSource) {
    const rel = vscode.workspace.asRelativePath(sf.uri);
    table += `| \`${rel}\` | ⚠ no source URL | — |\n`;
  }

  response.markdown(table);
}

async function handleToken(
  authManager: AuthManager,
  response: vscode.ChatResponseStream
): Promise<void> {
  const token = await authManager.promptForToken();
  if (token) {
    response.markdown('GitHub token saved securely.');
  } else {
    response.markdown('Token setup cancelled.');
  }
}

async function handleDisable(
  response: vscode.ChatResponseStream
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    response.markdown('No file is currently open. Open a skill file first.');
    return;
  }

  const doc = editor.document;
  const fileName = doc.fileName;
  if (!fileName.endsWith('SKILL.md') && !fileName.endsWith('CLAUDE.md')) {
    response.markdown(
      `\`${vscode.workspace.asRelativePath(doc.uri)}\` doesn't look like a skill file. ` +
      'Open a `SKILL.md` or `CLAUDE.md` file first.'
    );
    return;
  }

  const content = doc.getText();
  const updated = setAutoUpdate(content, false);

  if (updated === content) {
    response.markdown('This file already has `auto_update: false` or has no frontmatter.');
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(content.length)
  );
  edit.replace(doc.uri, fullRange, updated);
  await vscode.workspace.applyEdit(edit);
  await doc.save();

  response.markdown(
    `\`auto_update\` set to \`false\` in \`${vscode.workspace.asRelativePath(doc.uri)}\`. ` +
    'SkillSource will no longer check this file for updates.'
  );
}
