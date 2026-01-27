import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Conditions générales de vente - MecaniDoc",
  description: "Conditions générales de vente de MecaniDoc.com pour les Particuliers.",
};

export default function ConditionsGeneralesVentePage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Conditions Générales de Vente de MecaniDoc.com pour les Particuliers
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Généralités</h2>
              <p>Les présentes conditions régissent les ventes de MecaniDoc.com. Société (SA), siège social et coordonnées : consultez la rubrique Contact.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. Description des Produits</h2>
              <p>MecaniDoc.com propose des pneus et services associés (montage, livraison). Les produits sont décrits au mieux de nos connaissances ; les photos et textes restent indicatifs.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Prix et TVA</h2>
              <p>Les prix sont indiqués en francs suisses (CHF), TVA comprise, sauf mention contraire. MecaniDoc.com se réserve le droit de modifier les prix ; le prix applicable est celui affiché au moment de la commande.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Commandes et Formation du Contrat</h2>
              <p>La commande constitue une offre d&apos;achat. Le contrat est formé à l&apos;acceptation de MecaniDoc.com (confirmation de commande). MecaniDoc.com peut refuser une commande en cas d&apos;indisponibilité, d&apos;erreur de prix ou de comportement suspect.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Droit de Rétractation</h2>
              <p>Conformément à la législation en vigueur, vous disposez d&apos;un délai de 14 jours pour exercer votre droit de rétractation pour les achats à distance, sous réserve des exceptions légales (pneus montés, produits personnalisés, etc.).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Clause de Réserve de Propriété</h2>
              <p>Les produits restent la propriété de MecaniDoc.com jusqu&apos;au paiement intégral du prix.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">7. Preuve</h2>
              <p>Les enregistrements informatiques de MecaniDoc.com font foi entre les parties pour les commandes, livraisons et facturations.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">8. Livraison</h2>
              <p><strong className="text-gray-900">Livraison standard (5 jours ouvrés) :</strong> 1 pneu = 10 CHF ; à partir de 2 pneus = gratuite. <strong className="text-gray-900">Livraison rapide (24–72 h) :</strong> 1 à 3 pneus = 19,90 CHF ; 4 pneus et plus = 29,90 CHF. Les délais sont donnés à titre indicatif ; un retard n&apos;ouvre pas droit à annulation ou indemnité, sauf accord écrit.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">9. Garantie Commerciale</h2>
              <p>Nos garanties commerciales (assurance crevaison, garantie MecaniDoc, etc.) sont détaillées sur le site. Elles s&apos;ajoutent à la garantie légale de conformité.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">10. Garantie Légale de Conformité</h2>
              <p>Conformément à la loi, vous bénéficiez de la garantie légale de conformité (défauts existant à la livraison). En cas de non-conformité, vous pouvez demander la réparation ou le remplacement du bien ; si impossible ou disproportionné, la réduction du prix ou la résolution de la vente.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">11. Limitation de Responsabilité</h2>
              <p>La responsabilité de MecaniDoc.com est limitée au montant de la commande, sauf faute lourde ou dommages inexcusables. Nous ne sommes pas responsables des dommages indirects (perte de profit, préjudice commercial, etc.).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">12. Droit Applicable et Litiges</h2>
              <p>Le droit suisse est applicable. Les tribunaux du siège de MecaniDoc.com sont compétents pour tout litige, sauf disposition impérative contraire.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">13. Propriété Intellectuelle</h2>
              <p>L&apos;ensemble du site (textes, images, logos, structure) est protégé par le droit d&apos;auteur et les marques. Toute reproduction ou exploitation non autorisée est interdite.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">14. Clause Salvatrice</h2>
              <p>Si une disposition des présentes CGV était jugée invalide, les autres resteraient en vigueur.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">15. Contact</h2>
              <p><strong className="text-gray-900">MecaniDoc.com</strong> — Adresse complète, email et téléphone : voir la rubrique Contact sur le site.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
