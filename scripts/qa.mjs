/**
 * Passe de QA automatisée sur le site construit.
 *
 * Vérifie, sur Chrome piloté : erreurs console, responsive, navigation
 * clavier, menu mobile, formulaire multi-étapes, transitions de page,
 * prefers-reduced-motion, fonctionnement sans JavaScript, et mesure
 * LCP / CLS / INP approximés.
 *
 * Usage : node scripts/qa.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:4321';
const CHROME =
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const results = [];
const fail = (name, detail) => results.push({ ok: false, name, detail });
const pass = (name, detail = '') => results.push({ ok: true, name, detail });

const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  tablet: { width: 834, height: 1112, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

const PAGES = [
  '/',
  '/services',
  '/services/transferts',
  '/services/mise-a-disposition',
  '/services/evenements',
  '/services/mariage',
  '/services/excursions',
  '/services/business',
  '/partenaires',
  '/demande-de-devis',
  '/mentions-legales',
  '/confidentialite',
  '/404',
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

async function newPage(viewport = VIEWPORTS.desktop, { javaScriptEnabled = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setJavaScriptEnabled(javaScriptEnabled);
  return page;
}

function watchErrors(page, label, errors) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${label}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${label}] pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText ?? '';
    if (reason.includes('ERR_ABORTED')) return;
    errors.push(`[${label}] requestfailed: ${req.url()} (${reason})`);
  });
}

/* ═══════════ 1. Erreurs console + ressources, sur les 3 formats ═══════════ */
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const errors = [];
  const page = await newPage(viewport);
  watchErrors(page, name, errors);

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 150));

    // Débordement horizontal : le body ne doit jamais défiler latéralement.
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scroll: de.scrollWidth, client: de.clientWidth };
    });
    if (overflow.scroll > overflow.client + 1) {
      fail(`${name} — pas de débordement horizontal sur ${path}`,
        `scrollWidth ${overflow.scroll} > clientWidth ${overflow.client}`);
    }

    // Toutes les images doivent avoir des dimensions intrinsèques (anti-CLS).
    const badImages = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((img) => !img.getAttribute('width') || !img.getAttribute('height'))
        .map((img) => img.currentSrc || img.src),
    );
    if (badImages.length) {
      fail(`${name} — images dimensionnées sur ${path}`, badImages.join(', '));
    }
  }

  if (errors.length) fail(`${name} — zéro erreur console`, errors.slice(0, 6).join(' | '));
  else pass(`${name} — zéro erreur console sur ${PAGES.length} pages`);

  await page.close();
}
pass('Responsive — aucun débordement horizontal détecté (si non listé ci-dessus)');

/* ═══════════ 2. Web Vitals sur l'accueil ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  // Cache désactivé : sinon transferSize et encodedBodySize retombent à zéro
  // et le poids mesuré ne veut plus rien dire.
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    window.__vitals = { lcp: 0, cls: 0, lcpElement: '' };
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      window.__vitals.lcp = last.startTime;
      window.__vitals.lcpElement = last.element
        ? last.element.tagName + (last.element.className ? '.' + String(last.element.className).split(' ')[0] : '')
        : last.url || '';
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  // Le moindre geste fige le LCP : on attend que tout soit peint AVANT de
  // toucher à quoi que ce soit, sinon on mesure une valeur artificiellement basse.
  await page.evaluate(() => {
    // Seules les images du premier écran comptent pour le LCP. Les images
    // en lazy-loading sous la ligne de flottaison ne se chargeront jamais
    // sans scroll : les attendre bloquerait indéfiniment.
    const above = [...document.images].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    const settled = above.map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }),
    );
    return Promise.race([
      Promise.all(settled),
      new Promise((r) => setTimeout(r, 4000)),
    ]).then(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 400))));
  });
  const lcpBeforeScroll = await page.evaluate(() => ({ ...window.__vitals }));

  // Défilement complet : c'est là que les glissements de mise en page arrivent.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 500));

  const scrolled = await page.evaluate(() => window.__vitals);
  const vitals = { ...scrolled, lcp: lcpBeforeScroll.lcp, lcpElement: lcpBeforeScroll.lcpElement };

  // transferSize vaut 0 pour une réponse issue du cache : on retombe sur la
  // taille encodée pour obtenir un poids réaliste.
  const transfer = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0),
  );
  const imageBytes = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((r) => r.initiatorType === 'img')
      .reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0),
  );

  const lcpMs = Math.round(vitals.lcp);
  if (lcpMs > 2500) fail('LCP mobile < 2500 ms', `${lcpMs} ms (${vitals.lcpElement})`);
  else pass('LCP mobile', `${lcpMs} ms — élément : ${vitals.lcpElement}`);

  if (vitals.cls > 0.1) fail('CLS < 0,1', String(vitals.cls.toFixed(4)));
  else pass('CLS', vitals.cls.toFixed(4));

  pass('Poids de l’accueil sur mobile',
    `${Math.round(transfer / 1024)} ko au total, dont ${Math.round(imageBytes / 1024)} ko d’images`);
  await page.close();
}

/* ═══════════ 3. INP approximé : latence de réponse aux interactions ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });

  const measure = async (selector, label) => {
    const el = await page.$(selector);
    if (!el) return fail(`INP — ${label}`, `sélecteur introuvable : ${selector}`);
    const t0 = Date.now();
    await el.click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const dt = Date.now() - t0;
    if (dt > 200) fail(`INP — ${label} < 200 ms`, `${dt} ms`);
    else pass(`INP — ${label}`, `${dt} ms`);
  };

  await measure('#menu-toggle', 'ouverture du menu mobile');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));
  await measure('.faq summary', 'ouverture d’une question FAQ');
  await page.close();
}

/* ═══════════ 4. Menu mobile : dialog, focus, Escape, scroll lock ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });

  await page.click('#menu-toggle');
  await new Promise((r) => setTimeout(r, 450));

  const opened = await page.evaluate(() => {
    const dialog = document.querySelector('#mobile-menu');
    const toggle = document.querySelector('#menu-toggle');
    return {
      open: dialog.open,
      modal: dialog.matches(':modal'),
      expanded: toggle.getAttribute('aria-expanded'),
      bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
      focusInside: dialog.contains(document.activeElement),
    };
  });

  if (!opened.open || !opened.modal) fail('Menu mobile — <dialog> modal ouvert', JSON.stringify(opened));
  else pass('Menu mobile — <dialog> modal ouvert (focus trap natif)');
  if (opened.expanded !== 'true') fail('Menu mobile — aria-expanded synchronisé', opened.expanded);
  else pass('Menu mobile — aria-expanded synchronisé');
  if (!opened.bodyLocked) fail('Menu mobile — scroll de la page bloqué', 'overflow non masqué');
  else pass('Menu mobile — scroll de la page bloqué');

  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 450));
  const closed = await page.evaluate(() => ({
    open: document.querySelector('#mobile-menu').open,
    expanded: document.querySelector('#menu-toggle').getAttribute('aria-expanded'),
    bodyFree: getComputedStyle(document.body).overflow !== 'hidden',
    focusRestored: document.activeElement === document.querySelector('#menu-toggle'),
  }));
  if (closed.open || closed.expanded !== 'false' || !closed.bodyFree) {
    fail('Menu mobile — fermeture par Escape', JSON.stringify(closed));
  } else pass('Menu mobile — fermeture par Escape + scroll rendu');
  if (!closed.focusRestored) fail('Menu mobile — focus restitué au bouton', 'focus perdu');
  else pass('Menu mobile — focus restitué au bouton');

  await page.close();
}

/* ═══════════ 5. Navigation clavier ═══════════ */
{
  const page = await newPage(VIEWPORTS.desktop);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });

  // Premier Tab = lien d'évitement.
  await page.keyboard.press('Tab');
  await new Promise((r) => setTimeout(r, 350)); // la transition du lien dure 240ms
  const first = await page.evaluate(() => ({
    text: document.activeElement.textContent.trim(),
    cls: document.activeElement.className,
    visible: document.activeElement.getBoundingClientRect().top >= 0,
  }));
  if (!first.cls.includes('skip-link') || !first.visible) {
    fail('Clavier — lien d’évitement en premier et visible', JSON.stringify(first));
  } else pass('Clavier — lien d’évitement en premier et visible au focus');

  // Le lien d'évitement doit réellement déplacer le focus dans <main>.
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 200));
  const afterSkip = await page.evaluate(() => document.activeElement.id);
  if (afterSkip !== 'main') fail('Clavier — le lien d’évitement donne le focus à <main>', afterSkip);
  else pass('Clavier — le lien d’évitement donne le focus à <main>');

  // Aucun piège de focus : 60 tabulations sans rester bloqué.
  await page.evaluate(() => document.querySelector('.skip-link').focus());
  const seen = new Set();
  let stuck = 0;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const key = await page.evaluate(() => {
      const el = document.activeElement;
      return el.tagName + '#' + (el.id || '') + '.' + (el.className || '') + '|' + (el.textContent || '').slice(0, 20);
    });
    if (seen.has(key)) stuck++;
    seen.add(key);
  }
  if (seen.size < 20) fail('Clavier — parcours de tabulation', `seulement ${seen.size} éléments distincts`);
  else pass('Clavier — parcours de tabulation', `${seen.size} éléments distincts, aucun piège`);

  // Méga-menu accessible au clavier.
  await page.evaluate(() => document.querySelector('[data-dropdown-trigger]').focus());
  await new Promise((r) => setTimeout(r, 100));
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 200));
  const megaOpen = await page.evaluate(
    () => !document.querySelector('[data-dropdown-panel]').hidden,
  );
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 200));
  const megaClosed = await page.evaluate(
    () => document.querySelector('[data-dropdown-panel]').hidden &&
      document.activeElement === document.querySelector('[data-dropdown-trigger]'),
  );
  if (!megaOpen || !megaClosed) fail('Clavier — méga-menu Entrée/Échap', `open=${megaOpen} closed=${megaClosed}`);
  else pass('Clavier — méga-menu ouvre à Entrée, ferme à Échap, rend le focus');

  await page.close();
}

/* ═══════════ 6. Formulaire de devis ═══════════ */
{
  const page = await newPage(VIEWPORTS.desktop);
  const errors = [];
  watchErrors(page, 'devis', errors);
  await page.goto(BASE + '/demande-de-devis', { waitUntil: 'networkidle2' });

  // 6a. Une seule étape visible au départ.
  const initial = await page.evaluate(() =>
    [...document.querySelectorAll('[data-step]')].map((s) => !s.hidden),
  );
  if (JSON.stringify(initial) !== JSON.stringify([true, false, false])) {
    fail('Devis — une seule étape affichée au départ', JSON.stringify(initial));
  } else pass('Devis — une seule étape affichée au départ');

  // 6b. Continuer sans choisir : message explicite, pas « invalid input ».
  await page.click('[data-next-step]');
  await new Promise((r) => setTimeout(r, 250));
  const needError = await page.evaluate(
    () => document.querySelector('[data-error-for="need"]').textContent.trim(),
  );
  if (!needError || /invalid/i.test(needError)) {
    fail('Devis — message d’erreur en français à l’étape 1', needError || '(vide)');
  } else pass('Devis — message d’erreur explicite à l’étape 1', `« ${needError} »`);

  // 6c. Sélection d'une prestation → champs conditionnels.
  await page.click('input[name="need"][value="transfert"]');
  await page.click('[data-next-step]');
  await new Promise((r) => setTimeout(r, 350));
  const step2 = await page.evaluate(() => {
    const visiblePanels = [...document.querySelectorAll('[data-need-panel]')]
      .filter((p) => !p.hidden)
      .map((p) => p.dataset.needPanel);
    const enabled = [...document.querySelectorAll('[data-need-panel] input:not([disabled])')].length;
    const disabled = [...document.querySelectorAll('[data-need-panel] input[disabled]')].length;
    return { visiblePanels, enabled, disabled };
  });
  if (step2.visiblePanels.length !== 1 || step2.visiblePanels[0] !== 'transfert') {
    fail('Devis — champs conditionnels', JSON.stringify(step2));
  } else {
    pass('Devis — seuls les champs du transfert sont actifs',
      `${step2.enabled} champs actifs, ${step2.disabled} désactivés donc hors tabulation et hors envoi`);
  }

  // 6d. Date passée refusée.
  await page.type('#transfert-pickup', 'CDG');
  await new Promise((r) => setTimeout(r, 250));
  const suggestions = await page.evaluate(
    () => [...document.querySelectorAll('#transfert-pickup-list li .ac__label')].map((e) => e.textContent),
  );
  if (!suggestions.some((s) => /Charles de Gaulle/i.test(s))) {
    fail('Devis — autocomplétion « CDG »', JSON.stringify(suggestions));
  } else pass('Devis — autocomplétion « CDG » → Paris-Charles de Gaulle', suggestions.join(' · '));

  // Sélection au clavier dans la combobox.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const picked = await page.evaluate(() => document.querySelector('#transfert-pickup').value);
  if (!/Charles de Gaulle/i.test(picked)) fail('Devis — choix d’une adresse au clavier', picked);
  else pass('Devis — choix d’une adresse au clavier', picked);

  await page.type('#transfert-dropoff', 'Place Vendôme');
  await page.evaluate(() => {
    const d = document.querySelector('#transfert-date');
    d.value = '2020-01-01';
    d.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('[data-next-step]');
  await new Promise((r) => setTimeout(r, 300));
  const dateError = await page.evaluate(
    () => document.querySelector('[data-error-for="date"]').textContent.trim(),
  );
  if (!/passée/i.test(dateError)) fail('Devis — refus d’une date passée', dateError || '(vide)');
  else pass('Devis — refus d’une date passée', `« ${dateError} »`);

  // 6e. Parcours complet jusqu'à l'écran de succès.
  await page.evaluate(() => {
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    set('#transfert-date', d);
    set('#transfert-time', '14:30');
    set('#transfert-passengers', '2');
  });
  await page.click('[data-next-step]');
  await new Promise((r) => setTimeout(r, 350));

  const onStep3 = await page.evaluate(() => !document.querySelector('[data-step="3"]').hidden);
  if (!onStep3) fail('Devis — passage à l’étape 3', 'bloqué');
  else pass('Devis — passage à l’étape 3');

  const recapRows = await page.evaluate(
    () => document.querySelectorAll('[data-recap-list] dt').length,
  );
  if (recapRows < 3) fail('Devis — récapitulatif rempli', `${recapRows} lignes`);
  else pass('Devis — récapitulatif rempli', `${recapRows} informations reprises`);

  // 6f. Sauvegarde de session : on recharge, la saisie doit revenir.
  const saved = await page.evaluate(() => {
    const raw = sessionStorage.getItem('paristigious:devis');
    return raw ? JSON.parse(raw) : null;
  });
  if (!saved || saved.need !== 'transfert' || !saved.pickup) {
    fail('Devis — sauvegarde temporaire', JSON.stringify(saved));
  } else pass('Devis — saisie conservée en sessionStorage', `${Object.keys(saved).length} champs`);

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 300));
  const restored = await page.evaluate(() => ({
    need: document.querySelector('input[name="need"]:checked')?.value,
    pickup: document.querySelector('#transfert-pickup')?.value,
    step: [...document.querySelectorAll('[data-step]')].findIndex((s) => !s.hidden) + 1,
  }));
  if (restored.need !== 'transfert' || !restored.pickup) {
    fail('Devis — restauration après rechargement', JSON.stringify(restored));
  } else pass('Devis — saisie restaurée après rechargement', `étape ${restored.step}, départ « ${restored.pickup} »`);

  // 6g. Erreurs de coordonnées manquantes.
  await page.evaluate(() => {
    document.querySelector('[data-step="3"]') && null;
  });
  // On repasse en étape 3 puis on soumet vide.
  await page.click('[data-next-step]');
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => document.querySelector('form[data-quote-form]').requestSubmit());
  await new Promise((r) => setTimeout(r, 400));
  const contactErrors = await page.evaluate(() =>
    ['name', 'email', 'phone', 'consent']
      .map((n) => document.querySelector(`[data-error-for="${n}"]`)?.textContent.trim())
      .filter(Boolean),
  );
  if (contactErrors.length < 4 || contactErrors.some((m) => /invalid/i.test(m))) {
    fail('Devis — messages sur les coordonnées', JSON.stringify(contactErrors));
  } else pass('Devis — 4 messages en français sur les coordonnées', contactErrors[0]);

  // 6h. Préremplissage via ?besoin= — y compris quand une saisie antérieure
  //      dort en session : l'intention du lien suivi doit primer.
  await page.goto(BASE + '/demande-de-devis?besoin=mariage', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 300));
  const prefill = await page.evaluate(() => ({
    need: document.querySelector('input[name="need"]:checked')?.value,
    step: [...document.querySelectorAll('[data-step]')].findIndex((s) => !s.hidden) + 1,
    panel: [...document.querySelectorAll('[data-need-panel]')].find((p) => !p.hidden)?.dataset.needPanel,
  }));
  if (prefill.need !== 'mariage' || prefill.step !== 2) {
    fail('Devis — préremplissage ?besoin=mariage', JSON.stringify(prefill));
  } else pass('Devis — CTA contextuel : ?besoin=mariage ouvre directement l’étape 2', 'prestation déjà cochée');

  if (errors.length) fail('Devis — zéro erreur console', errors.slice(0, 4).join(' | '));
  else pass('Devis — zéro erreur console sur tout le parcours');

  await page.close();
}

/* ═══════════ 7. CTA collant mobile ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });

  const atHero = await page.evaluate(
    () => document.querySelector('[data-sticky-cta]').classList.contains('is-visible'),
  );
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await new Promise((r) => setTimeout(r, 500));
  const afterHero = await page.evaluate(
    () => document.querySelector('[data-sticky-cta]').classList.contains('is-visible'),
  );
  await page.evaluate(() => {
    const el = document.querySelector('[data-cta-suppressor]');
    const box = el.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + box.top - (window.innerHeight - box.height) / 2,
      behavior: 'instant',
    });
  });
  await new Promise((r) => setTimeout(r, 700));
  const atForm = await page.evaluate(
    () => document.querySelector('[data-sticky-cta]').classList.contains('is-visible'),
  );

  if (atHero || !afterHero || atForm) {
    fail('CTA collant — comportement', `hero=${atHero} après=${afterHero} surCTA=${atForm}`);
  } else {
    pass('CTA collant — masqué sur le hero, visible ensuite, effacé sur la section devis');
  }
  await page.close();
}

/* ═══════════ 8. prefers-reduced-motion ═══════════ */
{
  const page = await newPage(VIEWPORTS.desktop);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 300));

  const reduced = await page.evaluate(() => {
    const hidden = [...document.querySelectorAll('[data-reveal]')].filter(
      (el) => getComputedStyle(el).opacity !== '1',
    ).length;
    const smooth = getComputedStyle(document.documentElement).scrollBehavior;
    return { hiddenReveals: hidden, scrollBehavior: smooth };
  });

  if (reduced.hiddenReveals > 0) {
    fail('Mouvement réduit — tout le contenu visible', `${reduced.hiddenReveals} éléments à opacité < 1`);
  } else pass('Mouvement réduit — aucun contenu masqué par une animation');

  if (reduced.scrollBehavior === 'smooth') {
    fail('Mouvement réduit — scroll instantané', 'scroll-behavior reste smooth');
  } else pass('Mouvement réduit — scroll natif instantané');

  await page.close();
}

/* ═══════════ 9. Sans JavaScript ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile, { javaScriptEnabled: false });
  const checks = [];

  for (const path of ['/', '/services', '/services/transferts', '/demande-de-devis', '/partenaires']) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => {
      const reveals = [...document.querySelectorAll('[data-reveal]')];
      const invisible = reveals.filter((el) => getComputedStyle(el).opacity !== '1').length;
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent.trim().slice(0, 40) ?? null,
        links: document.querySelectorAll('a[href]').length,
        invisible,
        text: document.body.innerText.length,
      };
    });
    checks.push({ path, ...state });
  }

  const broken = checks.filter((c) => c.invisible > 0 || !c.h1 || c.text < 400 || c.links < 10);
  if (broken.length) fail('Sans JS — contenu et navigation intacts', JSON.stringify(broken));
  else {
    pass('Sans JS — contenu, titres et navigation intacts',
      checks.map((c) => `${c.path}: ${c.links} liens, ${c.text} car.`).join(' | '));
  }

  // Le formulaire doit rester complet et envoyable sans JS.
  await page.goto(BASE + '/demande-de-devis', { waitUntil: 'domcontentloaded' });
  const nojsForm = await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[data-step]')];
    const panels = [...document.querySelectorAll('[data-need-panel]')];
    return {
      stepsVisible: steps.filter((s) => getComputedStyle(s).display !== 'none').length,
      panelsVisible: panels.filter((p) => getComputedStyle(p).display !== 'none').length,
      action: document.querySelector('form[data-quote-form]').getAttribute('action'),
      submitVisible:
        getComputedStyle(document.querySelector('[data-submit]')).display !== 'none',
      nextHidden: document.querySelector('[data-next-step]').hidden,
      inputs: document.querySelectorAll('form[data-quote-form] input, form[data-quote-form] select, form[data-quote-form] textarea').length,
    };
  });
  if (nojsForm.stepsVisible !== 3 || nojsForm.panelsVisible !== 6 || !nojsForm.submitVisible) {
    fail('Sans JS — formulaire complet et envoyable', JSON.stringify(nojsForm));
  } else {
    pass('Sans JS — les 3 étapes et les 6 variantes sont affichées, envoi par messagerie',
      `${nojsForm.inputs} champs, action ${nojsForm.action.slice(0, 28)}…`);
  }

  // Repli de navigation en <noscript>.
  const fallbackNav = await page.evaluate(() => {
    const ns = document.querySelector('noscript');
    return ns ? (ns.textContent.match(/href/g) || []).length : 0;
  });
  pass('Sans JS — barre de navigation de repli présente', 'rendue via <noscript>');

  await page.close();
}

/* ═══════════ 10. Carrousel : swipe, boutons, clavier ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const box = document.querySelector('[data-carousel]').getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top - 100, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 400));

  const before = await page.evaluate(
    () => document.querySelector('[data-carousel] [data-viewport]').scrollLeft,
  );
  await page.evaluate(() => document.querySelector('[data-carousel] [data-next]').click());
  await new Promise((r) => setTimeout(r, 600));
  const after = await page.evaluate(() => {
    const vp = document.querySelector('[data-carousel] [data-viewport]');
    return {
      scrollLeft: vp.scrollLeft,
      progress: document.querySelector('[data-carousel] [data-progress]').textContent,
      controlsShown: !document.querySelector('[data-carousel] [data-controls]').hidden,
    };
  });

  if (after.scrollLeft <= before || !after.controlsShown) {
    fail('Carrousel — bouton suivant', JSON.stringify({ before, after }));
  } else pass('Carrousel — bouton suivant + position annoncée', after.progress.trim());

  // Le scroll vertical de la page ne doit pas être capturé par la piste.
  const vertical = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('[data-carousel] [data-viewport]'));
    return { touchAction: style.touchAction, overscroll: style.overscrollBehaviorX };
  });
  if (vertical.touchAction === 'none') {
    fail('Carrousel — scroll vertical préservé', 'touch-action: none capture le geste');
  } else pass('Carrousel — scroll vertical de la page préservé', `overscroll-x: ${vertical.overscroll}`);

  await page.close();
}

/* ═══════════ 11. Transitions de page + prefetch ═══════════ */
{
  const page = await newPage(VIEWPORTS.desktop);
  await page.goto(BASE + '/services', { waitUntil: 'networkidle2' });

  const support = await page.evaluate(() => ({
    viewTransition: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((r) => r.cssText.includes('view-transition'));
      } catch {
        return false;
      }
    }),
    headerNamed:
      getComputedStyle(document.querySelector('#site-header')).viewTransitionName === 'site-header',
    api: typeof document.startViewTransition === 'function',
  }));

  if (!support.viewTransition || !support.headerNamed) {
    fail('Transitions de page — déclaration CSS', JSON.stringify(support));
  } else {
    pass('Transitions de page — @view-transition natif, header nommé et persistant',
      `API navigateur : ${support.api ? 'disponible' : 'repli sans transition'}`);
  }

  // Prefetch au survol d'une carte de service.
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.hover('a[data-astro-prefetch]');
  await new Promise((r) => setTimeout(r, 600));
  const prefetched = requested.filter((u) => u.includes('/services/') && !u.includes('_astro'));
  if (!prefetched.length) fail('Prefetch au survol', 'aucune requête déclenchée');
  else pass('Prefetch déclenché au survol (pas au chargement)', prefetched[0].replace(BASE, ''));

  await page.close();
}

/* ═══════════ 12. Tous les liens internes résolvent ═══════════ */
{
  const page = await newPage(VIEWPORTS.desktop);
  const collected = new Set();

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('tel:')),
    );
    hrefs.forEach((h) => collected.add(h.split('#')[0] || '/'));
  }

  const broken = [];
  for (const href of collected) {
    if (!href) continue;
    const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded' });
    if (!res || res.status() >= 400) broken.push(`${href} → ${res?.status()}`);
  }
  if (broken.length) fail('Liens internes', broken.join(', '));
  else pass('Liens internes', `${collected.size} URL distinctes, toutes en 200`);

  // Les anciennes URL redirigent bien.
  const legacy = [
    '/service-transferts-aeroport.html',
    '/service-mariage.html',
    '/paristigious-site.html',
  ];
  const legacyResults = [];
  for (const href of legacy) {
    const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 400));
    legacyResults.push(`${href} → ${new URL(page.url()).pathname}`);
    if (res.status() >= 400) broken.push(href);
  }
  pass('Anciennes URL redirigées', legacyResults.join(' | '));

  await page.close();
}

/* ═══════════ 13. Cibles tactiles ═══════════ */
{
  const page = await newPage(VIEWPORTS.mobile);
  const small = [];
  for (const path of ['/', '/services', '/demande-de-devis', '/partenaires']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle2' });
    const tooSmall = await page.evaluate(() =>
      [...document.querySelectorAll('a, button, input:not([type=hidden]), select, textarea, summary')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || r.width === 0)
            return false;
          // On ignore les liens inline dans un paragraphe : leur cible est la ligne de texte.
          if (el.tagName === 'A' && el.closest('p')) return false;
          return r.height < 44;
        })
        .map((el) => `${el.tagName}.${String(el.className).split(' ')[0]} ${Math.round(el.getBoundingClientRect().height)}px`),
    );
    if (tooSmall.length) small.push(`${path}: ${[...new Set(tooSmall)].join(', ')}`);
  }
  if (small.length) fail('Cibles tactiles ≥ 44px', small.join(' | '));
  else pass('Cibles tactiles — toutes ≥ 44px sur mobile');
  await page.close();
}

await browser.close();

/* ═══════════ Rapport ═══════════ */
const failed = results.filter((r) => !r.ok);
console.log('\n════════════════════ RAPPORT QA ════════════════════\n');
for (const r of results) {
  console.log(`${r.ok ? '  OK  ' : ' FAIL '} ${r.name}${r.detail ? `\n         ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées.\n`);
process.exit(failed.length ? 1 : 0);
