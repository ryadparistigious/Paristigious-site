/**
 * Méga-menu desktop.
 *
 * Ouverture au survol avec délai d'intention (on ne déclenche pas le panneau
 * quand la souris ne fait que traverser), au clic et au clavier.
 * Fermeture : Escape, clic extérieur, sortie du focus, sortie de la souris.
 *
 * Sans JavaScript, le bouton d'ouverture est masqué en CSS et le lien
 * « Services » mène à la page qui liste les mêmes entrées.
 */

const HOVER_IN_DELAY = 90;
const HOVER_OUT_DELAY = 180;

export function initDropdown(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-dropdown]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  roots.forEach((root) => {
    const trigger = root.querySelector<HTMLButtonElement>('[data-dropdown-trigger]');
    const panel = root.querySelector<HTMLElement>('[data-dropdown-panel]');
    if (!trigger || !panel) return;

    let timer: number | undefined;

    const setOpen = (next: boolean) => {
      window.clearTimeout(timer);
      trigger.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
    };

    const schedule = (next: boolean, delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOpen(next), delay);
    };

    trigger.addEventListener('click', () => {
      setOpen(trigger.getAttribute('aria-expanded') !== 'true');
    });

    // Flèche bas : ouvre et donne le focus à la première entrée, comme un
    // menu natif.
    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      setOpen(true);
      panel.querySelector('a')?.focus();
    });

    if (finePointer.matches) {
      root.addEventListener('pointerenter', () => schedule(true, HOVER_IN_DELAY));
      root.addEventListener('pointerleave', () => schedule(false, HOVER_OUT_DELAY));
    }

    // Le focus qui ENTRE dans le panneau le maintient ouvert (utile quand on
    // tabule depuis le déclencheur). En revanche, focaliser le déclencheur
    // lui-même n'ouvre rien : sinon la touche Entrée qui suit refermerait
    // aussitôt ce que le focus vient d'ouvrir.
    root.addEventListener('focusin', (event) => {
      if (panel.contains(event.target as Node)) setOpen(true);
    });
    root.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && root.contains(next)) return;
      setOpen(false);
    });

    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.focus();
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target as Node)) setOpen(false);
    });
  });
}
