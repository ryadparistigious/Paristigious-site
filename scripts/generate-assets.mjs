/**
 * Génère les fichiers statiques dérivés, avant chaque build :
 *  1. l'image Open Graph au bon ratio ;
 *  2. les pages de redirection des anciennes URL en .html.
 *
 * On ne génère PAS de stub pour les anciennes URL dont la cible ne diffère que
 * par l'extension (`/partenaires.html` → `/partenaires`) : selon la façon dont
 * l'hébergeur résout les extensions, le stub pourrait se retrouver servi à la
 * place de la vraie page et créer une boucle de redirection. Ces cas-là sont
 * couverts par `public/_redirects`.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

await sharp(path.join(root, 'src/assets/photo-maybach.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(root, 'public/og-default.jpg'));

const redirects = {
  'paristigious-site.html': '/',
  'service-transferts-aeroport.html': '/services/transferts',
  'service-accueil-vip.html': '/services/transferts',
  'service-longue-duree.html': '/services/mise-a-disposition',
  'service-evenementiel-vip.html': '/services/evenements',
  'service-mariage.html': '/services/mariage',
  'service-excursions-privees.html': '/services/excursions',
  'service-ambassades.html': '/services/business',
};

for (const [file, target] of Object.entries(redirects)) {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Page déplacée — Paristigious</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://paristigious.com${target === '/' ? '' : target}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>Cette page a été déplacée. <a href="${target}">Continuer vers la nouvelle adresse</a>.</p>
</body>
</html>
`;
  await writeFile(path.join(root, 'public', file), html, 'utf8');
}

console.log(
  'Assets générés : og-default.jpg + %d pages de redirection.',
  Object.keys(redirects).length,
);

/* ─── Favicons ─────────────────────────────────────────────
   Monogramme laiton sur navy. Le SVG couvre les navigateurs modernes ;
   le PNG servi sous le nom favicon.ico couvre les plus anciens et évite
   la requête 404 automatique vers /favicon.ico. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#081526"/>
  <path d="M22 46V18h11.5c5.8 0 9.5 3.4 9.5 8.6s-3.7 8.8-9.5 8.8H27.6V46H22zm5.6-15.3h5.2c2.7 0 4.4-1.6 4.4-4.1s-1.7-4-4.4-4h-5.2v8.1z" fill="#c2a06a"/>
</svg>
`;
await writeFile(path.join(root, 'public/favicon.svg'), favicon, 'utf8');

const iconBuffer = Buffer.from(favicon, 'utf8');
await sharp(iconBuffer, { density: 384 })
  .resize(32, 32)
  .png()
  .toFile(path.join(root, 'public/favicon.ico'));
await sharp(iconBuffer, { density: 384 })
  .resize(180, 180)
  .png()
  .toFile(path.join(root, 'public/apple-touch-icon.png'));

console.log('Favicons générés (SVG + ICO + apple-touch-icon).');
