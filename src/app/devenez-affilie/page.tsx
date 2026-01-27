import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Devenez affilié - MecaniDoc",
  description: "Devenez partenaire Mecanidoc.com : jusqu'à 3% de rémunération.",
};

export default function DevenezAffiliePage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
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
              Des questions ?
            </h2>
            <p className="text-gray-700 mb-4">
              Rendez-vous sur notre page affiliés pour plus d&apos;informations et rejoignez-nous via les plateformes <strong className="text-gray-900">Awin</strong>, <strong className="text-gray-900">Tradedoubler</strong> ou <strong className="text-gray-900">Affilae</strong>.
            </p>
            <ul className="space-y-2">
              <li>
                <strong className="text-gray-900">Awin :</strong>{" "}
                <Link href="https://www.awin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Inscrivez-vous ici sur notre programme d&apos;affiliation Awin
                </Link>
              </li>
              <li>
                <strong className="text-gray-900">Tradedoubler :</strong>{" "}
                <Link href="https://www.tradedoubler.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Inscrivez-vous ici sur notre programme d&apos;affiliation Tradedoubler
                </Link>
              </li>
              <li>
                <strong className="text-gray-900">Affilae :</strong>{" "}
                <Link href="https://www.affilae.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Inscrivez-vous ici sur notre programme d&apos;affiliation Affilae
                </Link>
              </li>
            </ul>
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
                  Lorsqu&apos;un visiteur clique sur une offre Mecanidoc.com, il est redirigé vers la boutique en ligne. Vous percevez <strong className="text-gray-900">3% de commission</strong> sur tout achat effectué par les clients redirigés, calculée sur le montant net de la commande (hors TVA et frais de port).
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
