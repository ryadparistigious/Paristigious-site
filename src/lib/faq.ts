import type { FaqItem } from '../components/Faq.astro';

/** FAQ générale de l'accueil. Les FAQ spécifiques vivent dans chaque service. */
export const generalFaq: FaqItem[] = [
  {
    q: 'Combien de temps à l’avance faut-il réserver ?',
    a: 'Le plus tôt possible, en particulier pour une mise à disposition, un mariage ou un événement. Aucun créneau n’est garanti tant qu’il n’a pas été confirmé par écrit.',
  },
  {
    q: 'Puis-je réserver le jour même ?',
    a: 'C’est souvent possible. Nous vérifions les disponibilités selon l’horaire, le lieu et la nature de la mission, puis nous vous répondons rapidement.',
  },
  {
    q: 'Comment se déroule un transfert aéroport ?',
    a: 'Vous nous communiquez le vol, le terminal, le nombre de passagers et de bagages. Après confirmation, le point de prise en charge exact vous est indiqué avant la prestation.',
  },
  {
    q: 'Que se passe-t-il si mon vol est retardé ?',
    a: 'Le vol est suivi dès lors que son numéro nous est fourni, et la prise en charge est décalée en conséquence. Les conditions d’attente sont précisées dans la proposition.',
  },
  {
    q: 'Quels véhicules proposez-vous et pour combien de passagers ?',
    a: 'Berline Business, Berline First ou van Premium, ou équivalent. Le modèle et la capacité sont confirmés en fonction du nombre de passagers et du volume de bagages.',
  },
  {
    q: 'Puis-je faire évoluer mon programme en cours de mise à disposition ?',
    a: 'Oui, dans la limite des contraintes opérationnelles et de l’amplitude réservée. Une modification importante peut influer sur la durée ou sur le tarif.',
  },
  {
    q: 'Coordonnez-vous les groupes, mariages et événements ?',
    a: 'Oui. Accueils simultanés, transferts multiples, navettes et mises à disposition sont étudiés dans un même dispositif, avec un interlocuteur unique.',
  },
  {
    q: 'Travaillez-vous avec les hôtels, agences et entreprises ?',
    a: 'Oui. Paristigious Partners est dédié aux professionnels, avec interlocuteur dédié, conditions cadrées et facturation centralisée.',
  },
  {
    q: 'Intervenez-vous à Monaco, en longue distance et à l’international ?',
    a: 'Monaco et les trajets longue distance sont couramment étudiés. Les besoins internationaux sont évalués individuellement selon la destination et le calendrier.',
  },
  {
    q: 'Quelles sont les conditions de paiement et d’annulation ?',
    a: 'Elles figurent systématiquement dans la proposition envoyée avant confirmation. <strong>[Conditions commerciales à confirmer avant mise en ligne.]</strong>',
  },
  {
    q: 'Mes déplacements restent-ils confidentiels ?',
    a: 'Oui. Les informations relatives aux clients, aux adresses et aux déplacements ne sont ni communiquées ni utilisées à d’autres fins que l’exécution de la prestation.',
  },
  {
    q: 'Comment demander un devis ?',
    a: 'Par le formulaire de demande de devis, qui ne pose que les questions utiles à votre type de prestation, ou par e-mail en précisant date, horaires, lieux et passagers.',
  },
];
