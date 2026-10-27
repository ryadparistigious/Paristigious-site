// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  site: 'https://paristigious.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },

  integrations: [sitemap()],

  // Le prefetch se déclenche sur intention réelle (hover/focus), pas au chargement.
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  image: {
    // Formats modernes générés à la build, aucune dépendance runtime.
    responsiveStyles: true,
    layout: 'constrained',
  },

  // Fonts self-hosted + métriques de fallback générées : zéro CLS, zéro connexion tierce.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Fraunces',
      cssVariable: '--font-serif',
      weights: ['300 500'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-sans',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Italiana',
      cssVariable: '--font-display',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Didot', 'Bodoni MT', 'Georgia', 'serif'],
    },
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          loadPaths: [root],
          // Breakpoints et mixins disponibles dans chaque bloc <style> sans import.
          additionalData: '@use "src/styles/tokens" as *;',
        },
      },
    },
  },
});
