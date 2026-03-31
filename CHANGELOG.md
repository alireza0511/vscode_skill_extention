# Changelog

All notable changes to the Skill-Sync extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-29

### Added

- Initial release of Skill-Sync
- Workspace scanning for `SKILL.md` and `CLAUDE.md` files on startup
- YAML frontmatter parsing for `source`, `auto_update`, and `version` fields
- Remote content fetching via GitHub API (supports `github.com` and GitHub Enterprise)
- Diff-based review panel using VS Code's native diff editor
- Per-file review actions: Accept Update, Skip, Disable Auto-Update
- Notification when outdated files are detected with Review and Later options
- Status bar indicator with four states: up to date, outdated, checking, auth missing
- GitHub Personal Access Token management via VS Code SecretStorage
- Commands: Check for Updates, Set GitHub Token, Clear GitHub Token
- Configurable GitHub API base URL for enterprise installations
- Configurable file glob patterns via `skillSync.filePatterns` setting

[Unreleased]: https://github.com/alireza/skill-sync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alireza/skill-sync/releases/tag/v0.1.0
