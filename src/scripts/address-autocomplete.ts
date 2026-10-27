/**
 * <address-autocomplete> — combobox d'adresses.
 *
 * Web Component qui enveloppe un <input> déjà présent dans le HTML : si le
 * script ne se charge pas, l'utilisateur a devant lui un champ texte tout à
 * fait fonctionnel. L'enrichissement est strictement additif. (règle 19)
 *
 * Deux sources de suggestions :
 *  1. un jeu local de lieux fréquents (aéroports, gares, palaces, Côte d'Azur),
 *     disponible immédiatement, hors ligne et sans clé ;
 *  2. optionnellement un fournisseur distant (Google Places, Mapbox, HERE…)
 *     branché via `PUBLIC_GEO_ENDPOINT`. Tant que la variable n'est pas
 *     définie, aucune requête n'est émise et aucune clé n'est requise.
 *
 * Le fournisseur distant doit répondre à `GET <endpoint>?q=<terme>` par
 * `{ results: [{ label: string, detail?: string }] }`.
 *
 * Motif ARIA : combobox + listbox, navigation ↑ ↓, Entrée, Échap.
 */

import { places, type Place } from '../lib/places';

const REMOTE_ENDPOINT = import.meta.env.PUBLIC_GEO_ENDPOINT as string | undefined;
const DEBOUNCE = 180;
const MAX_RESULTS = 6;

/** Normalise pour comparer sans accents ni casse. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function searchLocal(query: string): Place[] {
  const q = fold(query);
  if (q.length < 2) return [];

  const scored: Array<{ place: Place; score: number }> = [];
  for (const place of places) {
    const haystacks = [place.label, ...(place.alias ?? [])].map(fold);
    let best = -1;
    for (const hay of haystacks) {
      const at = hay.indexOf(q);
      if (at === -1) continue;
      // Un préfixe vaut mieux qu'une occurrence au milieu du libellé.
      const score = at === 0 ? 0 : 1 + at / 100;
      if (best === -1 || score < best) best = score;
    }
    if (best !== -1) scored.push({ place, score: best });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.place);
}

async function searchRemote(query: string, signal: AbortSignal): Promise<Place[]> {
  if (!REMOTE_ENDPOINT) return [];
  try {
    const response = await fetch(`${REMOTE_ENDPOINT}?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: Array<{ label?: string; detail?: string }> };
    return (data.results ?? [])
      .filter((r): r is { label: string; detail?: string } => typeof r.label === 'string')
      .map((r) => ({ label: r.label, detail: r.detail ?? '' }));
  } catch {
    // Réseau indisponible ou requête annulée : le champ reste utilisable,
    // les suggestions locales suffisent. Aucune erreur affichée.
    return [];
  }
}

class AddressAutocomplete extends HTMLElement {
  #input!: HTMLInputElement;
  #list!: HTMLUListElement;
  #status!: HTMLElement;
  #items: Place[] = [];
  #active = -1;
  #timer?: number;
  #controller?: AbortController;

  connectedCallback(): void {
    const input = this.querySelector('input');
    const list = this.querySelector('ul');
    const status = this.querySelector('[data-ac-status]');
    if (!(input instanceof HTMLInputElement) || !(list instanceof HTMLUListElement) || !status) return;

    this.#input = input;
    this.#list = list;
    this.#status = status as HTMLElement;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('autocomplete', 'off');

    input.addEventListener('input', () => this.#onInput());
    input.addEventListener('keydown', (e) => this.#onKeydown(e));
    input.addEventListener('blur', () => {
      // Laisse le temps au clic sur une option d'aboutir avant de fermer.
      window.setTimeout(() => this.#close(), 120);
    });

    list.addEventListener('mousedown', (event) => {
      const option = (event.target as HTMLElement).closest('[data-index]');
      if (!option) return;
      event.preventDefault();
      this.#choose(Number(option.getAttribute('data-index')));
    });
  }

  #onInput(): void {
    window.clearTimeout(this.#timer);
    const query = this.#input.value;

    // Les suggestions locales s'affichent sans attendre : aucune latence
    // perçue sur les termes les plus fréquents.
    this.#render(searchLocal(query));

    if (!REMOTE_ENDPOINT || query.trim().length < 3) return;
    this.#timer = window.setTimeout(async () => {
      this.#controller?.abort();
      this.#controller = new AbortController();
      const remote = await searchRemote(query, this.#controller.signal);
      if (this.#input.value !== query || remote.length === 0) return;
      const local = searchLocal(query);
      const seen = new Set(local.map((p) => p.label));
      this.#render([...local, ...remote.filter((p) => !seen.has(p.label))].slice(0, MAX_RESULTS));
    }, DEBOUNCE);
  }

  #render(items: Place[]): void {
    this.#items = items;
    this.#active = -1;

    if (items.length === 0) {
      this.#close();
      return;
    }

    this.#list.innerHTML = items
      .map(
        (place, i) =>
          `<li role="option" id="${this.#list.id}-o${i}" data-index="${i}" aria-selected="false">` +
          `<span class="ac__label"></span>` +
          (place.detail ? `<span class="ac__detail"></span>` : '') +
          `</li>`,
      )
      .join('');

    // Le texte est injecté via textContent, jamais via innerHTML : une
    // réponse de fournisseur reste de la donnée, pas du balisage.
    this.#list.querySelectorAll('li').forEach((li, i) => {
      const place = items[i];
      if (!place) return;
      li.querySelector('.ac__label')!.textContent = place.label;
      const detail = li.querySelector('.ac__detail');
      if (detail) detail.textContent = place.detail;
    });

    this.#list.hidden = false;
    this.#input.setAttribute('aria-expanded', 'true');
    this.#status.textContent = `${items.length} proposition${items.length > 1 ? 's' : ''}`;
  }

  #close(): void {
    this.#list.hidden = true;
    this.#list.innerHTML = '';
    this.#input.setAttribute('aria-expanded', 'false');
    this.#input.removeAttribute('aria-activedescendant');
    this.#items = [];
    this.#active = -1;
    this.#status.textContent = '';
  }

  #move(delta: number): void {
    if (this.#items.length === 0) return;
    this.#active = (this.#active + delta + this.#items.length) % this.#items.length;
    this.#list.querySelectorAll('li').forEach((li, i) => {
      const current = i === this.#active;
      li.setAttribute('aria-selected', String(current));
      li.classList.toggle('is-active', current);
    });
    this.#input.setAttribute('aria-activedescendant', `${this.#list.id}-o${this.#active}`);
  }

  #choose(index: number): void {
    const place = this.#items[index];
    if (!place) return;
    this.#input.value = place.label;
    this.#close();
    this.#input.dispatchEvent(new Event('input', { bubbles: true }));
    this.#input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #onKeydown(event: KeyboardEvent): void {
    if (this.#list.hidden) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.#move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.#move(-1);
        break;
      case 'Enter':
        if (this.#active >= 0) {
          event.preventDefault();
          this.#choose(this.#active);
        }
        break;
      case 'Escape':
        this.#close();
        break;
    }
  }
}

export function initAddressAutocomplete(): void {
  if (!customElements.get('address-autocomplete')) {
    customElements.define('address-autocomplete', AddressAutocomplete);
  }
}
