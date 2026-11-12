import type { SiteLanguage, TranslationKey } from '../locales';
const sources = import.meta.glob<string>(['../../*.md', '../../en/*.md'], { query: '?raw', import: 'default' });
const readmes = { en: () => import('../../../packages/core/README.md?raw').then(m => m.default), 'zh-CN': () => import('../../../packages/core/README.zh-CN.md?raw').then(m => m.default) };
const entries: Array<{ slug: string; title: TranslationKey; group: TranslationKey; example: string }> = [
  { slug: 'getting-started', title: 'docGettingStarted', group: 'groupStart', example: 'basic' },
  { slug: 'camera', title: 'docCamera', group: 'groupBasics', example: 'camera-roaming' },
  { slug: 'drawing', title: 'docDrawing', group: 'groupBasics', example: 'draw-polyline' },
  { slug: 'measurement', title: 'docMeasurement', group: 'groupBasics', example: 'measure-space-distance' },
  { slug: 'interaction', title: 'docInteraction', group: 'groupBasics', example: 'events-picking-highlight' },
  { slug: 'profile', title: 'docProfile', group: 'groupAnalysis', example: 'analysis-profile' },
  { slug: 'line-of-sight', title: 'docLineOfSight', group: 'groupAnalysis', example: 'analysis-line-of-sight' },
  { slug: 'height-limit', title: 'docHeightLimit', group: 'groupAnalysis', example: 'analysis-height-limit' },
  { slug: 'water', title: 'docWater', group: 'groupEffects', example: 'effect-water' },
  { slug: 'fps', title: 'docFps', group: 'groupEffects', example: 'advanced-fps' },
];
export const documents = entries.map(entry => ({ ...entry,
  load: (language: SiteLanguage) => entry.slug === 'getting-started' ? readmes[language]() : sources['../../' + (language === 'en' ? 'en/' : '') + entry.slug + '.md']!(),
  sourcePath: (language: SiteLanguage) => entry.slug === 'getting-started' ? 'packages/core/README' + (language === 'zh-CN' ? '.zh-CN' : '') + '.md' : 'docs/' + (language === 'en' ? 'en/' : '') + entry.slug + '.md',
}));
