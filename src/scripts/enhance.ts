/**
 * Améliorations globales, chargées une seule fois par page.
 * Tout ce qui est ici est strictement additif : sans ce script, la page
 * reste lisible, navigable et complète. (règle 19)
 */

/**
 * État « scrollé » du header via une sentinelle observée.
 * Aucun écouteur de scroll : le navigateur nous prévient au franchissement,
 * ce qui évite tout travail à chaque frame de défilement. (règle 26)
 */
function headerState(): void {
  const sentinel = document.querySelector('#header-sentinel');
  if (!sentinel || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      document.documentElement.classList.toggle('is-scrolled', !entry?.isIntersecting);
    },
    { rootMargin: '0px' },
  );
  observer.observe(sentinel);
}

/**
 * Reveals au scroll : opacity + translateY, une seule fois, puis on se
 * désabonne. Pas de librairie, pas d'animation permanente. (règle 4)
 */
function reveals(): void {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!items.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = el.dataset.revealDelay;
        if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
        el.classList.add('is-revealed');
        observer.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -8%' },
  );

  items.forEach((el) => observer.observe(el));
}

/**
 * Barre CTA mobile : n'apparaît qu'une fois le hero quitté et s'efface dès
 * que le formulaire de devis (ou son CTA) est à l'écran, pour ne jamais
 * recouvrir ce que le visiteur est en train de lire. (règle 23)
 */
function stickyCta(): void {
  const bar = document.querySelector<HTMLElement>('[data-sticky-cta]');
  if (!bar || !('IntersectionObserver' in window)) return;

  // La hauteur du hero varie selon le contenu et le format d'écran.
  // Observer sa sortie réelle évite d'afficher la barre par-dessus ses actions.
  const showAfter = document.querySelector('.hero') ?? document.querySelector('[data-sticky-cta-anchor]');
  const hideNear = document.querySelectorAll('[data-cta-suppressor]');

  let pastHero = false;
  let overlapping = false;
  const sync = () => bar.classList.toggle('is-visible', pastHero && !overlapping);

  if (showAfter) {
    new IntersectionObserver(([entry]) => {
      pastHero = !!entry && !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    }).observe(showAfter);
  }

  if (hideNear.length) {
    const seen = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target);
        });
        overlapping = seen.size > 0;
        sync();
      },
      { rootMargin: '0px 0px -20%' },
    );
    hideNear.forEach((el) => observer.observe(el));
  }
}

/**
 * Retour en haut : discret, apparaît seulement après un défilement réel,
 * et déplace vraiment le focus pour que le clavier suive. (règle 30)
 */
function backToTop(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-back-to-top]');
  const sentinel = document.querySelector('[data-back-to-top-anchor]');
  if (!button || !sentinel || !('IntersectionObserver' in window)) return;

  // « Non visible » ne suffit pas : au chargement, l'ancre est simplement
  // plus bas dans la page. On ne montre le bouton que lorsqu'elle est passée
  // AU-DESSUS du viewport, c'est-à-dire après un vrai défilement.
  new IntersectionObserver(([entry]) => {
    const scrolledPast = !!entry && !entry.isIntersecting && entry.boundingClientRect.top < 0;
    button.classList.toggle('is-visible', scrolledPast);
  }).observe(sentinel);

  button.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.querySelector<HTMLElement>('.skip-link')?.focus({ preventScroll: true });
  });
}

/**
 * Scrollspy sobre pour les pages longues : met à jour le lien courant de la
 * navigation secondaire. Purement indicatif, la navigation fonctionne sans. (règle 29)
 */
function scrollspy(): void {
  const nav = document.querySelector<HTMLElement>('[data-scrollspy]');
  if (!nav || !('IntersectionObserver' in window)) return;

  const links = new Map<string, HTMLAnchorElement>();
  nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    links.set(a.getAttribute('href')!.slice(1), a);
  });

  const targets = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (!targets.length) return;

  const visible = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id);
      });
      // Le premier de la liste encore visible fait foi : ordre du document,
      // donc l'indicateur ne saute pas quand deux sections se chevauchent.
      const current = targets.find((el) => visible.has(el.id))?.id;
      links.forEach((link, id) => {
        link.toggleAttribute('data-current', id === current);
      });
    },
    { rootMargin: '-20% 0px -60%' },
  );

  targets.forEach((el) => observer.observe(el));
}

headerState();
reveals();
stickyCta();
backToTop();
scrollspy();
