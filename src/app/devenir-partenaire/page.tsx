import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Wrench, Users, TrendingUp, MapPin } from "lucide-react";

export const metadata = {
  title: "Devenir garage partenaire - MecaniDoc",
  description:
    "Rejoignez le réseau de garages partenaires MecaniDoc : montage de pneus, nouveaux clients, outils simples.",
};

export default function DevenirPartenairePage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1] flex flex-col">
      <Header />
      <div className="flex-1 layout-container py-4 md:py-8 pb-12 md:pb-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full p-6 md:p-12">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Devenir <span className="text-[#0066CC]">garage partenaire</span>
          </h1>

          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
            Proposez le montage des pneus commandés sur MecaniDoc et développez votre activité en accueillant de
            nouveaux clients près de chez vous.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <div className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <Users className="text-[#0066CC] shrink-0" size={28} />
              <div>
                <h2 className="font-bold text-gray-900 mb-1">Nouveaux clients</h2>
                <p className="text-sm text-gray-600">Des conducteurs vous choisissent pour la pose et le service.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <Wrench className="text-[#0066CC] shrink-0" size={28} />
              <div>
                <h2 className="font-bold text-gray-900 mb-1">Montage structuré</h2>
                <p className="text-sm text-gray-600">Flux clair entre commande en ligne et rendez-vous atelier.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <MapPin className="text-[#0066CC] shrink-0" size={28} />
              <div>
                <h2 className="font-bold text-gray-900 mb-1">Visibilité locale</h2>
                <p className="text-sm text-gray-600">Votre garage intégré à notre réseau de points de montage.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <TrendingUp className="text-[#0066CC] shrink-0" size={28} />
              <div>
                <h2 className="font-bold text-gray-900 mb-1">Développez l&apos;atelier</h2>
                <p className="text-sm text-gray-600">Complétez votre offre avec la vente de pneus en ligne.</p>
              </div>
            </div>
          </div>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Comment candidater ?</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>Créez votre compte et complétez le formulaire d&apos;inscription garage.</li>
              <li>Notre équipe étudie votre dossier (localisation, équipements, SIRET).</li>
              <li>Après validation, vous accédez à votre espace partenaire.</li>
            </ol>
          </section>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-6 rounded-xl bg-[#0066CC]/5 border border-[#0066CC]/20">
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">Prêt à nous rejoindre ?</p>
              <p className="text-sm text-gray-600">Le formulaire prend quelques minutes. Un compte vous sera créé après validation.</p>
            </div>
            <Link
              href="/auth/register/garage"
              className="inline-flex items-center justify-center bg-[#0066CC] hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Inscription garage partenaire
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Vous souhaitez un partenariat affiliation (site web, commission) ? Consultez{" "}
            <Link href="/devenez-affilie" className="text-[#0066CC] hover:underline font-medium">
              Devenir affilié
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
