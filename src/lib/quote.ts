// `zod/mini` : même moteur, même sûreté de typage, API composable — et environ
// trois fois moins de code envoyé au navigateur que le point d'entrée complet.
// Le schéma reste isomorphe : le jour où un endpoint serveur est branché, il
// valide exactement les mêmes règles. (règles 12 et 37)
import * as z from 'zod/mini';

/**
 * Description des champs du devis — source unique.
 *
 * Le même objet sert à rendre le formulaire ET à construire le schéma Zod.
 * Il devient donc impossible d'afficher un champ qui n'est pas validé, ou de
 * valider un champ qui n'est plus affiché. (règles 11 et 12)
 */

export type FieldType = 'text' | 'address' | 'date' | 'time' | 'number' | 'select' | 'textarea';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Message affiché quand le champ obligatoire est vide — jamais « invalid input ». */
  requiredMessage?: string;
  placeholder?: string;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  autocomplete?: string;
  /** Détermine le clavier ouvert sur mobile. (règle 22) */
  inputmode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
  /** Le champ occupe toute la largeur de la grille. */
  wide?: boolean;
  /** Interdit les dates passées. (règle 14) */
  notPast?: boolean;
}

export const needSlugs = [
  'transfert',
  'disposition',
  'evenement',
  'mariage',
  'excursion',
  'business',
] as const;

export type NeedSlug = (typeof needSlugs)[number];

export interface NeedDefinition {
  slug: NeedSlug;
  label: string;
  hint: string;
  /** Contexte injecté dans le message WhatsApp depuis cette prestation. */
  whatsapp: string;
  fields: Field[];
}

const dateField = (label = 'Date', help?: string): Field => ({
  name: 'date',
  label,
  type: 'date',
  required: true,
  requiredMessage: 'Choisissez une date.',
  notPast: true,
  autocomplete: 'off',
  help,
});

const passengers: Field = {
  name: 'passengers',
  label: 'Nombre de passagers',
  type: 'number',
  required: true,
  requiredMessage: 'Indiquez le nombre de passagers.',
  min: 1,
  max: 60,
  inputmode: 'numeric',
};

export const needs: NeedDefinition[] = [
  {
    slug: 'transfert',
    label: 'Transfert',
    hint: 'Aéroport, gare, adresse à adresse',
    whatsapp: 'organiser un transfert',
    fields: [
      {
        name: 'pickup',
        label: 'Lieu de prise en charge',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez le lieu de prise en charge.',
        placeholder: 'Ex. Roissy CDG, Terminal 2E',
      },
      {
        name: 'dropoff',
        label: 'Destination',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez la destination.',
        placeholder: 'Ex. 31 avenue George V, Paris 8e',
      },
      dateField(),
      {
        name: 'time',
        label: 'Heure',
        type: 'time',
        required: true,
        requiredMessage: 'Choisissez une heure.',
      },
      {
        name: 'flight',
        label: 'Numéro de vol ou de train',
        type: 'text',
        placeholder: 'Ex. AF1234',
        help: 'Facultatif — il nous permet de suivre l’horaire réel d’arrivée.',
      },
      passengers,
      {
        name: 'luggage',
        label: 'Bagages',
        type: 'number',
        min: 0,
        max: 40,
        inputmode: 'numeric',
        help: 'Facultatif — utile pour proposer la bonne catégorie de véhicule.',
      },
    ],
  },
  {
    slug: 'disposition',
    label: 'Chauffeur à disposition',
    hint: 'Quelques heures, une journée, un séjour',
    whatsapp: 'organiser une mise à disposition',
    fields: [
      {
        name: 'pickup',
        label: 'Lieu de départ',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez le lieu de départ.',
        placeholder: 'Ex. Hôtel, adresse privée, bureau',
      },
      dateField('Date de début'),
      {
        name: 'time',
        label: 'Heure de début',
        type: 'time',
        required: true,
        requiredMessage: 'Choisissez une heure de début.',
      },
      {
        name: 'duration',
        label: 'Durée souhaitée',
        type: 'select',
        required: true,
        requiredMessage: 'Choisissez une durée indicative.',
        options: [
          'Quelques heures (3 à 5 h)',
          'Demi-journée',
          'Journée complète',
          'Soirée',
          'Plusieurs jours',
          'À définir ensemble',
        ],
      },
      passengers,
      {
        name: 'programme',
        label: 'Grandes lignes du programme',
        type: 'textarea',
        wide: true,
        placeholder: 'Rendez-vous, quartiers, horaires approximatifs… même incomplet.',
        help: 'Facultatif — cela nous aide à calibrer l’amplitude horaire.',
      },
    ],
  },
  {
    slug: 'evenement',
    label: 'Événement',
    hint: 'Gala, congrès, délégation, groupe',
    whatsapp: 'organiser la mobilité d’un événement',
    fields: [
      {
        name: 'venue',
        label: 'Lieu de l’événement',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez le lieu de l’événement.',
        placeholder: 'Ex. Palais Brongniart, Paris',
      },
      dateField('Date de l’événement'),
      {
        name: 'schedule',
        label: 'Amplitude horaire',
        type: 'text',
        placeholder: 'Ex. arrivées 17h — retours 1h',
        help: 'Facultatif — même approximative, elle structure le dispositif.',
      },
      {
        name: 'guests',
        label: 'Nombre d’invités à transporter',
        type: 'number',
        required: true,
        requiredMessage: 'Indiquez un nombre d’invités, même approximatif.',
        min: 1,
        max: 2000,
        inputmode: 'numeric',
      },
      {
        name: 'vehicles',
        label: 'Nombre de véhicules envisagé',
        type: 'number',
        min: 1,
        max: 200,
        inputmode: 'numeric',
        help: 'Facultatif — nous pouvons le déterminer avec vous.',
      },
      {
        name: 'programme',
        label: 'Déroulé et contraintes',
        type: 'textarea',
        wide: true,
        placeholder: 'Points d’arrivée, niveaux de service, contacts sur place…',
      },
    ],
  },
  {
    slug: 'mariage',
    label: 'Mariage',
    hint: 'Cortège, mariés, navettes invités',
    whatsapp: 'organiser les transports d’un mariage',
    fields: [
      dateField('Date du mariage'),
      {
        name: 'ceremony',
        label: 'Lieu de la cérémonie',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez le lieu de la cérémonie.',
      },
      {
        name: 'reception',
        label: 'Lieu de la réception',
        type: 'address',
        placeholder: 'Si différent du lieu de cérémonie',
        help: 'Facultatif',
      },
      {
        name: 'guests',
        label: 'Invités à transporter',
        type: 'number',
        min: 0,
        max: 1000,
        inputmode: 'numeric',
        help: 'Facultatif — 0 si seuls les mariés sont concernés.',
      },
      {
        name: 'planner',
        label: 'Wedding planner',
        type: 'text',
        placeholder: 'Nom de votre planner, le cas échéant',
        help: 'Facultatif — nous nous coordonnons directement avec lui.',
      },
      {
        name: 'programme',
        label: 'Déroulé de la journée',
        type: 'textarea',
        wide: true,
        placeholder: 'Horaires de cérémonie, photos, réception, fin de soirée…',
      },
    ],
  },
  {
    slug: 'excursion',
    label: 'Excursion',
    hint: 'Journée privée, itinéraire sur mesure',
    whatsapp: 'organiser une excursion privée',
    fields: [
      {
        name: 'pickup',
        label: 'Lieu de prise en charge',
        type: 'address',
        required: true,
        requiredMessage: 'Indiquez le lieu de prise en charge.',
      },
      {
        name: 'destination',
        label: 'Destination ou thème',
        type: 'text',
        required: true,
        requiredMessage: 'Indiquez une destination, même approximative.',
        placeholder: 'Ex. Champagne, Versailles, Provence…',
      },
      dateField(),
      {
        name: 'time',
        label: 'Heure de départ',
        type: 'time',
        required: true,
        requiredMessage: 'Choisissez une heure de départ.',
      },
      passengers,
      {
        name: 'programme',
        label: 'Envies particulières',
        type: 'textarea',
        wide: true,
        placeholder: 'Visites, déjeuner, dégustation, rythme souhaité…',
      },
    ],
  },
  {
    slug: 'business',
    label: 'Business',
    hint: 'Roadshow, dirigeants, compte entreprise',
    whatsapp: 'mettre en place un compte professionnel',
    fields: [
      {
        name: 'company',
        label: 'Société',
        type: 'text',
        required: true,
        requiredMessage: 'Indiquez le nom de votre société.',
        autocomplete: 'organization',
      },
      {
        name: 'sector',
        label: 'Type de structure',
        type: 'select',
        required: true,
        requiredMessage: 'Choisissez le type de structure.',
        options: [
          'Entreprise',
          'Hôtel / Palace',
          'Agence de voyage / DMC',
          'Wedding planner',
          'Agence événementielle',
          'Ambassade / Délégation',
          'Autre',
        ],
      },
      {
        name: 'volume',
        label: 'Volume estimé par mois',
        type: 'select',
        options: ['Moins de 5 trajets', '5 à 20 trajets', '20 à 50 trajets', 'Plus de 50 trajets', 'Je ne sais pas encore'],
        help: 'Facultatif',
      },
      dateField('Premier besoin identifié', 'Facultatif si vous ouvrez simplement un compte.'),
      {
        name: 'programme',
        label: 'Votre besoin',
        type: 'textarea',
        wide: true,
        placeholder: 'Activité, type de déplacements, exigences particulières…',
      },
    ],
  },
];

export const needBySlug = new Map(needs.map((n) => [n.slug, n]));

/* ═══════════════════════════════════════════════════════════
   Schéma partagé
   ═══════════════════════════════════════════════════════════ */

/** Aujourd'hui à minuit, pour refuser une date passée sans rejeter le jour même. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type AnySchema = z.ZodMiniType<unknown, unknown>;

function fieldSchema(field: Field): AnySchema {
  const missing = field.requiredMessage ?? `Renseignez « ${field.label} ».`;
  const min = field.min ?? 0;
  const max = field.max ?? 9999;

  if (field.type === 'number') {
    const number = z.coerce
      .number(`« ${field.label} » doit être un nombre.`)
      .check(
        z.int(`« ${field.label} » doit être un nombre entier.`),
        z.minimum(min, `${field.label} : le minimum est ${min}.`),
        z.maximum(max, `${field.label} : le maximum est ${max}.`),
      );
    // Un champ facultatif laissé vide arrive sous forme de chaîne vide :
    // il ne doit pas être traité comme « pas un nombre ».
    return field.required ? number : z.union([z.literal(''), number]);
  }

  if (field.type === 'date') {
    const notPast = z.refine<string>(
      (value) => !value || new Date(`${value}T00:00:00`) >= startOfToday(),
      'Cette date est déjà passée. Choisissez une date à venir.',
    );
    const date = field.notPast
      ? z.string().check(z.minLength(1, missing), notPast)
      : z.string().check(z.minLength(1, missing));
    return field.required ? date : z.optional(date);
  }

  return field.required ? z.string().check(z.minLength(1, missing)) : z.optional(z.string());
}

/** Schéma des coordonnées — commun à toutes les prestations. */
export const contactSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'Indiquez votre nom complet.')),
  email: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'Indiquez votre adresse e-mail.'),
      z.regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Cette adresse e-mail semble incomplète.'),
    ),
  phone: z.string().check(z.trim(), z.minLength(6, 'Indiquez un numéro où vous joindre.')),
  message: z.optional(z.string()),
  consent: z
    .string()
    .check(
      z.refine(
        (v: string) => v === 'on' || v === 'true',
        'Merci d’accepter le traitement de votre demande.',
      ),
    ),
});

/** Schéma complet pour une prestation donnée. */
export function schemaForNeed(slug: NeedSlug) {
  const need = needBySlug.get(slug);
  if (!need) throw new Error(`Prestation inconnue : ${slug}`);

  const shape: Record<string, AnySchema> = {
    need: z.literal(slug, 'Choisissez le type de prestation souhaité.'),
  };
  for (const field of need.fields) shape[field.name] = fieldSchema(field);

  return z.extend(contactSchema, shape);
}

/** Valide un FormData et renvoie les erreurs par nom de champ. */
export function validateQuote(
  data: Record<string, string>,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const slug = data.need as NeedSlug;
  if (!needBySlug.has(slug)) {
    return { ok: false, errors: { need: 'Choisissez le type de prestation souhaité.' } };
  }

  const result = schemaForNeed(slug).safeParse(data);
  if (result.success) return { ok: true, value: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
