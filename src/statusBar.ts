import * as vscode from 'vscode';

export type StatusBarState = 'up-to-date' | 'outdated' | 'checking' | 'auth-missing';

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private outdatedCount = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.show();
    this.setState('checking');
  }

  setState(state: StatusBarState, count?: number): void {
    switch (state) {
      case 'up-to-date':
        this.item.text = '$(check) Skills';
        this.item.tooltip = 'All skill files are up to date';
        this.item.command = 'skillSync.checkForUpdates';
        this.item.backgroundColor = undefined;
        break;

      case 'outdated':
        this.outdatedCount = count ?? this.outdatedCount;
        this.item.text = `$(zap) Skills ${this.outdatedCount}↑`;
        this.item.tooltip = `${this.outdatedCount} skill file(s) have updates available. Click to review.`;
        this.item.command = 'skillSync.checkForUpdates';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;

      case 'checking':
        this.item.text = '$(sync~spin) Skills';
        this.item.tooltip = 'Checking for skill file updates...';
        this.item.command = undefined;
        this.item.backgroundColor = undefined;
        break;

      case 'auth-missing':
        this.item.text = '$(lock) Skills';
        this.item.tooltip = 'GitHub token required. Click to set up.';
        this.item.command = 'skillSync.setToken';
        this.item.backgroundColor = undefined;
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
