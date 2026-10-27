# Paristigious — site v2

La refonte du front adopte une palette pétrole, ivoire et laiton, un accueil
photographique, des prestations illustrées et un accès rapide au devis.
Les cartes de service sont partagées entre l’accueil et le catalogue.

- Accueil : `src/components/HomeExperience.astro` et `src/styles/home.scss`.
- Cartes de prestation : `src/components/ServiceCard.astro`.
- Palette et dimensions partagées : `src/styles/global.scss`.
- Vérifications complémentaires : `node scripts/frontend-qa.mjs http://127.0.0.1:4322`
  (formats 320 à 1920 px, six parcours de devis, navigation des prestations).
- Captures de contrôle : `node scripts/visual-review.mjs http://127.0.0.1:4322`
  génère les vues ordinateur et mobile dans `.visual-review/` (ignoré par Git).

Ces deux scripts utilisent Chrome installé localement. Démarrer l’aperçu construit
avec `npm run build` puis `npm run preview -- --port 4322` avant de les lancer.

Site statique Astro. Aucun serveur requis : `npm run build` produit un dossier
`dist/` à déposer tel quel sur n'importe quel hébergement.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # génère dist/
npm run preview   # sert dist/ localement
npm run check     # TypeScript strict sur .astro et .ts
npm run qa        # 44 vérifications automatisées sur le site construit
```

`npm run qa` demande que `npm run preview` tourne dans un autre terminal.

---

## Décisions de stack

La règle appliquée partout : **une dépendance n'entre que si elle change quelque
chose pour le visiteur.** Ce qui suit documente aussi bien ce qui a été retenu
que ce qui a été écarté.

| Brique | Retenue ? | Gain concret pour le visiteur |
|---|---|---|
| **Astro 7** (`static`) | Oui | HTML pré-rendu, zéro JS de framework. 1,1 ko de JS gzip par page. |
| **TypeScript strict** | Oui | Indirect (fiabilité), mais coût nul à l'exécution. |
| **SCSS** | Oui | Uniquement pour les breakpoints et 3 mixins. Aucun runtime. |
| **`astro:assets`** | Oui | AVIF/WebP + `srcset` : le mobile télécharge 132 ko au lieu de 528 ko. |
| **API Fonts d'Astro** | Oui | Polices auto-hébergées et sous-ensemblées, métriques de repli générées : plus aucune connexion à Google, CLS à 0. |
| **`@view-transition` CSS natif** | Oui | Transition entre pages en 260 ms, pour **0 ko de JavaScript**. |
| **Prefetch Astro** | Oui | Au survol d'un lien de service, la page suivante est déjà là. |
| **Zod (`zod/mini`)** | Oui | Schéma de validation unique, chargé à la demande : 9,3 ko gzip, jamais sur la première page. |
| **Web Components** | Oui | `<address-autocomplete>` : enrichit un `<input>` existant, disparaît sans casse si le script échoue. |
| **`<dialog>` natif** | Oui | Focus trap, Escape, top-layer et retour du focus fournis par le navigateur — rien à réimplémenter, rien à casser. |
| **`<details name>` natif** | Oui | Accordéon FAQ exclusif, animé, clavier-compatible, **sans une ligne de JS**. |
| **GSAP / ScrollTrigger** | Non | Aucune animation du site ne dépasse ce que CSS fait déjà (opacité, translation, échelle). ~70 ko pour un résultat identique. |
| **Embla Carousel** | Non | `overflow-x: auto` + `scroll-snap` donne déjà swipe, inertie et snapping natifs. Il ne manquait que les boutons, la position annoncée et le glisser-souris : **1,2 ko** écrits à la main, et surtout le scroll vertical de la page n'est jamais capturé. |
| **Lenis / Locomotive** | Non | Explicitement écarté : le scroll natif est meilleur au trackpad, au tactile et au clavier. |
| **React / Vue / Tailwind / Three.js** | Non | Aucun besoin identifié. |

### Budget JavaScript mesuré

| Page | JS initial (gzip) | À la demande |
|---|---|---|
| Accueil, services, partenaires, légales | **1,1 ko** | — |
| Demande de devis | **6,6 ko** | +9,3 ko (Zod, préchargé dès la première interaction) |

À titre de comparaison, l'ancien `main.js` faisait 4,7 ko non compressés pour un
menu, une FAQ et un formulaire à plat.

---

## Structure

```
src/
├─ assets/              images sources (optimisées à la build)
├─ components/          Header, MobileMenu, Footer, Button, Carousel,
│                       Faq, FormField, QuoteForm, StickyCta, BackToTop
├─ content/services/    6 fichiers Markdown = 6 pages de service
├─ layouts/             Base, Legal
├─ lib/                 site.ts (coordonnées, nav), quote.ts (champs + schéma),
│                       places.ts (lieux fréquents), faq.ts
├─ pages/
├─ scripts/             enhance, dropdown, mobile-menu, carousel,
│                       address-autocomplete, quote-form
└─ styles/              _tokens.scss (breakpoints/mixins), global.scss (design system)

legacy/                 site v1 conservé pour référence, hors build
scripts/                generate-assets.mjs (favicons, OG, redirections), qa.mjs
```

**Ajouter une prestation** = ajouter un `.md` dans `src/content/services/`.
La page, l'entrée du méga-menu, le pied de page, le maillage « service suivant »
et le sitemap se mettent à jour seuls.

---

## À renseigner avant mise en ligne

1. **Téléphone et WhatsApp** — une seule ligne dans `src/lib/site.ts` :
   ```ts
   phone: '+33612345678',
   ```
   Cela active partout le bouton d'appel, les liens WhatsApp contextualisés par
   page, et la deuxième action de la barre mobile. Aucun autre fichier à toucher.

2. **Mentions légales et confidentialité** — les mentions `[À CONFIRMER]` dans
   `src/pages/mentions-legales.astro` et `src/pages/confidentialite.astro`.

3. **Conditions commerciales** — dernière entrée de `src/lib/faq.ts`.

4. **Envoi du formulaire** (facultatif) — voir `.env.example`. Sans endpoint, le
   formulaire prépare l'e-mail dans la messagerie du visiteur ; avec endpoint, il
   envoie réellement, avec états de chargement, de succès et d'erreur réseau.

5. **Autocomplétion d'adresses complète** (facultatif) — voir `.env.example`.
   Les lieux les plus tapés (CDG, Orly, gares, palaces, Côte d'Azur) fonctionnent
   déjà sans aucun fournisseur.

---

## Redirections SEO

Les anciennes URL en `.html` sont couvertes deux fois :

- `public/_redirects` — 301 sur Netlify, Cloudflare Pages et compatibles ;
- pages de redirection HTML dans `public/` pour les hébergeurs qui l'ignorent.

Les anciennes URL dont la cible ne diffère que par l'extension
(`/partenaires.html` → `/partenaires`) n'ont **pas** de page de redirection : selon
la façon dont l'hébergeur résout les extensions, elle risquerait d'être servie à
la place de la vraie page et de créer une boucle. `_redirects` s'en charge.
