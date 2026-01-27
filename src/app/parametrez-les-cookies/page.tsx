import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Paramétrez les cookies - MecaniDoc",
  description: "Gestion et paramétrage des cookies sur MecaniDoc.com.",
};

export default function ParametrezLesCookiesPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Paramétrez les cookies
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
              <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d&apos;un site web. Il permet de mémoriser des informations relatives à votre navigation (langue, panier, préférences, etc.) et d&apos;améliorer votre expérience.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. Types de cookies utilisés</h2>
              <p>MecaniDoc.com utilise différents types de cookies :</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
                <li><strong className="text-gray-900">Cookies techniques</strong> : nécessaires au fonctionnement du site (session, panier, authentification). Ils ne peuvent pas être désactivés sans perdre certaines fonctionnalités.</li>
                <li><strong className="text-gray-900">Cookies analytiques</strong> : permettent d&apos;analyser l&apos;utilisation du site (pages vues, durée de visite) pour en améliorer le contenu et l&apos;ergonomie.</li>
                <li><strong className="text-gray-900">Cookies publicitaires</strong> : utilisés pour personnaliser les publicités et mesurer l&apos;efficacité des campagnes. Ils ne sont déposés qu&apos;avec votre consentement.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">3. Gestion des cookies</h2>
              <p>Vous pouvez accepter ou refuser les cookies (hors cookies techniques essentiels) via les paramètres de votre navigateur. La plupart des navigateurs permettent de :</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
                <li>Voir les cookies stockés et les supprimer individuellement ou en masse.</li>
                <li>Bloquer les cookies tiers ou tous les cookies.</li>
                <li>Bloquer les cookies de certains sites.</li>
              </ul>
              <p className="mt-4">Attention : le refus de certains cookies peut limiter l&apos;accès à certaines fonctionnalités du site (ex. mémorisation du panier, préférences de recherche).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">4. Cookies tiers</h2>
              <p>Certains cookies sont déposés par des services tiers (analyse d&apos;audience, publicité, réseaux sociaux). Leur utilisation et leur durée sont régies par les politiques de confidentialité de ces tiers. Nous vous invitons à les consulter.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">5. Consentement et évolution</h2>
              <p>Lors de votre première visite, nous vous demandons votre consentement pour les cookies non essentiels. Vous pouvez à tout moment modifier vos préférences via cette page ou les paramètres de votre navigateur. Nous nous réservons le droit d&apos;adapter la présente politique en fonction des évolutions réglementaires ou techniques.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">6. Contact</h2>
              <p>Pour toute question relative aux cookies : <a href="mailto:contact@mecanidoc.com" className="text-blue-600 hover:underline">contact@mecanidoc.com</a>.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
