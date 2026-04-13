import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Conditions générales — Assurance crevaison pneus | MecaniDoc",
  description:
    "Conditions générales de vente pour l'assurance crevaison sur les pneus MecaniDoc : couverture, exclusions et démarches.",
};

export default function GarantiePneusPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1 layout-container py-6 md:py-10">
        <article className="w-full rounded-2xl bg-white shadow-sm border border-gray-100 px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 text-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">
              Assurance crevaison
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
              Conditions générales de vente pour l&apos;assurance crevaison sur les pneus MecaniDoc
            </h1>
            <p className="text-base text-gray-600 leading-relaxed mb-10 border-b border-gray-100 pb-8">
              Le présent document définit les modalités de la garantie assurance crevaison proposée par MecaniDoc lors de
              l&apos;achat de pneus éligibles. Il complète les{" "}
              <Link href="/conditions-generales-vente" className="text-blue-600 hover:underline font-medium">
                conditions générales de vente
              </Link>{" "}
              du site.
            </p>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Objet de la garantie</h2>
              <p className="text-[15px] md:text-base leading-relaxed mb-4">
                La présente garantie couvre les pneus achetés sur MecaniDoc et pour lesquels l&apos;option assurance
                crevaison a été souscrite, lorsqu&apos;ils sont montés sur des{" "}
                <strong className="text-gray-900">véhicules privés</strong> dont le poids total autorisé en charge
                n&apos;excède pas <strong className="text-gray-900">7,5 tonnes</strong>, dans les limites décrites
                ci-dessous.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Bénéficiaires</h2>
              <p className="text-[15px] md:text-base leading-relaxed">
                Seule la <strong className="text-gray-900">personne physique ou morale</strong> désignée sur la facture
                d&apos;achat (ou le titulaire du compte client ayant passé la commande) peut bénéficier de la garantie,
                de façon non cessible.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Champ d&apos;application, durée et étendue</h2>
              <ul className="list-disc pl-5 space-y-3 text-[15px] md:text-base leading-relaxed marker:text-gray-400">
                <li>
                  La garantie s&apos;applique dans une <strong className="text-gray-900">zone géographique Europe</strong>{" "}
                  (détail des pays sur demande ou selon conditions communiquées au moment de la souscription).
                </li>
                <li>
                  Elle prend effet à compter de la <strong className="text-gray-900">date d&apos;achat</strong> figurant
                  sur la facture, pour une durée de <strong className="text-gray-900">12 mois</strong>.
                </li>
                <li>
                  Une <strong className="text-gray-900">franchise</strong> peut s&apos;appliquer selon la période
                  écoulée depuis l&apos;achat (ex. : 0&nbsp;% le premier mois, 25&nbsp;% des mois 2 à 6, 50&nbsp;% à
                  compter du 7<sup>e</sup> mois) — les pourcentages définitifs sont ceux indiqués sur votre confirmation
                  de commande et la fiche produit au moment de l&apos;achat.
                </li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Montant de la garantie</h2>
              <p className="text-[15px] md:text-base leading-relaxed">
                Le remboursement ou la prise en charge est{" "}
                <strong className="text-gray-900">plafonné à 300&nbsp;€ TTC par sinistre et par pneu</strong> (ou au
                montant facturé du pneu de remplacement si celui-ci est inférieur), sous réserve du respect des
                formalités et de l&apos;éligibilité du dommage.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Événements et prestations couverts</h2>
              <p className="text-[15px] md:text-base leading-relaxed mb-3">
                Sont notamment visés les dommages résultant d&apos;une{" "}
                <strong className="text-gray-900">crevaison ou d&apos;une hernie</strong> causée par un corps
                étranger (clou, éclat de verre, vis, etc.) rendant le pneu impropre à la circulation, dans le respect
                des conditions d&apos;usage du fabricant.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Événements et coûts non couverts</h2>
              <p className="text-[15px] md:text-base leading-relaxed mb-4">
                Sans exhaustivité, ne sont pas couverts notamment :
              </p>
              <ul className="list-disc pl-5 space-y-2.5 text-[15px] md:text-base leading-relaxed marker:text-gray-400">
                <li>Les catastrophes naturelles, incendies, vandalisme ou actes de guerre ;</li>
                <li>Le vol du véhicule ou des pneus ;</li>
                <li>
                  Les dommages lorsque la hauteur de sculpture du pneu est inférieure au minimum légal ou recommandé
                  (ex. : moins de 3&nbsp;mm) ;
                </li>
                <li>Les accidents de la circulation impliquant un choc global du véhicule ;</li>
                <li>
                  Les dégradations liées à une pression manifestement incorrecte, un mauvais montage ou une utilisation
                  non conforme (compétition, hors route si pneu route, surcharge, etc.) ;
                </li>
                <li>Les dommages esthétiques sans incidence sur l&apos;étanchéité ou la sécurité de roulement.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Obligations en cas de dommage</h2>
              <ol className="list-decimal pl-5 space-y-3 text-[15px] md:text-base leading-relaxed marker:text-gray-500">
                <li>
                  Acquérir un <strong className="text-gray-900">pneu de remplacement équivalent</strong> dans un délai
                  raisonnable (indicatif : sous 5 jours ouvrés après le sinistre, sauf délai différent porté à votre
                  connaissance) ;
                </li>
                <li>
                  Conserver la facture d&apos;achat du pneu d&apos;origine, la facture du pneu de remplacement et, le
                  cas échéant, les photos du dommage ;
                </li>
                <li>
                  Déclarer le sinistre via le{" "}
                  <strong className="text-gray-900">formulaire ou l&apos;espace client MecaniDoc</strong> dans un délai
                  indicatif de <strong className="text-gray-900">14 jours</strong> à compter de la constatation du
                  dommage, sauf mention contraire sur votre attestation ;
                </li>
                <li>
                  Ne pas rouler sur un pneu dégonflé de manière prolongée si cela aggrave le dommage (hors accès à une
                  zone sûre).
                </li>
              </ol>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-100 rounded-xl bg-gray-50 px-4 py-5 sm:px-6">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Pour une présentation commerciale synthétique (tarif 5,50&nbsp;€, avantages), voir la page{" "}
                <Link href="/assurance-crevaison" className="text-blue-600 hover:underline font-medium">
                  Assurance crevaison
                </Link>
                . Pour la garantie constructeur / MecaniDoc hors assurance crevaison :{" "}
                <Link href="/page/garantie-mecanidoc" className="text-blue-600 hover:underline font-medium">
                  Garantie MecaniDoc
                </Link>
                .
              </p>
              <p className="text-xs text-gray-500">
                En cas de divergence entre ce résumé et les conditions contractuelles acceptées lors de votre commande,
                les documents contractuels et la version archivée au moment de l&apos;achat prévalent.
              </p>
            </div>
      </article>
      </div>
      <Footer />
    </main>
  );
}
