/**
 * Jeu de lieux fréquents, embarqué avec la page (~2 ko).
 *
 * Il couvre ce que les visiteurs tapent réellement en premier : aéroports,
 * gares, palaces et destinations de la Côte d'Azur. Taper « CDG » propose
 * immédiatement « Paris-Charles de Gaulle » sans aucun appel réseau.
 *
 * Un fournisseur géographique complet (Google Places, Mapbox, HERE…) pourra
 * s'ajouter par-dessus via l'adaptateur documenté dans
 * `src/scripts/address-autocomplete.ts`. Aucune clé n'est inventée ici.
 */

export interface Place {
  label: string;
  /** Précision affichée en gris sous le libellé. */
  detail: string;
  /** Termes alternatifs pris en compte par la recherche. */
  alias?: string[];
}

export const places: Place[] = [
  // ── Aéroports ───────────────────────────────────────────
  { label: 'Paris-Charles de Gaulle', detail: 'Aéroport · Roissy', alias: ['CDG', 'Roissy', 'Charles de Gaulle'] },
  { label: 'Paris-Orly', detail: 'Aéroport · Orly', alias: ['ORY', 'Orly'] },
  { label: 'Paris-Le Bourget', detail: 'Aviation d’affaires', alias: ['LBG', 'Bourget'] },
  { label: 'Beauvais-Tillé', detail: 'Aéroport · Oise', alias: ['BVA', 'Beauvais'] },
  { label: 'Nice Côte d’Azur', detail: 'Aéroport · Nice', alias: ['NCE', 'Nice aeroport'] },
  { label: 'Cannes-Mandelieu', detail: 'Aviation d’affaires', alias: ['CEQ'] },
  { label: 'Héliport de Monaco', detail: 'Fontvieille', alias: ['MCM', 'helicoptere Monaco'] },

  // ── Gares ───────────────────────────────────────────────
  { label: 'Gare du Nord', detail: 'Paris 10e', alias: ['Eurostar', 'Thalys'] },
  { label: 'Gare de Lyon', detail: 'Paris 12e' },
  { label: 'Gare Montparnasse', detail: 'Paris 15e' },
  { label: 'Gare de l’Est', detail: 'Paris 10e' },
  { label: 'Gare Saint-Lazare', detail: 'Paris 8e' },
  { label: 'Gare d’Austerlitz', detail: 'Paris 13e' },
  { label: 'Gare de Nice-Ville', detail: 'Nice' },
  { label: 'Gare de Cannes', detail: 'Cannes' },
  { label: 'Gare de Monaco-Monte-Carlo', detail: 'Monaco' },

  // ── Adresses & lieux parisiens ──────────────────────────
  { label: 'Avenue George V', detail: 'Paris 8e', alias: ['George V'] },
  { label: 'Place Vendôme', detail: 'Paris 1er' },
  { label: 'Avenue Montaigne', detail: 'Paris 8e' },
  { label: 'Rue du Faubourg Saint-Honoré', detail: 'Paris 8e' },
  { label: 'Champs-Élysées', detail: 'Paris 8e' },
  { label: 'Tour Eiffel', detail: 'Paris 7e' },
  { label: 'Musée du Louvre', detail: 'Paris 1er' },
  { label: 'Opéra Garnier', detail: 'Paris 9e' },
  { label: 'Le Marais', detail: 'Paris 3e / 4e' },
  { label: 'Saint-Germain-des-Prés', detail: 'Paris 6e' },
  { label: 'La Défense', detail: 'Hauts-de-Seine', alias: ['Puteaux', 'Courbevoie'] },
  { label: 'Roland-Garros', detail: 'Paris 16e' },
  { label: 'Parc des Princes', detail: 'Paris 16e' },
  { label: 'Stade de France', detail: 'Saint-Denis' },
  { label: 'Paris Expo Porte de Versailles', detail: 'Paris 15e', alias: ['Porte de Versailles'] },
  { label: 'Palais des Congrès', detail: 'Paris 17e', alias: ['Porte Maillot'] },
  { label: 'Palais Brongniart', detail: 'Paris 2e' },
  { label: 'Carrousel du Louvre', detail: 'Paris 1er' },
  { label: 'Disneyland Paris', detail: 'Marne-la-Vallée', alias: ['Disney'] },
  { label: 'Château de Versailles', detail: 'Versailles' },
  { label: 'Château de Fontainebleau', detail: 'Fontainebleau' },
  { label: 'Château de Chantilly', detail: 'Chantilly' },

  // ── Côte d’Azur & Sud ───────────────────────────────────
  { label: 'Cannes — Croisette', detail: 'Cannes', alias: ['Croisette', 'Palais des Festivals'] },
  { label: 'Monaco — Monte-Carlo', detail: 'Principauté de Monaco', alias: ['Monte Carlo'] },
  { label: 'Saint-Tropez', detail: 'Var' },
  { label: 'Antibes — Juan-les-Pins', detail: 'Alpes-Maritimes', alias: ['Juan les Pins'] },
  { label: 'Saint-Jean-Cap-Ferrat', detail: 'Alpes-Maritimes', alias: ['Cap Ferrat'] },
  { label: 'Èze', detail: 'Alpes-Maritimes' },
  { label: 'Saint-Paul-de-Vence', detail: 'Alpes-Maritimes' },
  { label: 'Nice — Promenade des Anglais', detail: 'Nice', alias: ['Promenade des Anglais'] },
  { label: 'Port Hercule', detail: 'Monaco' },
  { label: 'Aix-en-Provence', detail: 'Bouches-du-Rhône' },
  { label: 'Marseille', detail: 'Bouches-du-Rhône' },
  { label: 'Avignon', detail: 'Vaucluse' },

  // ── Grandes destinations d’excursion ────────────────────
  { label: 'Reims — Champagne', detail: 'Marne', alias: ['Champagne', 'Epernay'] },
  { label: 'Vallée de la Loire', detail: 'Châteaux', alias: ['Loire', 'Chambord', 'Amboise'] },
  { label: 'Deauville', detail: 'Normandie' },
  { label: 'Honfleur', detail: 'Normandie' },
  { label: 'Giverny', detail: 'Normandie' },
  { label: 'Plages du Débarquement', detail: 'Normandie', alias: ['Omaha Beach', 'Normandie 1944'] },
  { label: 'Mont-Saint-Michel', detail: 'Manche' },
  { label: 'Bruxelles', detail: 'Belgique' },
  { label: 'Genève', detail: 'Suisse' },
  { label: 'Londres', detail: 'Royaume-Uni' },
];
