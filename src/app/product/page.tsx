import React from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, ShoppingCart, Fuel, CloudRain, Volume2, ShieldCheck, Truck, Lock, Info, MapPin, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';

// Reusing TireLabel component logic
const TireLabel = ({ type, value, color }: { type: 'fuel' | 'wet' | 'noise', value: string | number, color: string }) => {
  const icons = {
    fuel: <Fuel size={14} className="text-gray-700" />,
    wet: <CloudRain size={14} className="text-gray-700" />,
    noise: <Volume2 size={14} className="text-gray-700" />
  };

  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-4 flex justify-center">{icons[type]}</div>
      {type === 'noise' ? (
        <div className="flex items-center bg-gray-800 text-white text-[10px] font-bold px-1 h-5 rounded-r-sm relative ml-4 w-12 justify-between">
           <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[8px] border-r-gray-800 border-b-[10px] border-b-transparent"></div>
           <span className="ml-1">{value}</span>
           <span className="text-[8px] scale-75">dB</span>
        </div>
      ) : (
        <div className={`flex items-center text-white text-[10px] font-bold px-2 h-5 rounded-r-sm relative ml-4 w-12 justify-center ${color}`}>
           <div className={`absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[8px] border-b-[10px] border-b-transparent`} style={{ borderRightColor: 'inherit' }}></div>
           {value}
        </div>
      )}
    </div>
  );
};

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        
        {/* Top Section: Product Main */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row mb-6">
          
          {/* Left Column: Image & Badges */}
          <div className="w-full md:w-5/12 p-8 border-r border-gray-100 flex flex-col items-center">
            
            {/* Main Image */}
            <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded-lg mb-6 relative">
              <img 
                src="https://placehold.co/400x400/f3f4f6/d1d5db?text=Tire+Image" 
                alt="PACE ALVENTI" 
                className="max-h-full object-contain mix-blend-multiply"
              />
              <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-sm">
                 <div className="flex flex-col gap-1">
                    <TireLabel type="fuel" value="C" color="bg-yellow-400 border-yellow-400" />
                    <TireLabel type="wet" value="B" color="bg-green-500 border-green-500" />
                    <TireLabel type="noise" value={72} color="bg-black" />
                 </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center mb-6">
              © Les images sont uniquement illustratives. Les prix affichés sont TTC et concernent uniquement les pneus, sans les jantes.
            </p>

            {/* Social Icons Placeholder */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-white text-xs">
                  {/* Icons would go here */}
                  <span className="bg-[#1877F2] w-full h-full rounded-full flex items-center justify-center">f</span>
                </div>
              ))}
            </div>

            {/* Trust Box */}
            <div className="bg-gray-50 rounded-lg p-4 w-full text-center border border-gray-100">
               <div className="flex justify-center text-yellow-400 gap-1 mb-2">
                 {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
               </div>
               <p className="text-xs font-bold text-gray-700 mb-1">Note moyenne : 4.8/5 sur 2138 avis vérifiés</p>
               <div className="flex flex-col gap-1 text-[10px] text-gray-500 mt-3">
                 <div className="flex items-center justify-center gap-1"><Check size={10} className="text-green-500"/> Client satisfait partout en France</div>
                 <div className="flex items-center justify-center gap-1"><Truck size={10} className="text-green-500"/> Livraison rapide & sécurisée</div>
                 <div className="flex items-center justify-center gap-1"><ShieldCheck size={10} className="text-green-500"/> Service de confiance</div>
               </div>
            </div>
          </div>

          {/* Right Column: Info & Action */}
          <div className="w-full md:w-7/12 p-8">
            <div className="flex justify-between items-start mb-2">
              <div className="flex text-yellow-400 gap-1 text-sm">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < 4 ? "currentColor" : i === 4 ? "url(#half)" : "none"} className={i===4 ? "text-yellow-400" : ""} />)}
                <span className="text-gray-400 ml-1 text-xs">4.6/5 (537 avis)</span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">PACE ALVENTI</h1>
            <p className="text-lg text-gray-600 mb-6">275/40 R19 101 Y</p>

            <div className="mb-6">
              <span className="text-xs text-gray-500 block mb-1">Depuis</span>
              <span className="text-4xl font-bold text-[#003399]">€76.88</span>
            </div>

            <div className="text-xs text-green-600 mb-6 font-medium">Availability: <span className="text-gray-600">10 in stock</span></div>

            <div className="flex items-center gap-4 mb-8">
               <div className="w-16">
                 <input type="number" defaultValue="1" className="w-full border border-gray-300 rounded px-2 py-2 text-center text-sm" />
               </div>
               <button className="flex-1 bg-[#0066CC] hover:bg-blue-700 text-white font-bold py-2 rounded text-sm transition-colors uppercase">
                 Add to cart
               </button>
               <button className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded text-sm transition-colors flex items-center gap-2">
                 Buy with G Pay
               </button>
            </div>

            {/* Garage Selection */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="text-gray-400" />
                <div>
                  <span className="font-bold text-gray-700 text-sm block">Montage en garage</span>
                  <span className="text-xs text-gray-500">2000 centres partenaires</span>
                </div>
              </div>
              <button className="bg-[#1877F2] text-white text-xs font-bold py-2 px-3 rounded hover:bg-blue-600">
                Sélectionner un Garage
              </button>
            </div>

            {/* Specifications */}
            <h3 className="text-sm font-bold text-gray-600 uppercase border-b border-gray-200 pb-2 mb-4">Spécifications complètes</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Largeur :</span>
                <span className="font-medium text-gray-800">275</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Hauteur :</span>
                <span className="font-medium text-gray-800">40</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Diamètre :</span>
                <span className="font-medium text-gray-800">19</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Charge :</span>
                <span className="font-medium text-gray-800">101</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Vitesse :</span>
                <span className="font-medium text-gray-800">Y</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Climat :</span>
                <span className="font-medium text-gray-800">Été</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Marque :</span>
                <span className="font-medium text-gray-800">PACE</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Catégorie :</span>
                <span className="font-medium text-gray-800">Auto</span>
              </div>
            </div>

          </div>
        </div>

        {/* Middle Section: Description & Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* About */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Info size={18} className="text-red-400" /> À propos de ce pneu
            </h3>
            <div className="text-gray-600 text-xs leading-relaxed space-y-4">
              <p>
                Le PACE ALVENTI 275/40 R19 101 Y Auto est un pneu de dernière génération conçu pour offrir sécurité, confort et hautes performances au quotidien. Développé par PACE, il garantit une tenue de route précise sur sol sec et mouillé, avec une excellente efficacité et une durabilité optimisée. Idéal pour ceux qui souhaitent acheter leurs pneus en ligne avec la fiabilité d'un grand fabricant.
              </p>
              <p className="font-bold">5 points forts :</p>
              <ul className="list-none space-y-1">
                <li>• ☀️ Performance été – sécurité en été.</li>
                <li>• 💧 Freinage court sur sol mouillé – classe B.</li>
                <li>• ⛽ Efficacité énergétique – classe C.</li>
                <li>• 🔇 Confort acoustique – 72.0 dB.</li>
                <li>• 📏 Longévité supérieure – composé de gomme optimisé et usure régulière.</li>
              </ul>
              <p className="italic text-gray-400 mt-4">Étiquette énergétique non disponible</p>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Star size={18} className="text-yellow-400" /> Avis des clients
            </h3>
            
            <div className="space-y-6">
              {[
                { name: "Alexandre L.", date: "12 août 2023", rating: 5, text: "Très bons pneus, excellente tenue de route même sous la pluie. Confort remarquable." },
                { name: "Marie C.", date: "20 juillet 2023", rating: 4, text: "Bon rapport qualité/prix. Légère nuisance sonore sur autoroute mais globalement satisfait." },
                { name: "Jean P.", date: "15 juin 2023", rating: 5, text: "Corrects, mais usure plus rapide que prévu sur mon SUV. À surveiller dans le temps." }
              ].map((review, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-gray-700">{review.name}</span>
                    <span className="text-[10px] text-gray-400">{review.date}</span>
                  </div>
                  <div className="flex text-yellow-400 text-[10px] mb-2">
                    {[...Array(5)].map((_, r) => <Star key={r} size={10} fill={r < review.rating ? "currentColor" : "none"} className={r < review.rating ? "" : "text-gray-200"} />)}
                  </div>
                  <p className="text-xs text-gray-500 italic">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">Produits liés</h2>
          
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {[
               { name: "ADVAN Sport V107", specs: "275/40 R19", price: 158.34, label: { f: 'D', w: 'A', n: 71 } },
               { name: "ADVAN SPORT V105", specs: "275/40 R19", price: 159.14, label: { f: 'D', w: 'A', n: 71 } },
               { name: "ADVAN NEOVA AD09", specs: "275/40 R19", price: 227.64, label: { f: 'D', w: 'A', n: 71 } },
               { name: "ADVAN Sport V105", specs: "275/40 R19", price: 159.14, label: { f: 'D', w: 'A', n: 71 } },
             ].map((prod, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded p-4 flex flex-col items-center hover:shadow-md transition-shadow">
                   <div className="flex w-full mb-2">
                      <div className="w-1/2">
                        <img src="https://placehold.co/150x150/f3f4f6/d1d5db?text=Tire" className="w-full object-contain" alt={prod.name} />
                      </div>
                      <div className="w-1/2 flex flex-col items-end gap-1">
                        <TireLabel type="fuel" value={prod.label.f} color="bg-orange-400" />
                        <TireLabel type="wet" value={prod.label.w} color="bg-green-500" />
                        <TireLabel type="noise" value={prod.label.n} color="bg-black" />
                      </div>
                   </div>
                   <div className="text-center mb-2">
                     <h4 className="font-bold text-xs uppercase text-gray-700">{prod.name}</h4>
                     <p className="text-[10px] text-gray-500">{prod.specs}</p>
                   </div>
                   <div className="mt-auto w-full text-center">
                      <div className="flex text-yellow-400 justify-center text-[10px] mb-1">
                        {[...Array(5)].map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                        <span className="text-gray-400 ml-1">4.5/5</span>
                      </div>
                      <span className="block font-bold text-lg text-[#003399] mb-2">€{prod.price}</span>
                      <button className="w-full bg-[#0066CC] text-white text-xs font-bold py-2 rounded hover:bg-blue-700">Add to cart</button>
                   </div>
                </div>
             ))}
           </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center text-gray-500 text-xs max-w-4xl mx-auto space-y-4 mb-12">
           <h3 className="font-bold text-gray-700 text-sm">MecaniDoc.com : Bien Plus Qu'un Service, Votre Partenaire de Confiance</h3>
           <p>Chez MecaniDoc.com, nous ne nous contentons pas de vendre des pneus, nous nous offrons une expérience unique, alliant qualité, fiabilité et sérénité.</p>
           <p className="text-left md:text-center">
             Engagement de Notre part ? Nous ne vous offrons pas seulement un simple achat, mais une véritable solution adaptée à vos besoins, avec : <br/>
             ✓ Des prix compétitifs toute l'année 💰 <br/>
             ✓ Un large choix de pneus pour tous les véhicules 🚗 <br/>
             ✓ Une livraison rapide et flexible 📦 <br/>
             ✓ Des options de montage simplifiées chez nos partenaires 🔧 <br/>
             ✓ Un service client à votre écoute Pour nous accompagner à chaque étape 📞
           </p>
           <p className="italic">
             🚀 Faites le choix de la tranquillité et découvrez la différence MecaniDoc. Parce que votre sécurité et votre satisfaction sont notre priorité, nous sommes là pour vous équiper en toute confiance et vous accompagner sur la route de la performance.
           </p>
        </div>

      </div>

      <Footer />
    </main>
  );
}
