// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://evatosorus.pages.dev',
  // Astro 7 passe par défaut aux règles d'espaces de JSX ('jsx') : l'espace porté par un
  // saut de ligne entre un texte et <a>/<strong>/<em> disparaissait (« publicevatosorus… »,
  // revue UX L11). true = compression sans perte, le comportement d'Astro 6 pour lequel les
  // pages sont écrites. Test : scripts/html-espaces.test.mjs.
  compressHTML: true,
  integrations: [react(), mdx()],

  vite: {
    plugins: [tailwindcss()]
  }
});
