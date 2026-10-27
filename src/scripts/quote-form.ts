/**
 * Pilotage du formulaire de devis.
 *
 * Responsabilités :
 *  - découper le formulaire en trois étapes et n'afficher que les champs
 *    pertinents pour la prestation choisie (règle 11) ;
 *  - préremplir la prestation depuis `?besoin=` (règle 17) ;
 *  - conserver la saisie en sessionStorage jusqu'à l'envoi (règle 16) ;
 *  - valider au bon moment, avec des messages en français (règle 12) ;
 *  - donner un état visuel à l'envoi et gérer les pannes réseau (règles 15 et 33).
 *
 * Zod n'est chargé qu'à la première validation : il ne pèse pas sur
 * l'affichage initial de la page.
 */

const STORAGE_KEY = 'paristigious:devis';
const TIMEOUT_MS = 12_000;

type Validator = typeof import('../lib/quote').validateQuote;
let validate: Validator | null = null;

async function getValidator(): Promise<Validator> {
  if (!validate) {
    const module = await import('../lib/quote');
    validate = module.validateQuote;
  }
  return validate;
}

export function initQuoteForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-quote-form]');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>('[data-step]'));
  const markers = Array.from(form.querySelectorAll<HTMLElement>('[data-step-marker]'));
  const panels = Array.from(form.querySelectorAll<HTMLElement>('[data-need-panel]'));
  const prevButton = form.querySelector<HTMLButtonElement>('[data-prev-step]');
  const nextButton = form.querySelector<HTMLButtonElement>('[data-next-step]');
  const submitButton = form.querySelector<HTMLButtonElement>('[data-submit]');
  const formError = form.querySelector<HTMLElement>('[data-form-error]');
  const recap = form.querySelector<HTMLElement>('[data-recap]');
  const recapList = form.querySelector<HTMLElement>('[data-recap-list]');
  const success = document.querySelector<HTMLElement>('[data-success]');
  const successDetail = document.querySelector<HTMLElement>('[data-success-detail]');
  const endpoint = form.dataset.endpoint;

  if (!steps.length || !prevButton || !nextButton || !submitButton) return;

  /** Une fois l'utilisateur passé par une validation, on peut réagir au blur. */
  const touched = new Set<string>();
  let current = 1;

  /* ═════ Sélection de la prestation ═════ */

  const selectedNeed = (): string | null => {
    const checked = form.querySelector<HTMLInputElement>('input[name="need"]:checked');
    return checked ? checked.value : null;
  };

  /**
   * Les champs d'un panneau masqué sont désactivés : ils sortent du FormData,
   * de la validation native et de l'ordre de tabulation d'un seul coup.
   */
  const syncPanels = (): void => {
    const need = selectedNeed();
    panels.forEach((panel) => {
      const active = panel.dataset.needPanel === need;
      panel.hidden = !active;
      panel.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((field) => {
        field.disabled = !active;
      });
    });
  };

  /* ═════ Navigation entre étapes ═════ */

  const showStep = (index: number, focus = true): void => {
    current = Math.min(Math.max(index, 1), steps.length);

    steps.forEach((step) => {
      step.hidden = Number(step.dataset.step) !== current;
    });

    markers.forEach((marker) => {
      const n = Number(marker.dataset.stepMarker);
      marker.dataset.state = n === current ? 'current' : n < current ? 'done' : 'todo';
    });

    prevButton.hidden = current === 1;
    nextButton.hidden = current === steps.length;
    submitButton.hidden = current !== steps.length;

    if (recap) recap.hidden = current !== steps.length;
    if (current === steps.length) buildRecap();

    if (!focus) return;

    // On amène le haut du formulaire dans le viewport plutôt que de laisser
    // le visiteur chercher où le contenu a changé.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = form.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduced ? 'auto' : 'smooth' });

    const legend = steps[current - 1]?.querySelector<HTMLElement>('legend');
    if (legend) {
      legend.setAttribute('tabindex', '-1');
      legend.focus({ preventScroll: true });
    }
  };

  /* ═════ Messages d'erreur ═════ */

  const clearErrors = (): void => {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
      el.textContent = '';
    });
    form.querySelectorAll<HTMLElement>('[aria-invalid]').forEach((el) => {
      el.removeAttribute('aria-invalid');
    });
    if (formError) formError.textContent = '';
  };

  const fieldElement = (name: string): HTMLElement | null =>
    steps
      .map((step) =>
        step.querySelector<HTMLElement>(
          `[data-field="${name}"]:not([disabled]), [data-field="${name}"]:not(:disabled)`,
        ),
      )
      .find((el): el is HTMLElement => el !== null) ?? null;

  const showErrors = (errors: Record<string, string>): number | null => {
    let firstStep: number | null = null;
    let firstField: HTMLElement | null = null;

    for (const [name, message] of Object.entries(errors)) {
      const target = fieldElement(name);
      const holder =
        target?.closest('.field, fieldset')?.querySelector<HTMLElement>(`[data-error-for="${name}"]`) ??
        form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (holder) holder.textContent = message;
      if (target) target.setAttribute('aria-invalid', 'true');

      const step = target?.closest<HTMLElement>('[data-step]');
      const n = step ? Number(step.dataset.step) : null;
      if (n !== null && (firstStep === null || n < firstStep)) {
        firstStep = n;
        firstField = target;
      }
    }

    if (firstStep !== null && firstStep !== current) showStep(firstStep, false);
    firstField?.focus({ preventScroll: false });
    return firstStep;
  };

  /* ═════ Collecte et validation ═════ */

  const collect = (): Record<string, string> => {
    const data: Record<string, string> = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === 'string') data[key] = value;
    }
    // Une case décochée n'apparaît pas dans FormData : on l'exprime
    // explicitement pour que le schéma puisse produire son message.
    if (!('consent' in data)) data.consent = '';
    return data;
  };

  const runValidation = async (): Promise<Record<string, string>> => {
    const validator = await getValidator();
    const result = validator(collect());
    return result.ok ? {} : result.errors;
  };

  /** Erreurs limitées aux champs présents dans l'étape demandée. */
  const errorsForStep = (all: Record<string, string>, step: number): Record<string, string> => {
    const scoped: Record<string, string> = {};
    for (const [name, message] of Object.entries(all)) {
      const el = fieldElement(name);
      const owner = el?.closest<HTMLElement>('[data-step]');
      if (owner && Number(owner.dataset.step) === step) scoped[name] = message;
    }
    return scoped;
  };

  /* ═════ Récapitulatif ═════ */

  const buildRecap = (): void => {
    if (!recapList) return;
    const need = form.querySelector<HTMLInputElement>('input[name="need"]:checked');
    const rows: Array<[string, string]> = [];

    if (need) {
      const label = need.closest('label')?.querySelector('.need__label')?.textContent?.trim();
      if (label) rows.push(['Prestation', label]);
    }

    const activePanel = panels.find((p) => !p.hidden);
    activePanel?.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((field) => {
      if (!field.value.trim()) return;
      const label = activePanel.querySelector(`label[for="${field.id}"]`)?.textContent?.replace('*', '').trim();
      if (label) rows.push([label, field.value.trim()]);
    });

    recapList.innerHTML = '';
    for (const [key, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = value;
      recapList.append(dt, dd);
    }
  };

  /* ═════ Sauvegarde temporaire ═════ */

  const save = (): void => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(collect()));
    } catch {
      // Stockage indisponible (navigation privée, quota) : sans conséquence,
      // la saisie en cours reste dans le DOM.
    }
  };

  const restore = (): void => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as Record<string, string>;
      const need = data.need;
      if (need) {
        const radio = form.querySelector<HTMLInputElement>(`input[name="need"][value="${need}"]`);
        if (radio) radio.checked = true;
        syncPanels();
      }
      for (const [key, value] of Object.entries(data)) {
        if (key === 'need' || key === 'consent') continue;
        form
          .querySelectorAll<HTMLInputElement>(`[name="${key}"]`)
          .forEach((field) => {
            if (!field.disabled && !field.value) field.value = value;
          });
      }
    } catch {
      // Contenu illisible : on repart d'un formulaire vierge.
    }
  };

  /* ═════ Envoi ═════ */

  const mailtoHref = (data: Record<string, string>): string => {
    const need = form.querySelector<HTMLInputElement>('input[name="need"]:checked');
    const label = need?.closest('label')?.querySelector('.need__label')?.textContent?.trim() ?? 'Demande';
    const lines = Object.entries(data)
      .filter(([key, value]) => key !== 'consent' && value.trim())
      .map(([key, value]) => `${key} : ${value}`);
    const subject = encodeURIComponent(`Demande de devis — ${label}`);
    const body = encodeURIComponent(lines.join('\n'));
    const address = (form.getAttribute('action') ?? '').replace(/^mailto:/, '').split('?')[0];
    return `mailto:${address}?subject=${subject}&body=${body}`;
  };

  const showSuccess = (detail: string): void => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* rien à nettoyer */
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      if (successDetail) successDetail.textContent = detail;
      success.focus();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = success.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: Math.max(top, 0), behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  const send = async (data: Record<string, string>): Promise<void> => {
    submitButton.dataset.state = 'loading';
    if (formError) formError.textContent = '';

    // Sans point d'envoi configuré, on prépare la demande dans la messagerie
    // du visiteur. Le succès est annoncé pour ce qu'il est, sans mentir.
    if (!endpoint) {
      window.location.href = mailtoHref(data);
      window.setTimeout(() => {
        submitButton.dataset.state = 'success';
        showSuccess(
          'Votre messagerie s’est ouverte avec la demande déjà rédigée. Vérifiez-la puis envoyez-la : nous la traitons dès réception.',
        );
      }, 600);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(String(response.status));

      submitButton.dataset.state = 'success';
      showSuccess('Nous revenons vers vous avec une proposition adaptée à votre demande.');
    } catch (error) {
      // Aucun champ n'est vidé : le visiteur peut réessayer ou nous écrire. (règle 33)
      delete submitButton.dataset.state;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
      if (formError) {
        formError.textContent = offline
          ? 'Vous semblez hors connexion. Votre demande est conservée : réessayez une fois le réseau revenu.'
          : timedOut
            ? 'Le serveur met trop de temps à répondre. Réessayez dans un instant, ou écrivez-nous directement par e-mail.'
            : 'Impossible d’envoyer la demande pour le moment. Vous pouvez réessayer ou nous contacter par e-mail.';
      }
      formError?.scrollIntoView({ block: 'nearest' });
    }
  };

  /* ═════ Branchements ═════ */

  // Le module de validation est chargé dès la première interaction, en tâche
  // de fond : quand le visiteur clique enfin sur « Continuer », il est déjà là.
  // Aucun octet n'est dépensé pour quelqu'un qui ne touche pas au formulaire.
  form.addEventListener('focusin', () => void getValidator(), { once: true });
  form.addEventListener('pointerdown', () => void getValidator(), { once: true });

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.name === 'need') {
      syncPanels();
      form.querySelector<HTMLElement>('[data-error-for="need"]')!.textContent = '';
    }
    save();
  });

  form.addEventListener('input', (event) => {
    const target = event.target as HTMLElement;
    const name = target.dataset?.field;
    if (!name) return;
    // On efface l'erreur dès la correction, sans en afficher de nouvelle
    // tant que le champ n'a pas été quitté.
    target.removeAttribute('aria-invalid');
    const holder = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (holder) holder.textContent = '';
  });

  // Validation au blur, mais seulement pour les champs déjà signalés une fois :
  // aucun message rouge ne surgit pendant la première frappe. (règle 12)
  form.addEventListener(
    'focusout',
    async (event) => {
      const target = event.target as HTMLElement;
      const name = target.dataset?.field;
      if (!name || !touched.has(name)) return;
      const errors = await runValidation();
      const message = errors[name];
      const holder = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (message) {
        if (holder) holder.textContent = message;
        target.setAttribute('aria-invalid', 'true');
      } else if (holder) {
        holder.textContent = '';
        target.removeAttribute('aria-invalid');
      }
    },
    true,
  );

  nextButton.addEventListener('click', async () => {
    clearErrors();
    const errors = await runValidation();
    const scoped = errorsForStep(errors, current);
    // L'étape 1 n'a pas de champ rattaché : on vérifie la sélection à la main.
    if (current === 1 && !selectedNeed()) {
      scoped.need = 'Choisissez le type de prestation souhaité.';
    }

    if (Object.keys(scoped).length) {
      Object.keys(scoped).forEach((n) => touched.add(n));
      showErrors(scoped);
      return;
    }
    showStep(current + 1);
  });

  prevButton.addEventListener('click', () => {
    clearErrors();
    showStep(current - 1);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const errors = await runValidation();
    if (Object.keys(errors).length) {
      Object.keys(errors).forEach((n) => touched.add(n));
      showErrors(errors);
      if (formError) {
        const count = Object.keys(errors).length;
        formError.textContent =
          count === 1
            ? 'Une information est encore nécessaire pour préparer votre devis.'
            : `${count} informations sont encore nécessaires pour préparer votre devis.`;
      }
      return;
    }

    await send(collect());
  });

  /* ═════ Démarrage ═════ */

  restore();

  // Préremplissage depuis l'URL : un CTA « Organiser un événement » n'ouvre
  // jamais un formulaire vide. Appliqué APRÈS la restauration, car l'intention
  // exprimée par le lien qu'on vient de suivre prime toujours sur une saisie
  // abandonnée plus tôt. (règle 17)
  const requested = new URLSearchParams(window.location.search).get('besoin');
  if (requested) {
    const radio = form.querySelector<HTMLInputElement>(
      `input[name="need"][value="${CSS.escape(requested)}"]`,
    );
    if (radio) radio.checked = true;
  }

  syncPanels();
  // Le besoin est déjà connu : on ouvre directement sur l'étape utile.
  showStep(selectedNeed() ? 2 : 1, false);
}
