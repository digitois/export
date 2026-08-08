export type ThemeId = 'modern' | 'classic' | 'minimal' | 'bold' | 'editorial' | 'coastal' | 'sunset' | 'forest';

export interface SiteTheme {
  id: ThemeId;
  name: string;
  description: string;
  headingFont: string;
  bodyFont: string;
  radius: string;
  heroLayout: 'center' | 'left' | 'split' | 'overlay';
  hero: { bg: string; text: string; accent: string };
}

export const SITE_THEMES: Record<ThemeId, SiteTheme> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, professional SaaS look with generous spacing and soft radii.',
    headingFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    radius: '1rem',
    heroLayout: 'center',
    hero: { bg: '#0f172a', text: '#ffffff', accent: '#0284c7' }
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Trusted serif pairing that reads premium and established.',
    headingFont: 'Georgia, "Times New Roman", serif',
    bodyFont: 'Georgia, "Times New Roman", serif',
    radius: '0.25rem',
    heroLayout: 'center',
    hero: { bg: '#1e293b', text: '#ffffff', accent: '#92400e' }
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Bare-bones white space with a sharp monochrome look.',
    headingFont: 'system-ui, sans-serif',
    bodyFont: 'system-ui, sans-serif',
    radius: '0',
    heroLayout: 'center',
    hero: { bg: '#ffffff', text: '#111827', accent: '#111827' }
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast statement design for suppliers that shout.',
    headingFont: 'Arial Black, system-ui, sans-serif',
    bodyFont: 'system-ui, sans-serif',
    radius: '0.5rem',
    heroLayout: 'left',
    hero: { bg: '#111827', text: '#ffffff', accent: '#f59e0b' }
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style hero, split layout with big serif headlines.',
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    radius: '0.5rem',
    heroLayout: 'split',
    hero: { bg: '#fafaf9', text: '#1c1917', accent: '#a21caf' }
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal',
    description: 'Airy and bright — soft blues for marine and food exporters.',
    headingFont: '"DM Serif Display", Georgia, serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    radius: '1.5rem',
    heroLayout: 'center',
    hero: { bg: '#0e7490', text: '#ffffff', accent: '#ecfeff' }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm citrus palette for organic, spices and artisan goods.',
    headingFont: '"Fraunces", Georgia, serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    radius: '1rem',
    heroLayout: 'left',
    hero: { bg: '#431407', text: '#fff7ed', accent: '#f97316' }
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Deep greens and natural feel for agro and coffee exporters.',
    headingFont: '"Lora", Georgia, serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    radius: '1.25rem',
    heroLayout: 'split',
    hero: { bg: '#14532d', text: '#f0fdf4', accent: '#bef264' }
  }
};

export const SITE_THEME_LIST: SiteTheme[] = Object.values(SITE_THEMES);

export function getSiteTheme(id: string | null | undefined): SiteTheme {
  if (id && id in SITE_THEMES) return SITE_THEMES[id as ThemeId];
  return SITE_THEMES.modern;
}