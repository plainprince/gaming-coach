/**
 * Prompt templates for gaming coach analysis
 * Simplified for cleaner TTS output
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Read prompt content from MD file
 */
function readPromptFile(filename: string): string {
  const filepath = join(__dirname, '..', 'prompts', filename);
  return readFileSync(filepath, 'utf-8').trim();
}

/**
 * System prompt for the gaming coach AI
 * Loaded from prompts/system.md
 */
export const SYSTEM_PROMPT = readPromptFile('system.md');

/**
 * User prompt for analyzing a screenshot
 * Loaded from prompts/user.md
 */
export const USER_PROMPT = readPromptFile('user.md');

/**
 * Prompt for analyzing a screenshot
 */
export function createAnalysisPrompt(): string {
  return `${SYSTEM_PROMPT}

${USER_PROMPT}`;
}

/**
 * Example analysis result
 */
export const EXAMPLE_ADVICE = 'Keep practicing your positioning and stay aware of enemy locations.';

export default {
  SYSTEM_PROMPT,
  USER_PROMPT,
  createAnalysisPrompt,
  EXAMPLE_ADVICE
};
