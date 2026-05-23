export const PLACEHOLDER_REGEX = /\[([A-Z0-9_]+)\]/g;

export function extractPlaceholders(content: string): string[] {
  const set = new Set<string>();
  for (const m of content.matchAll(PLACEHOLDER_REGEX)) set.add(m[1]);
  return [...set];
}

export function fillPlaceholders(content: string, values: Record<string, string>) {
  return content.replace(PLACEHOLDER_REGEX, (_, k) => values[k]?.trim() ? values[k] : `[${k}]`);
}

export const CATEGORIES = [
  "Beginner",
  "Development",
  "Code Review",
  "Debugging",
  "DevOps & Infrastructure",
  "Documentation",
  "Architecture",
  "Testing",
  "Security",
] as const;

export const FRAMEWORKS = ["CO-STAR", "Few-Shot", "Chain-of-Thought", "ReAct", "Custom"] as const;
