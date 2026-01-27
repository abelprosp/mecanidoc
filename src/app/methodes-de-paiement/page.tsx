import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Méthodes de paiement - MecaniDoc",
  description: "Méthodes de paiement disponibles chez MecaniDoc : virement, carte bancaire, PayPal, Apple Pay, Google Pay, Sofort, paiement en 4 fois.",
};

export default function MethodesDePaiementPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 uppercase tracking-tight">
            Méthodes de paiement disponibles chez MecaniDoc
          </h1>

          <p className="text-gray-700 mb-6 leading-relaxed">
            Les paiements doivent être validés par les services de MecaniDoc. Le paiement à la livraison n&apos;est pas accepté.
          </p>

          <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Assistance client</h2>
            <p className="text-gray-700 text-sm md:text-base">
              Notre équipe de conseillers est disponible du lundi au vendredi, de 8h00 à 19h00.
            </p>
            <p className="text-gray-700 text-sm md:text-base mt-1">
              Contact : <a href="mailto:contact@mecanidoc.com" className="text-blue-600 hover:underline font-medium">contact@mecanidoc.com</a>
            </p>
          </section>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement par virement bancaire</h2>
              <p className="mb-3">Procédure en 4 étapes :</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Sélectionnez l&apos;option « Paiement par virement » lors du checkout.</li>
                <li>Vous recevrez par email les coordonnées bancaires et un numéro de référence unique.</li>
                <li>Effectuez le virement en indiquant obligatoirement la référence fournie.</li>
                <li>Le virement doit être reçu sous 3 jours ouvrés, faute de quoi la commande sera annulée.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement via Sofort</h2>
              <p className="mb-3">Sofort est un moyen de paiement en ligne sécurisé et rapide, directement depuis votre compte bancaire. Étapes :</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Sélectionnez « Sofort » comme mode de paiement.</li>
                <li>Vous êtes redirigé vers la plateforme Sofort.</li>
                <li>Choisissez votre pays et votre banque.</li>
                <li>Connectez-vous à votre espace bancaire.</li>
                <li>Validez le paiement (ex. par SMS selon votre banque).</li>
                <li>Vous êtes redirigé vers MecaniDoc avec la confirmation de paiement.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement par carte bancaire</h2>
              <p className="mb-2">Nous acceptons les cartes suivantes : <strong className="text-gray-900">Carte Bleue</strong>, <strong className="text-gray-900">Visa</strong>, <strong className="text-gray-900">MasterCard</strong> et <strong className="text-gray-900">American Express</strong>.</p>
              <p className="text-gray-600 text-sm">Pour les paiements par <strong className="text-gray-900">Maestro</strong>, vérifiez que le SecureCode est activé auprès de votre banque.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement via PayPal</h2>
              <p>PayPal vous permet de régler vos achats de façon sécurisée, rapide et fiable. Possibilité de paiement en plusieurs fois selon votre compte PayPal.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement par Apple Pay</h2>
              <p>Payez de manière sécurisée et simple avec vos appareils Apple (Mac, iPhone, iPad) grâce à l&apos;authentification biométrique.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement par Google Pay</h2>
              <p>Comme Apple Pay, Google Pay permet des paiements sécurisés et simples sur appareils Android ou Chromebook, avec authentification biométrique et technologie NFC.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3 uppercase">Paiement en 4 fois par carte bancaire</h2>
              <p className="mb-2">Proposé via <strong className="text-gray-900">Cofidis</strong>, avec une <strong className="text-gray-900">taxe de 2,2 %</strong> sur le montant total de la commande.</p>
              <p className="text-gray-600 text-sm">Valable pour les commandes entre <strong className="text-gray-900">100 € et 3 000 €</strong>.</p>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Pour plus d&apos;informations, consultez <a href="https://www.mecanidoc.com" className="text-blue-600 hover:underline">www.mecanidoc.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
