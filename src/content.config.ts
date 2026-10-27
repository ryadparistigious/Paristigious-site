import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

/**
 * Les pages de service sont pilotées par le contenu, pas dupliquées en HTML.
 * Ajouter une prestation = ajouter un fichier Markdown : la page, l'entrée de
 * méga-menu, le maillage « service suivant » et le sitemap suivent tout seuls.
 */
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      title: z.string(),
      /** Titre court utilisé en navigation. */
      navLabel: z.string(),
      headline: z.string(),
      tagline: z.string(),
      description: z.string(),
      cover: image(),
      coverAlt: z.string(),
      /** Prestation présélectionnée dans le devis depuis cette page. (règle 17) */
      need: z.enum(['transfert', 'disposition', 'evenement', 'mariage', 'excursion', 'business']),
      /** Fragment injecté dans le message WhatsApp. (règle 18) */
      whatsappContext: z.string(),
      highlights: z
        .array(
          z.object({
            title: z.string(),
            body: z.string(),
          }),
        )
        .min(2),
      includes: z.array(z.string()).min(3),
      steps: z
        .array(
          z.object({
            title: z.string(),
            body: z.string(),
          }),
        )
        .min(2),
      faq: z
        .array(
          z.object({
            q: z.string(),
            a: z.string(),
          }),
        )
        .min(2),
    }),
});

export const collections = { services };
