export const sourceUrl = 'https://github.com/geodx/geoearth';
export const adminUrl = 'https://admin.geoearth.dev';

const configuredDemoUrl = import.meta.env.VITE_DEMO_URL || 'https://demo.geoearth.dev';
export const demoUrl = new URL(configuredDemoUrl).origin;
export function exampleUrl(id = 'basic') {
  return `${demoUrl}/#/examples/${encodeURIComponent(id)}`;
}
