/**
 * Contrôleur de piste horizontale.
 *
 * On pilote un conteneur `overflow-x: auto` natif plutôt qu'une librairie :
 * le navigateur garde la main sur l'inertie, le snapping, le trackpad et le
 * scroll vertical de la page — trois choses qu'un slider maison casse
 * systématiquement sur mobile. Il ne reste ici que ce que le natif ne fait
 * pas : boutons, position lue à voix haute, et glisser à la souris.
 */

const DRAG_THRESHOLD = 4;

function initOne(root: HTMLElement): void {
  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  const track = root.querySelector<HTMLElement>('[data-track]');
  const controls = root.querySelector<HTMLElement>('[data-controls]');
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const progress = root.querySelector<HTMLElement>('[data-progress]');
  if (!viewport || !track || !controls || !prev || !next) return;

  const slides = () => Array.from(track.children) as HTMLElement[];

  /** Pas de défilement = largeur d'une carte + gouttière. */
  const step = (): number => {
    const items = slides();
    const first = items[0];
    if (!first) return viewport.clientWidth;
    const second = items[1];
    return second
      ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
      : first.getBoundingClientRect().width;
  };

  const overflows = () => viewport.scrollWidth - viewport.clientWidth > 2;

  const currentIndex = (): number => {
    const s = step();
    return s > 0 ? Math.round(viewport.scrollLeft / s) : 0;
  };

  const sync = (): void => {
    const canScroll = overflows();
    controls.hidden = !canScroll;
    if (!canScroll) return;

    const max = viewport.scrollWidth - viewport.clientWidth;
    prev.disabled = viewport.scrollLeft <= 1;
    next.disabled = viewport.scrollLeft >= max - 1;

    if (progress) {
      const total = slides().length;
      progress.textContent = `${String(Math.min(currentIndex() + 1, total)).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
  };

  const scrollByStep = (direction: 1 | -1): void => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({ left: step() * direction, behavior: reduced ? 'auto' : 'smooth' });
  };

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));

  // Flèches gauche/droite quand la piste a le focus. Le défilement vertical
  // et les autres touches restent au navigateur.
  viewport.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    scrollByStep(event.key === 'ArrowRight' ? 1 : -1);
  });

  let ticking = false;
  viewport.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sync();
        ticking = false;
      });
    },
    { passive: true },
  );

  // ─── Glisser à la souris ────────────────────────────────
  // Uniquement pour les pointeurs fins : le tactile est déjà parfait en natif
  // et l'intercepter ne ferait que gêner le scroll vertical. (règle 38)
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !overflows()) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startScroll = viewport.scrollLeft;
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    if (!moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    if (!moved) {
      moved = true;
      root.setAttribute('data-dragging', '');
      viewport.setPointerCapture(event.pointerId);
    }
    viewport.scrollLeft = startScroll - delta;
  });

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    root.removeAttribute('data-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    // Le snap ayant été désactivé pendant le glissement, on recale sur la
    // carte la plus proche pour ne jamais s'arrêter entre deux.
    if (moved) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      viewport.scrollTo({ left: currentIndex() * step(), behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  // Un glissement ne doit pas suivre le lien sur lequel il s'est terminé.
  viewport.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }
  }, true);

  // Les contrôles apparaissent/disparaissent selon que la piste déborde.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => sync()).observe(viewport);
  } else {
    window.addEventListener('resize', sync);
  }

  sync();
}

export function initCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((el) => {
    if (el.dataset.ready) return;
    el.dataset.ready = '1';
    initOne(el);
  });
}
