# Testing Skill-Sync Locally

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [VS Code](https://code.visualstudio.com/) v1.85 or later
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension (for chat participant testing)
- A GitHub Personal Access Token with `repo` or `public_repo` scope

## 1. Install Dependencies and Build

```bash
cd /path/to/vscode_skill_extention
npm install
npm run compile
```

If you want live recompilation while developing:

```bash
npm run watch
```

## 2. Launch the Extension in Debug Mode

1. Open this project folder in VS Code
2. Press `F5` (or **Run > Start Debugging**)
3. VS Code opens a new **Extension Development Host** window — this is your sandbox

> If no launch configuration exists, VS Code will prompt you to create one.
> Select **"VS Code Extension Development"**. If you need to create it manually,
> add this to `.vscode/launch.json`:
>
> ```json
> {
>   "version": "0.2.0",
>   "configurations": [
>     {
>       "name": "Run Extension",
>       "type": "extensionHost",
>       "request": "launch",
>       "args": [
>         "--extensionDevelopmentPath=${workspaceFolder}"
>       ],
>       "outFiles": ["${workspaceFolder}/dist/**/*.js"],
>       "preLaunchTask": "${defaultBuildTask}"
>     }
>   ]
> }
> ```

## 3. Set Up a Test Workspace

In the Extension Development Host window, open a folder that contains (or will contain) test skill files.

### Create a test skill file

Create a file called `SKILL.md` in the test workspace with this content:

```markdown
---
source: https://github.com/anthropics/courses/blob/master/README.md
auto_update: true
version: 1.0.0
---

# Test Skill File

This is a test file. The content here is intentionally different
from the remote so that Skill-Sync detects it as outdated.
```

> **Tip:** Use any public GitHub file as the `source` URL. The content just needs
> to differ from your local copy so you can see the update notification.

### Create a test skill file with source.md fallback

Create a directory `skills/python/` in the test workspace with two files:

**`skills/python/SKILL.md`** — no `source` in frontmatter (simulates a public skill):

```markdown
---
auto_update: true
version: 1.0.0
---

# Python Skill

This simulates a public skill file that doesn't include a source URL.
```

**`skills/python/source.md`** — provides the source URL:

```
https://github.com/anthropics/courses/blob/master/README.md
```

Skill-Sync should detect the source from `source.md` and check for updates normally.

### Create a manual (opted-out) file for comparison

```markdown
---
source: https://github.com/anthropics/courses/blob/master/README.md
auto_update: false
version: 1.0.0
---

# Manual Skill File

This file has auto_update set to false. Skill-Sync should ignore it entirely.
```

Save this as `CLAUDE.md` in the same workspace.

## 4. Test the Core Flow

### Set your GitHub token

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run **Skill Sync: Set GitHub Token**
3. Paste your PAT

### Verify status bar

After setting the token, the extension runs an update check. Watch the status bar (bottom-right):

| What you should see | Meaning |
|---|---|
| `↻ Skills` | Checking in progress |
| `⚡ Skills 1↑` | Your test `SKILL.md` is outdated (expected) |
| `✓ Skills` | All files match remote (update the local file to match) |
| `🔒 Skills` | Token is missing or was cleared |

### Review an update

1. Click the `⚡ Skills 1↑` badge, or run **Skill Sync: Check for Updates**
2. Click **Review** on the notification
3. A diff editor opens showing local vs remote
4. Choose **Accept Update**, **Skip**, or **Disable Auto-Update**

### Clear the token

1. Run **Skill Sync: Clear GitHub Token**
2. Status bar should switch to `🔒 Skills`

## 5. Test the Chat Participant

> Requires the GitHub Copilot Chat extension to be installed and active.

Open Copilot Chat (`Cmd+Shift+I` / `Ctrl+Shift+I`) and try these:

```
@skill-sync /status
```
Should show a markdown table listing all skill files with their sync state.

```
@skill-sync /update
```
Should list outdated files with **Accept** buttons.

```
@skill-sync /token
```
Should open the PAT input prompt.

```
@skill-sync /disable
```
Open `SKILL.md` in the editor first, then run this. Should set `auto_update: false` in the frontmatter.

```
@skill-sync
```
Without a command — should show a help message listing available commands.

## 6. Test Edge Cases

### No frontmatter
Create a `SKILL.md` with no `---` block. Skill-Sync should ignore it silently.

### Missing source URL (no frontmatter source, no source.md)
```yaml
---
auto_update: true
---
```
With no `source.md` in the same directory, should be ignored during update checks but appear in `/status` with a "no source URL" warning.

### source.md with bare URL
Create `source.md` next to a skill file with just:
```
https://github.com/anthropics/courses/blob/master/README.md
```
Extension should resolve the source and check for updates.

### source.md with frontmatter
Create `source.md` with:
```yaml
---
source: https://github.com/anthropics/courses/blob/master/README.md
---
```
Same behavior as bare URL — extension should resolve and check.

### Inline source takes priority over source.md
A skill file with `source:` in its own frontmatter should use that URL, even if a `source.md` with a different URL exists in the same directory.

### Invalid GitHub URL
```yaml
---
source: https://not-github.com/something
auto_update: true
---
```
Should log a warning and skip the file without crashing.

### Bad token
1. Run **Skill Sync: Set GitHub Token** and enter `invalid-token`
2. Extension should show an auth error and prompt to update the token

### Large workspace
Create 5+ skill files pointing to different GitHub sources to verify concurrent fetching works.

## 7. View Logs

If something isn't working, check the extension output:

1. Open **Output** panel (`Cmd+Shift+U` / `Ctrl+Shift+U`)
2. Select **Skill Sync** from the dropdown (or **Extension Host** for general errors)
3. Look for `[Skill Sync]` prefixed log messages

For the Debug Console (when running via F5), all `console.warn` and `console.log` calls from the extension will appear there.

## 8. Packaging for Manual Install

To test the extension as a `.vsix` package (closer to production):

```bash
# Install vsce if you don't have it
npm install -g @vscode/vsce

# Package the extension
npm run package
vsce package

# Install the .vsix in VS Code
code --install-extension skill-sync-0.1.0.vsix
```

Then restart VS Code and test in a real workspace (not the Extension Development Host).

## Quick Checklist

- [ ] `npm run compile` succeeds with no errors
- [ ] F5 launches the Extension Development Host
- [ ] Status bar appears on activation
- [ ] Token prompt works and stores securely
- [ ] Outdated file detected and notification shown
- [ ] Diff editor opens with correct local vs remote content
- [ ] Accept Update replaces local file content
- [ ] Disable Auto-Update sets `auto_update: false` in frontmatter
- [ ] Skip moves to next file without changes
- [ ] `auto_update: false` files are ignored
- [ ] `source.md` fallback resolves source when frontmatter has no `source`
- [ ] Inline `source` in frontmatter takes priority over `source.md`
- [ ] `@skill-sync /status` shows table in Copilot Chat
- [ ] `@skill-sync /update` lists outdated files with buttons
- [ ] `@skill-sync /disable` modifies the active editor's file
- [ ] Clear Token switches status bar to lock icon
- [ ] Invalid token shows auth error with retry option
