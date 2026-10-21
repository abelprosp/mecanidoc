import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AffiliateInterestForm from "@/components/AffiliateInterestForm";

export const metadata = {
  title: "Devenez affilié - MecaniDoc",
  description: "Devenez partenaire Mecanidoc.com : jusqu'à 3% de rémunération.",
};

export default function DevenezAffiliePage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1 layout-container py-4 md:py-8 pb-12 md:pb-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full p-6 md:p-12">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Devenez partenaire Mecanidoc.com{" "}
            <span className="text-blue-600 uppercase">Jusqu&apos;à 3% de rémunération !</span>
          </h1>

          <p className="text-gray-700 mb-8 leading-relaxed">
            Optimisez les revenus de votre site en touchant jusqu&apos;à <strong className="text-gray-900">3% de commission</strong> sur les ventes réalisées via votre site. Idéal pour les acteurs de l&apos;automobile, accessoires ou secteurs connexes.
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Animez votre site gratuitement
            </h2>
            <p className="text-gray-700 mb-4">
              Mecanidoc.com propose un large choix de pneus (été / hiver auto, 4x4, utilitaires, quad, moto, poids lourd, agricole) et des services exclusifs. Des outils simples et efficaces pour animer gratuitement votre site : visuels régulièrement mis à jour, opérations exclusives affiliés (codes promo), défis réguliers pour booster les ventes, et accès 24h/24 aux statistiques.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Associez-vous à une marque forte et prescriptrice
            </h2>
            <p className="text-gray-700">
              Devenir affilié, c&apos;est bénéficier de la notoriété de Mecanidoc.com, acteur majeur de la vente de pneus en ligne, et de son expertise pour augmenter vos revenus.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Candidater au programme
            </h2>
            <p className="text-gray-700 mb-4">
              Le programme d&apos;affiliation MecaniDoc n&apos;est pas encore ouvert en libre-service. Déposez votre intérêt : nous vous recontactons avec les conditions, le taux applicable et, le cas échéant, le lien d&apos;inscription officiel.
            </p>
            <AffiliateInterestForm />
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Comment ça marche ?
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Intégration du matériel publicitaire</h3>
                <p className="text-gray-700">
                  Mecanidoc.com met à votre disposition bannières, liens, champs de recherche de pneus (version white label) à intégrer facilement sur votre site ou dans vos newsletters pour maximiser vos commissions.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Génération de ventes</h3>
                <p className="text-gray-700">
                  Lorsqu&apos;un visiteur clique sur une offre Mecanidoc.com, il est redirigé vers la boutique en ligne. La commission (jusqu&apos;à 3&nbsp;% selon le contrat validé) est calculée sur le montant net de la commande hors TVA et frais de port.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Assurance de revenus</h3>
                <p className="text-gray-700">
                  Notre programme vous offre une rémunération stable et transparente, avec suivi des performances et paiements selon les conditions de chaque plateforme.
                </p>
              </div>
            </div>
          </section>

          <div className="bg-gray-100 rounded-xl p-6 md:p-8 mt-10">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">✓ Des prix compétitifs toute l&apos;année</li>
              <li className="flex items-center gap-2">✓ Un large choix de pneus pour tous les véhicules</li>
              <li className="flex items-center gap-2">✓ Une livraison rapide et flexible</li>
              <li className="flex items-center gap-2">✓ Des options de montage simplifiées chez nos partenaires</li>
              <li className="flex items-center gap-2">✓ Un service client à votre écoute</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Faites le choix de la tranquillité et découvrez la différence MecaniDoc. Parce que votre sécurité et votre satisfaction sont notre priorité, nous sommes là pour vous équiper en toute confiance et vous accompagner sur la route de la performance.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
