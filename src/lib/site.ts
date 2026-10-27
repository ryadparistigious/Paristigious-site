/**
 * Source de vérité unique pour les coordonnées, la navigation et les
 * libellés partagés. Un seul endroit à modifier le jour où le téléphone
 * et le WhatsApp réels sont communiqués.
 */

export const site = {
  name: 'Paristigious',
  url: 'https://paristigious.com',
  tagline: 'Maison de mobilité privée',
  description:
    'Paristigious organise transferts, mises à disposition, événements et voyages privés avec chauffeur à Paris, en Île-de-France et sur la Côte d’Azur.',
  email: 'concierge@paristigious.com',
  emailPartners: 'partenaires@paristigious.com',
  /**
   * Téléphone / WhatsApp : non communiqués à ce jour.
   * Renseigner `phone` au format E.164 (ex. '+33612345678') active
   * automatiquement le bouton d'appel, le lien WhatsApp contextuel
   * et la deuxième action de la barre mobile. Aucun autre fichier à toucher.
   */
  phone: null as string | null,
  whatsapp: null as string | null,
  areaServed: ['Paris', 'Île-de-France', 'Côte d’Azur', 'Monaco'],
} as const;

/** Numéro affichable, ou mention explicite tant qu'il n'est pas confirmé. */
export function phoneDisplay(): string {
  if (!site.phone) return 'Communiqué à la confirmation';
  return site.phone.replace(/^\+33(\d)/, '0$1').replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * Lien WhatsApp contextuel : le message donne le contexte de la page
 * d'où part le visiteur, sans rédiger sa demande à sa place. (règle 18)
 */
export function whatsappHref(context?: string): string | null {
  const number = site.whatsapp ?? site.phone;
  if (!number) return null;
  const message = context
    ? `Bonjour Paristigious, je souhaite ${context}.`
    : 'Bonjour Paristigious, je souhaite organiser un déplacement.';
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

/** Sous-menu Services — alimente le méga-menu desktop et le menu mobile. */
export const servicesNav: NavItem[] = [
  { label: 'Transferts & voyages', href: '/services/transferts', description: 'Aéroports, gares, longue distance' },
  { label: 'Chauffeur à disposition', href: '/services/mise-a-disposition', description: 'À l’heure, à la journée, en séjour' },
  { label: 'Événements & VIP', href: '/services/evenements', description: 'Galas, congrès, délégations' },
  { label: 'Mariages', href: '/services/mariage', description: 'Cortège, mariés, navettes invités' },
  { label: 'Excursions privées', href: '/services/excursions', description: 'Versailles, Champagne, Côte d’Azur' },
  { label: 'Business & hospitality', href: '/services/business', description: 'Roadshows, dirigeants, hôtels' },
];

export const mainNav: NavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Destinations', href: '/#destinations' },
  { label: 'Notre exigence', href: '/#exigence' },
  { label: 'Professionnels', href: '/partenaires' },
  { label: 'FAQ', href: '/#faq' },
];

/**
 * Types de prestation du formulaire de devis.
 * `slug` sert au préremplissage via ?besoin= depuis n'importe quel CTA. (règle 17)
 */
export const needs = [
  { slug: 'transfert', label: 'Transfert', hint: 'Aéroport, gare, adresse à adresse' },
  { slug: 'disposition', label: 'Chauffeur à disposition', hint: 'Quelques heures, une journée, un séjour' },
  { slug: 'evenement', label: 'Événement', hint: 'Gala, congrès, délégation, groupe' },
  { slug: 'mariage', label: 'Mariage', hint: 'Cortège, mariés, navettes invités' },
  { slug: 'excursion', label: 'Excursion', hint: 'Journée privée, itinéraire sur mesure' },
  { slug: 'business', label: 'Business', hint: 'Roadshow, dirigeants, comptes entreprise' },
] as const;

export type NeedSlug = (typeof needs)[number]['slug'];
