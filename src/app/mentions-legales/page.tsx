import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Mentions légales - MecaniDoc",
  description: "Mentions légales de MecaniDoc.com : éditeur, hébergement, propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Mentions légales
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Éditeur du site</h2>
              <p><strong className="text-gray-900">MecaniDoc.com</strong></p>
              <p>Société spécialisée dans la vente de pneus en ligne.</p>
              <p>Pour toute question concernant le site ou nos services, consultez la rubrique Contact.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. Directeur de publication</h2>
              <p>Le directeur de publication est le représentant légal de MecaniDoc.com.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Hébergement</h2>
              <p>Le site est hébergé par notre prestataire d&apos;hébergement. Pour toute précision, contactez-nous.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Propriété intellectuelle</h2>
              <p>Tous les éléments du site MecaniDoc.com (textes, images, logos, structure, graphismes) sont protégés par le droit d&apos;auteur et les marques. Toute reproduction ou exploitation non autorisée est interdite.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Données personnelles</h2>
              <p>Conformément à la loi « Informatique et Libertés » et au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression des données vous concernant. Consultez notre <a href="/politique-donnees-personnelles" className="text-blue-600 hover:underline">Politique de gestion des données personnelles</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Cookies</h2>
              <p>Le site utilise des cookies pour améliorer votre expérience. Vous pouvez gérer vos préférences via notre page <a href="/parametrez-les-cookies" className="text-blue-600 hover:underline">Paramétrez les cookies</a>.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
