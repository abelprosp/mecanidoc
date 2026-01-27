import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Qui sommes-nous ? - MecaniDoc",
  description: "MecaniDoc.com : votre partenaire privilégié pour l'achat de pneus en ligne.",
};

export default function QuiSommesNousPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Qui sommes-nous ?
          </h1>

          <p className="text-gray-700 mb-6 leading-relaxed">
            <strong className="text-gray-900">MecaniDoc.com</strong> est votre partenaire privilégié pour l&apos;achat de pneus en ligne. Une équipe passionnée, à taille humaine, dédiée à une expérience d&apos;achat fluide, agréable et avantageuse. Nous misons sur des <strong className="text-gray-900">prix compétitifs</strong>, un <strong className="text-gray-900">service irréprochable</strong> et une plateforme pensée pour trouver facilement les pneus adaptés à votre véhicule aux meilleurs tarifs.
          </p>

          <p className="text-gray-700 mb-6 leading-relaxed">
            Nous proposons un large choix de produits pour tous les types de véhicules : voitures, motos, quads, utilitaires… La <strong className="text-gray-900">qualité</strong> et l&apos;<strong className="text-gray-900">accessibilité</strong> sont au cœur de notre offre.
          </p>

          <p className="text-gray-700 mb-6 leading-relaxed">
            Notre approche repose sur l&apos;écoute client, des conseils personnalisés et un support réactif. Chez MecaniDoc.com, la satisfaction de nos clients est une priorité : nous nous engageons à vous offrir les <strong className="text-gray-900">meilleurs produits</strong>, les <strong className="text-gray-900">meilleurs prix</strong> et une <strong className="text-gray-900">logistique fiable</strong> pour une livraison rapide et sécurisée.
          </p>

          <div className="bg-gray-100 rounded-xl p-6 md:p-8 mt-8">
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-center gap-2">✓ Des prix compétitifs toute l&apos;année</li>
              <li className="flex items-center gap-2">✓ Un large choix de pneus pour tous les véhicules</li>
              <li className="flex items-center gap-2">✓ Une livraison rapide et flexible</li>
              <li className="flex items-center gap-2">✓ Des options de montage simplifiées chez nos partenaires</li>
              <li className="flex items-center gap-2">✓ Un service client à votre écoute</li>
            </ul>
            <p className="text-gray-700">
              Faites le choix de la tranquillité et découvrez la <strong className="text-gray-900">différence MecaniDoc</strong>. Parce que votre sécurité et votre satisfaction sont notre priorité, nous sommes là pour vous équiper en toute confiance et vous accompagner sur la route de la performance.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
