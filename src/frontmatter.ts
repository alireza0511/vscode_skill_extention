export interface SkillFrontmatter {
  source?: string;
  auto_update: boolean;
  version?: string;
}

export interface ParsedSkillFile {
  frontmatter: SkillFrontmatter;
  /** Raw frontmatter text including --- delimiters */
  rawFrontmatter: string;
  /** Content after the frontmatter block */
  body: string;
}

/**
 * Parses YAML-like frontmatter from a SKILL.md / CLAUDE.md file.
 * Intentionally simple — only handles the three known keys to avoid
 * pulling in a full YAML parser dependency.
 */
export function parseFrontmatter(content: string): ParsedSkillFile | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return null;
  }

  const rawFrontmatter = match[0];
  const yamlBlock = match[1];
  const body = content.slice(rawFrontmatter.length);

  const frontmatter: SkillFrontmatter = {
    auto_update: true, // default
  };

  for (const line of yamlBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case 'source':
        frontmatter.source = stripQuotes(value);
        break;
      case 'auto_update':
        frontmatter.auto_update = value === 'true';
        break;
      case 'version':
        frontmatter.version = stripQuotes(value);
        break;
    }
  }

  return { frontmatter, rawFrontmatter, body };
}

/**
 * Updates the auto_update field in the raw file content.
 * Returns the modified file content string.
 */
export function setAutoUpdate(content: string, value: boolean): string {
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    return content;
  }

  const newYaml = parsed.rawFrontmatter.replace(
    /auto_update:\s*(true|false)/,
    `auto_update: ${value}`
  );

  return newYaml + parsed.body;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
