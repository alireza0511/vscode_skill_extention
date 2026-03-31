import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { StatusBarManager } from './statusBar';
import { scanWorkspace } from './scanner';
import { findOutdatedFiles } from './service';
import { reviewOutdatedFiles, OutdatedFile } from './reviewer';
import { registerChatParticipant } from './chatParticipant';

let statusBar: StatusBarManager;
let authManager: AuthManager;
let lastOutdated: OutdatedFile[] = [];

export function activate(context: vscode.ExtensionContext): void {
  authManager = new AuthManager(context.secrets);
  statusBar = new StatusBarManager();

  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('skillSync.checkForUpdates', () => handleCheckForUpdates()),
    vscode.commands.registerCommand('skillSync.setToken', () => handleSetToken()),
    vscode.commands.registerCommand('skillSync.clearToken', () => handleClearToken()),
    vscode.commands.registerCommand('skillSync.acceptUpdate', handleAcceptUpdate)
  );

  // Register Copilot chat participant
  registerChatParticipant(context, authManager);

  // Run initial check on activation
  handleCheckForUpdates();
}

export function deactivate(): void {
  // StatusBar disposed via subscriptions
}

async function handleCheckForUpdates(): Promise<void> {
  const token = await authManager.getToken();
  if (!token) {
    statusBar.setState('auth-missing');
    const action = await vscode.window.showWarningMessage(
      'Skill Sync needs a GitHub token to check for updates.',
      'Set Token',
      'Later'
    );
    if (action === 'Set Token') {
      await handleSetToken();
      const newToken = await authManager.getToken();
      if (newToken) {
        return handleCheckForUpdates();
      }
    }
    return;
  }

  statusBar.setState('checking');

  try {
    const skillFiles = await scanWorkspace();

    if (skillFiles.length === 0) {
      statusBar.setState('up-to-date');
      return;
    }

    const config = vscode.workspace.getConfiguration('skillSync');
    const apiBaseUrl = config.get<string>('githubBaseUrl', 'https://api.github.com');

    const outdated = await findOutdatedFiles(skillFiles, token, apiBaseUrl);
    lastOutdated = outdated;

    if (outdated.length === 0) {
      statusBar.setState('up-to-date');
      return;
    }

    statusBar.setState('outdated', outdated.length);

    const action = await vscode.window.showInformationMessage(
      `${outdated.length} skill file(s) are outdated.`,
      'Review',
      'Later'
    );

    if (action === 'Review') {
      await reviewOutdatedFiles(outdated);
      await handleCheckForUpdates();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('auth failed')) {
      statusBar.setState('auth-missing');
      const action = await vscode.window.showErrorMessage(
        `Skill Sync: ${message}`,
        'Update Token'
      );
      if (action === 'Update Token') {
        await handleSetToken();
      }
    } else {
      statusBar.setState('up-to-date');
      vscode.window.showErrorMessage(`Skill Sync: ${message}`);
    }
  }
}

async function handleSetToken(): Promise<void> {
  const token = await authManager.promptForToken();
  if (token) {
    vscode.window.showInformationMessage('Skill Sync: GitHub token saved.');
    await handleCheckForUpdates();
  }
}

async function handleClearToken(): Promise<void> {
  await authManager.clearToken();
  statusBar.setState('auth-missing');
  vscode.window.showInformationMessage('Skill Sync: GitHub token cleared.');
}

async function handleAcceptUpdate(uriString: string, remoteContent: string): Promise<void> {
  const uri = vscode.Uri.parse(uriString);
  const doc = await vscode.workspace.openTextDocument(uri);
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  edit.replace(uri, fullRange, remoteContent);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
  vscode.window.showInformationMessage(
    `Skill Sync: Updated ${vscode.workspace.asRelativePath(uri)}`
  );
}
