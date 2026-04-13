import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Besoin d'aide - MecaniDoc",
  description: "Centre d'aide MecaniDoc : commandes, livraison, contact.",
};

export default function BesoinAidePage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1 layout-container py-4 md:py-8 pb-12 md:pb-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full p-6 md:p-12">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Besoin d&apos;aide
          </h1>
          <p className="text-gray-600 text-sm md:text-base mb-8">
            Nous sommes là pour vous accompagner sur vos commandes, la livraison et l&apos;installation.
          </p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm md:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Nous contacter</h2>
              <p>
                Utilisez le bouton de chat en bas à droite sur le site pour échanger avec notre équipe.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Commande et paiement</h2>
              <p>
                Après validation du panier, vous êtes redirigé vers un paiement sécurisé. En cas de problème,
                vérifiez vos informations ou contactez-nous via le chat.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Liens utiles</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <Link href="/mentions-legales" className="text-[#1a1a1a] underline underline-offset-2">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-[#1a1a1a] underline underline-offset-2">
                    Retour à l&apos;accueil
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
