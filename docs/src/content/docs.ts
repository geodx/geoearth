const sources = import.meta.glob<string>('../../*.md', { query: '?raw', import: 'default' });

export const documents = [
  { slug: 'getting-started', title: '快速开始', group: '开始使用', example: 'basic', load: () => import('../../../packages/core/README.md?raw').then(module => module.default) },
  { slug: 'camera', title: '相机与漫游', group: '基础能力', example: 'camera-roaming', load: sources['../../camera.md']! },
  { slug: 'drawing', title: '交互绘制', group: '基础能力', example: 'draw-polyline', load: sources['../../drawing.md']! },
  { slug: 'measurement', title: '空间量测', group: '基础能力', example: 'measure-space-distance', load: sources['../../measurement.md']! },
  { slug: 'interaction', title: '拾取与高亮', group: '基础能力', example: 'events-picking-highlight', load: sources['../../interaction.md']! },
  { slug: 'profile', title: '地形剖面', group: '空间分析', example: 'analysis-profile', load: sources['../../profile.md']! },
  { slug: 'line-of-sight', title: '通视分析', group: '空间分析', example: 'analysis-line-of-sight', load: sources['../../line-of-sight.md']! },
  { slug: 'height-limit', title: '建筑限高', group: '空间分析', example: 'analysis-height-limit', load: sources['../../height-limit.md']! },
  { slug: 'water', title: '水体效果', group: '效果与性能', example: 'effect-water', load: sources['../../water.md']! },
  { slug: 'fps', title: 'FPS 监测', group: '效果与性能', example: 'advanced-fps', load: sources['../../fps.md']! },
];

export const documentGroups = [...new Set(documents.map(item => item.group))];
