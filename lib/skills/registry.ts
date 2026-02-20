/**
 * Skills registry — loads skills from SKILL.md files on disk.
 * Skills are prompt templates injected into the agent's system prompt.
 * Backward compatible: exports same getAllSkills, getSkillById, getSkillsByIds.
 */

import fs from 'fs';
import path from 'path';
import type { Skill } from './types';

let _cache: Skill[] | null = null;

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Simple parser — handles the fields we need without a dependency.
 */
function parseFrontmatter(content: string): { data: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2].trim();
  const data: Record<string, any> = {};

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: any = trimmed.slice(colonIdx + 1).trim();

    // Parse arrays: [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s: string) => s.trim());
    }

    data[key] = value;
  }

  return { data, body };
}

/**
 * Load all SKILL.md files from the skills/ directory.
 * Results are cached after first load (skills don't change at runtime).
 */
function loadSkillsFromDisk(): Skill[] {
  if (_cache) return _cache;

  const skillsDir = path.join(process.cwd(), 'skills');
  const skills: Skill[] = [];

  try {
    if (!fs.existsSync(skillsDir)) {
      _cache = skills;
      return skills;
    }

    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const raw = fs.readFileSync(skillPath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);

      const skill: Skill = {
        id: data.id || dir.name,
        name: data.name || dir.name,
        description: data.description || '',
        tools: Array.isArray(data.tools) ? data.tools : [],
        triggers: Array.isArray(data.triggers) ? data.triggers as ('heartbeat' | 'manual')[] : [],
        instructions: body,
      };

      skills.push(skill);
    }
  } catch (error) {
    console.error('[skills/registry] Failed to load SKILL.md files:', error);
  }

  _cache = skills;
  return skills;
}

/**
 * Get all available skills
 */
export function getAllSkills(): Skill[] {
  return loadSkillsFromDisk();
}

/**
 * Get a skill by ID
 */
export function getSkillById(id: string): Skill | undefined {
  return loadSkillsFromDisk().find((s) => s.id === id);
}

/**
 * Get skills by IDs (for loading an agent's enabled skills)
 */
export function getSkillsByIds(ids: string[]): Skill[] {
  return loadSkillsFromDisk().filter((s) => ids.includes(s.id));
}
