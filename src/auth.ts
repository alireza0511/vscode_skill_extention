import * as vscode from 'vscode';

const SECRET_KEY = 'skillSync.githubToken';

export class AuthManager {
  constructor(private secrets: vscode.SecretStorage) {}

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(SECRET_KEY);
  }

  async setToken(token: string): Promise<void> {
    await this.secrets.store(SECRET_KEY, token);
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(SECRET_KEY);
  }

  async promptForToken(): Promise<string | undefined> {
    const token = await vscode.window.showInputBox({
      title: 'SkillSource: GitHub Personal Access Token',
      prompt: 'Enter a GitHub PAT with repo read access. It will be stored securely in your system keychain.',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'ghp_...',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'Token cannot be empty';
        }
        return undefined;
      },
    });

    if (token) {
      await this.setToken(token.trim());
    }
    return token;
  }
}
