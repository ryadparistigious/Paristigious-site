/**
 * Menu mobile — surcouche minimale autour de <dialog>.
 *
 * Ce que le navigateur fait déjà et qu'on ne réécrit surtout pas :
 * piégeage du focus, restitution du focus à la fermeture, fermeture par
 * Escape, inertisation de l'arrière-plan, empilement en top-layer.
 *
 * Ce qui reste à notre charge : synchroniser aria-expanded, bloquer le
 * scroll derrière le panneau, fermer sur clic du fond et sur navigation.
 */

export function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const dialog = document.querySelector<HTMLDialogElement>('#mobile-menu');
  if (!toggle || !dialog || typeof dialog.showModal !== 'function') return;

  const open = () => {
    dialog.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    // Compense la disparition de la scrollbar pour éviter tout décalage (CLS).
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingInlineEnd = gap > 0 ? `${gap}px` : '';
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    if (dialog.open) dialog.close();
  };

  // `close` est émis aussi bien par Escape que par dialog.close().
  dialog.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.style.overflow = '';
    document.body.style.paddingInlineEnd = '';
  });

  toggle.addEventListener('click', () => {
    dialog.open ? close() : open();
  });

  dialog.querySelector<HTMLButtonElement>('[data-menu-close]')?.addEventListener('click', close);

  // Un clic hors du contenu ferme le panneau. On compare aux limites du
  // dialog lui-même : c'est la seule façon fiable de détecter le backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) close();
  });

  // Toute navigation depuis le menu le referme, y compris les ancres.
  dialog.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) close();
  });

  // Retour au desktop pendant que le menu est ouvert : on referme, sinon
  // le panneau resterait affiché par-dessus une navigation déjà visible.
  const desktop = window.matchMedia('(min-width: 64rem)');
  desktop.addEventListener('change', (e) => {
    if (e.matches) close();
  });
}
