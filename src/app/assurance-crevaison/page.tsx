import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Assurance crevaison - MecaniDoc",
  description: "Pour seulement 5,50 € par pneu, bénéficiez d'une couverture complète contre les crevaisons et les hernies.",
};

export default function AssuranceCrevaisonPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-auto md:container md:px-4 mt-4 md:mt-8 mb-12 p-6 md:p-12 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Assurance Crevaison Mecanidoc
          </h1>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            Pour seulement <strong className="text-gray-900">5,50 € par pneu</strong>, bénéficiez d&apos;une couverture complète contre les crevaisons et les hernies dues à un choc pendant la première année.
          </p>

          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Remboursement total le premier mois :</strong>
                <span className="text-gray-700"> Lors du premier mois suivant l&apos;achat, 100% de la valeur du nouveau pneu est remboursée.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Garantie pneu :</strong>
                <span className="text-gray-700"> Protégez vos achats contre les crevaisons.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Période de protection de 12 mois :</strong>
                <span className="text-gray-700"> Profitez d&apos;une garantie de protection pour une période de 12 mois.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Tranquillité pour un an :</strong>
                <span className="text-gray-700"> Un an de tranquillité pour vos pneus.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Protection pour toutes les marques de pneus :</strong>
                <span className="text-gray-700"> La garantie s&apos;applique à toutes les marques de pneus.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold shrink-0">•</span>
              <div>
                <strong className="text-gray-900">Applicabilité :</strong>
                <span className="text-gray-700"> La garantie couvre tous les pneus été, hiver, moto, quad et 4x4, utilisés uniquement sur route.</span>
              </div>
            </li>
          </ul>

          <p className="text-gray-700 mb-6">
            Veuillez consulter{" "}
            <Link href="/page/garantie-mecanidoc" className="text-blue-600 hover:underline font-medium">
              ici
            </Link>{" "}
            les conditions d&apos;application de la garantie pneus.
          </p>

          <p className="text-lg font-semibold text-gray-900">
            Optez pour l&apos;assurance crevaison MecaniDoc et roulez l&apos;esprit tranquille !
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
