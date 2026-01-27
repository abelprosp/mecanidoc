import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Politique de gestion des données personnelles - MecaniDoc",
  description: "Politique de gestion des données personnelles de MecaniDoc.com. RGPD, droits des utilisateurs.",
};

export default function PolitiqueDonneesPersonnellesPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Politique de gestion des données personnelles de Mecanidoc
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Présentation</h2>
              <p>Mecanidoc (opéré par Auto Invest) propose la vente de pneus et services associés. La collecte et le traitement des données personnelles sont effectués dans le respect des réglementations en vigueur (RGPD, loi Informatique et Libertés).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Données personnelles collectées</h2>
              <p>Les données sont collectées lors de la création de compte, du passage de commande et, le cas échéant, par email. Il peut s&apos;agir notamment du nom, prénom, adresse, téléphone, email et informations de paiement.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Nos traitements de données personnelles</h2>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li><strong className="text-gray-900">Création de compte / passage de commande</strong> : nom, adresse, téléphone, email, informations de paiement.</li>
                <li><strong className="text-gray-900">Inscription à la newsletter</strong> : adresse email pour l&apos;envoi d&apos;offres promotionnelles.</li>
                <li><strong className="text-gray-900">Gestion des droits RGPD</strong> : accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement.</li>
                <li><strong className="text-gray-900">Prospection</strong> : envoi d&apos;offres promotionnelles et publicités ciblées (avec votre consentement).</li>
                <li><strong className="text-gray-900">Gestion de la garantie commerciale</strong> : suivi des réclamations et remplacements.</li>
                <li><strong className="text-gray-900">Gestion des avis publiés sur le site</strong> : modération et affichage des avis clients.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Droits des personnes sur leurs données personnelles</h2>
              <p>Vous pouvez exercer vos droits via notre page dédiée, par email à <a href="mailto:contact@mecanidoc.com" className="text-blue-600 hover:underline">contact@mecanidoc.com</a>, ou par courrier à l&apos;adresse d&apos;Auto Invest en France.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Détail de vos droits</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-gray-900">Droit d&apos;accès</strong> : obtenir une copie de vos données.</li>
                <li><strong className="text-gray-900">Droit de rectification</strong> : faire corriger des données inexactes.</li>
                <li><strong className="text-gray-900">Droit à l&apos;effacement</strong> : demander la suppression de vos données.</li>
                <li><strong className="text-gray-900">Droit à la limitation du traitement</strong> : restreindre l&apos;utilisation de vos données.</li>
                <li><strong className="text-gray-900">Droit à la portabilité</strong> : recevoir vos données dans un format structuré.</li>
                <li><strong className="text-gray-900">Droit d&apos;opposition</strong> : vous opposer à un traitement (notamment prospection).</li>
                <li><strong className="text-gray-900">Droit de retirer son consentement</strong> : à tout moment, pour les traitements fondés sur le consentement.</li>
                <li><strong className="text-gray-900">Droit de réclamation</strong> : saisir la CNIL en cas de litige.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Destinataires des données personnelles</h2>
              <p>Le responsable du traitement est Auto Invest. Les données peuvent être communiquées aux personnels habilités, aux prestataires (informatique, paiement, logistique, marketing) et, avec votre consentement préalable, aux partenaires commerciaux. Elles peuvent également être transmises aux autorités judiciaires ou administratives lorsque la loi l&apos;exige.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Conservation des données</h2>
              <p>Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées (gestion des commandes, compte client, prospection, etc.), dans le respect des durées légales.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">Contact</h2>
              <p>Pour toute question ou exercice de vos droits : <a href="mailto:contact@mecanidoc.com" className="text-blue-600 hover:underline">contact@mecanidoc.com</a>.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
