import * as vscode from 'vscode';
import { SkillFile } from './scanner';
import { setAutoUpdate } from './frontmatter';

export interface OutdatedFile {
  skillFile: SkillFile;
  remoteContent: string;
}

/**
 * Opens the diff-based review flow for outdated skill files.
 * Processes one file at a time so the developer stays in control.
 */
export async function reviewOutdatedFiles(outdated: OutdatedFile[]): Promise<void> {
  for (const { skillFile, remoteContent } of outdated) {
    const action = await showDiffAndPrompt(skillFile, remoteContent);

    switch (action) {
      case 'accept':
        await applyUpdate(skillFile.uri, remoteContent);
        break;
      case 'disable':
        await disableAutoUpdate(skillFile.uri);
        break;
      case 'skip':
        // Do nothing, move to next file
        break;
      case 'cancel':
        return; // Stop reviewing remaining files
    }
  }
}

type ReviewAction = 'accept' | 'skip' | 'disable' | 'cancel';

async function showDiffAndPrompt(
  skillFile: SkillFile,
  remoteContent: string
): Promise<ReviewAction> {
  const relativePath = vscode.workspace.asRelativePath(skillFile.uri);

  // Create a virtual document for the remote content
  const remoteUri = vscode.Uri.parse(
    `skill-sync-remote:${relativePath}?ts=${Date.now()}`
  );

  const provider = new (class implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(): string {
      return remoteContent;
    }
  })();

  const registration = vscode.workspace.registerTextDocumentContentProvider(
    'skill-sync-remote',
    provider
  );

  try {
    // Open the diff editor
    await vscode.commands.executeCommand(
      'vscode.diff',
      skillFile.uri,
      remoteUri,
      `${relativePath} ↔ Remote${skillFile.parsed.frontmatter.version ? ` (v${skillFile.parsed.frontmatter.version})` : ''}`
    );

    // Prompt user for action
    const choice = await vscode.window.showInformationMessage(
      `Update available for ${relativePath}`,
      { modal: false },
      { title: 'Accept', id: 'accept' },
      { title: 'Skip', id: 'skip' },
      { title: 'Disable Auto-Update', id: 'disable' }
    );

    if (!choice) {
      return 'cancel';
    }
    return choice.id as ReviewAction;
  } finally {
    registration.dispose();
  }
}

async function applyUpdate(uri: vscode.Uri, remoteContent: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  const doc = await vscode.workspace.openTextDocument(uri);
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  edit.replace(uri, fullRange, remoteContent);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
}

async function disableAutoUpdate(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const content = doc.getText();
  const updated = setAutoUpdate(content, false);

  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(content.length)
  );
  edit.replace(uri, fullRange, updated);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
}
