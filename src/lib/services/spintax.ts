/**
 * Spintax Parser & Renderer
 * Supports {option1|option2|option3} syntax with nesting
 */

export interface SpintaxParseResult {
  variations: string[];
  count: number;
}

/**
 * Parse spintax pattern and return all possible variations
 * Supports nested spintax: {Hello|Hi} {world|there} {friend|buddy|pal}
 * Also handles escaped braces: \{literal\}
 */
export function parseSpintax(pattern: string): string[] {
  const results: string[] = [''];
  let i = 0;

  while (i < pattern.length) {
    if (pattern[i] === '{' && (i === 0 || pattern[i - 1] !== '\\')) {
      // Find matching closing brace, handling nesting
      let depth = 1;
      let j = i + 1;
      
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '{' && pattern[j - 1] !== '\\') depth++;
        else if (pattern[j] === '}' && pattern[j - 1] !== '\\') depth--;
        j++;
      }

      if (depth === 0) {
        // Extract options
        const optionsContent = pattern.slice(i + 1, j - 1);
        const options = splitOptions(optionsContent);
        
        // Recursively parse each option (handles nested spintax)
        const parsedOptions = options.map(opt => parseSpintax(opt));
        
        // Combine with existing results
        const newResults: string[] = [];
        for (const base of results) {
          for (let optIdx = 0; optIdx < parsedOptions.length; optIdx++) {
            for (const variation of parsedOptions[optIdx]) {
              newResults.push(base + variation + pattern.slice(j));
            }
          }
        }
        results.splice(0, results.length, ...newResults);
        
        // Restart parsing with expanded patterns
        return results.flatMap(r => parseSpintax(r));
      }
    }
    i++;
  }

  return [pattern.replace(/\\{/g, '{').replace(/\\}/g, '}')];
}

function splitOptions(content: string): string[] {
  const options: string[] = [];
  let current = '';
  let depth = 0;
  let inEscape = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '\\' && !inEscape) {
      inEscape = true;
      continue;
    }

    if (char === '{' && !inEscape) depth++;
    else if (char === '}' && !inEscape) depth--;
    else if (char === '|' && !inEscape && depth === 0) {
      options.push(current);
      current = '';
      continue;
    }

    current += char;
    inEscape = false;
  }
  
  options.push(current);
  return options;
}

/**
 * Get all variations of a spintax pattern
 */
export function getSpintaxVariations(pattern: string): { variations: string[]; count: number } {
  const variations = parseSpintax(pattern);
  return { variations, count: variations.length };
}

/**
 * Render a single random variation (or seeded)
 */
export function renderSpintax(pattern: string, seed?: number): string {
  const variations = parseSpintax(pattern);
  if (variations.length === 1) return variations[0];
  
  if (seed !== undefined) {
    return variations[seed % variations.length];
  }
  return variations[Math.floor(Math.random() * variations.length)];
}

/**
 * Generate all variations for preview (limited)
 */
export function getSpintaxPreview(pattern: string, limit = 10): string[] {
  const variations = parseSpintax(pattern);
  return variations.slice(0, limit);
}

/**
 * Validate spintax syntax
 */
export function validateSpintax(pattern: string): { valid: boolean; error?: string } {
  let depth = 0;
  let inEscape = false;
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    if (char === '\\' && !inEscape) {
      inEscape = true;
      continue;
    }
    
    if (char === '{' && !inEscape) depth++;
    else if (char === '}' && !inEscape) {
      depth--;
      if (depth < 0) {
        return { valid: false, error: 'Unmatched closing brace at position ' + i };
      }
    }
    inEscape = false;
  }
  
  if (depth !== 0) {
    return { valid: false, error: 'Unclosed brace(s) - ' + depth + ' opening brace(s) not closed' };
  }
  
  return { valid: true };
}

/**
 * Extract all personalization tokens from a pattern
 */
export function extractTokens(pattern: string): string[] {
  const tokens = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  
  while ((match = regex.exec(pattern)) !== null) {
    tokens.add(match[1]);
  }
  
  return Array.from(tokens);
}

/**
 * Render spintax with personalization tokens
 */
export function renderWithTokens(pattern: string, tokens: Record<string, string>, seed?: number): string {
  let rendered = renderSpintax(pattern, seed);
  return rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => tokens[key] ?? match);
}