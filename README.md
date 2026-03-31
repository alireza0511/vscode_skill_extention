# SkillSource

**Keep your AI instruction files in sync — automatically.**

[![Version](https://img.shields.io/visual-studio-marketplace/v/alirezakhakpour.skillsource)](https://marketplace.visualstudio.com/items?itemName=alirezakhakpour.skillsource)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/alirezakhakpour.skillsource)](https://marketplace.visualstudio.com/items?itemName=alirezakhakpour.skillsource)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/alirezakhakpour.skillsource)](https://marketplace.visualstudio.com/items?itemName=alirezakhakpour.skillsource)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

If you use Claude Code, GitHub Copilot, or any AI coding assistant, you probably have `SKILL.md` or `CLAUDE.md` files scattered across your repos. They start as copies of a shared original — and then they silently go stale.

SkillSource fixes that. It reads a `source` URL from each file's frontmatter, checks GitHub for updates on startup, and lets you review changes through VS Code's built-in diff editor. No files are overwritten without your approval. Ever.

## Features

- **Automatic update detection** — scans your workspace on startup and flags outdated skill files
- **Diff-based review** — see exactly what changed before accepting an update, using VS Code's native diff viewer
- **Per-file control** — each file opts in or out via its own frontmatter, no global config to manage
- **`source.md` fallback** — for public skills that don't embed a source URL, drop a `source.md` next to the file and SkillSource picks it up automatically
- **Secure token storage** — your GitHub PAT is stored in VS Code's SecretStorage (OS keychain), never in settings.json
- **Status bar at a glance** — always know if your skill files are current, outdated, or missing auth
- **GitHub Enterprise support** — configure a custom API base URL for enterprise installations
- **Non-destructive by design** — SkillSource is read-only; it will never push changes upstream or overwrite files without explicit confirmation

Works great alongside [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [GitHub Copilot](https://github.com/features/copilot).

## Getting Started

**1. Point your skill file to its upstream source**

If you control the skill file, add a `source` field to its frontmatter:

```yaml
---
source: https://github.com/your-org/skills/blob/main/flutter/SKILL.md
auto_update: true
---

# Your skill content below...
```

If the file is a public skill that you can't modify (no frontmatter or no `source` field), create a `source.md` file in the same directory instead:

```
flutter/
  SKILL.md        ← public skill file (untouched)
  source.md       ← you add this
```

`source.md` can be a bare URL:

```
https://github.com/some-org/skills/blob/main/flutter/SKILL.md
```

Or a frontmatter block:

```yaml
---
source: https://github.com/some-org/skills/blob/main/flutter/SKILL.md
---
```

SkillSource checks the file's own frontmatter first. If no `source` is found there, it looks for a sibling `source.md`.

**2. Set your GitHub token**

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:

```
SkillSource: Set GitHub Token
```

Enter a GitHub Personal Access Token with read access to the repositories that host your skill files. The token is stored securely in your OS keychain via VS Code's SecretStorage API — it never touches `settings.json` or any file on disk.

**3. That's it**

SkillSource will check for updates every time your workspace opens. If any files are outdated, you'll see a notification and a status bar badge. Click to review the diffs and decide what to update.

## Frontmatter Reference

Add this YAML block to the top of any managed skill file:

| Field | Required | Default | Description |
|---|---|---|---|
| `source` | No* | — | GitHub URL pointing to the upstream version of the file |
| `auto_update` | No | `true` | Set to `false` to exclude this file from update checks |
| `version` | No | — | Informational version string, displayed in the diff panel title |

*`source` is required for update checking, but it can be provided via a sibling `source.md` file instead of inline frontmatter. See below.

Example:

```yaml
---
source: https://github.com/your-org/skills/blob/main/react/SKILL.md
auto_update: true
version: 2.1.0
---
```

The frontmatter convention is stored in the file itself, not in VS Code settings. This means it travels with your repo — every teammate gets the same behavior without any extension configuration.

## Source Resolution

SkillSource resolves the upstream URL for each skill file using this lookup order:

1. **Inline frontmatter** — the `source` field in the skill file's own `---` block
2. **Sibling `source.md`** — a file named `source.md` in the same directory

This two-step lookup is designed for public skills that are distributed without a `source` field. You copy the skill file as-is and add a small `source.md` next to it to enable sync — no need to modify the original file.

### `source.md` formats

**Bare URL** — just the URL on the first line:

```
https://github.com/your-org/skills/blob/main/flutter/SKILL.md
```

**Frontmatter** — same convention as the skill file itself:

```yaml
---
source: https://github.com/your-org/skills/blob/main/flutter/SKILL.md
---
```

Both formats work identically. Use whichever you prefer.

## Status Bar

The status bar item shows the current state at a glance:

| State | Meaning |
|---|---|
| `✓ Skills` | All tracked files are up to date |
| `⚡ Skills 2↑` | 2 files have updates available — click to review |
| `↻ Skills` | Checking for updates (briefly shown on startup) |
| `🔒 Skills` | GitHub token not set — click to configure |

## Commands

All commands are available from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `SkillSource: Check for Updates` | Manually trigger an update check across the workspace |
| `SkillSource: Set GitHub Token` | Store or replace your GitHub Personal Access Token |
| `SkillSource: Clear GitHub Token` | Remove the stored token from your keychain |

## Chat Participant (`@skillsource`)

SkillSource registers as a chat participant in VS Code's built-in chat (and Copilot Chat). Type `@skillsource` in the chat panel to access these commands:

| Command | Description |
|---|---|
| `@skillsource /status` | Show a table of all skill files and their sync state |
| `@skillsource /update` | Check for outdated files and offer Accept buttons inline |
| `@skillsource /token` | Set or update your GitHub PAT |
| `@skillsource /disable` | Set `auto_update: false` on the currently open skill file |

Typing `@skillsource` without a command shows a help message with all available commands.

**Example:**

```
> @skillsource /status

| File                  | Status       | Version |
|-----------------------|--------------|---------|
| src/SKILL.md          | ✓ up to date | 1.4.2   |
| flutter/CLAUDE.md     | ↑ outdated   | 1.1.0   |
| ios/SKILL.md          | — manual     | 2.0.0   |
```

> Note: The slash commands only appear after typing `@skillsource /` — they are scoped to the participant and won't show in the global `/` list.

## Authentication

SkillSource requires a GitHub Personal Access Token (PAT) with read access to the repos hosting your skill files.

**Creating a token:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)** or use a **fine-grained token**
3. For classic tokens, select the `repo` scope (or just `public_repo` if your skill files are in public repos)
4. For fine-grained tokens, grant **Contents: Read-only** access to the relevant repositories
5. Copy the token and paste it when prompted by the extension

**Storage:** The token is stored via VS Code's [SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage), which uses your operating system's keychain (macOS Keychain, Windows Credential Manager, or libsecret on Linux). It is never written to `settings.json`, environment variables, or any file in your workspace.

**GitHub Enterprise:** If your skill files live on a GitHub Enterprise instance, set the API base URL in your VS Code settings:

```json
{
  "skillSync.githubBaseUrl": "https://github.your-company.com/api/v3"
}
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `skillSync.githubBaseUrl` | `https://api.github.com` | GitHub API base URL (change for GitHub Enterprise) |
| `skillSync.filePatterns` | `["**/SKILL.md", "**/CLAUDE.md"]` | Glob patterns for files to monitor |

## Roadmap

Planned for future releases:

- **GitLab and Bitbucket support** — extend beyond GitHub to other Git hosting platforms
- **Multi-machine token sync** — optional encrypted sync so you don't re-enter your PAT on every machine
- **Custom file name patterns** — track any markdown file, not just `SKILL.md` and `CLAUDE.md`
- **Workspace trust integration** — respect VS Code's workspace trust settings
- **Change notifications for watched files** — detect local edits to tracked files and warn before they drift

Have a feature request? [Open an issue](https://github.com/alireza0511/vscode_skill_extention/issues).

## Contributing

Contributions are welcome! Whether it's a bug report, feature request, or pull request — all input helps.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and ensure they compile (`npm run compile`)
4. Submit a pull request

Please open an issue first for larger changes so we can discuss the approach.

## License

MIT — see [LICENSE](LICENSE) for details.
