"use client";

import React, { useEffect, useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Star, ShoppingCart, Fuel, CloudRain, Volume2, ShieldCheck, Truck, Info, MapPin, Check, Loader2, X, Search } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useProductPrice } from '@/hooks/useProductPrice';

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

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import RelatedProducts from '@/components/RelatedProducts';
import CategoryTooltip from '@/components/CategoryTooltip';

function ProductPriceDisplay({ basePrice, category }: { basePrice: number; category?: string }) {
  const { finalPrice, loading } = useProductPrice(basePrice || 0, category || 'Auto');
  
  if (loading) {
    return <span className="text-4xl font-bold text-[#003399]">€{basePrice.toFixed(2)}</span>;
  }
  
  return <span className="text-4xl font-bold text-[#003399]">€{finalPrice.toFixed(2)}</span>;
}

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const { addToCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Garage Selection State
  const [showGarageModal, setShowGarageModal] = useState(false);
  const [garages, setGarages] = useState<any[]>([]);
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [garageSearch, setGarageSearch] = useState('');
  const [loadingGarages, setLoadingGarages] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*, brands(id, name, logo_url)')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
      } else {
        console.log("Product data:", data);
        console.log("Product specs:", data?.specs);
        console.log("Autres categories:", data?.specs?.autres_categories);
        setProduct(data);
        if (data.category && data.category.toUpperCase() === 'AUTO') {
          setQuantity(4);
        } else {
          setQuantity(1);
        }
      }
      setLoading(false);
    };

    fetchProduct();
  }, [params.id]);

  const handleOpenGarageModal = async () => {
    setShowGarageModal(true);
    if (garages.length === 0) {
        setLoadingGarages(true);
        const { data, error } = await supabase
            .from('garages')
            .select('*');
            // .eq('is_approved', true); // Removed for dev/demo purposes so new garages show up
        
        if (data) setGarages(data);
        setLoadingGarages(false);
    }
  };

  const filteredGarages = garages.filter(g => 
    (g.name?.toLowerCase() || '').includes(garageSearch.toLowerCase()) || 
    (g.city?.toLowerCase() || '').includes(garageSearch.toLowerCase()) ||
    (g.postal_code || '').includes(garageSearch)
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F1F1F1] flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#F1F1F1]">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Produit non trouvé</h1>
          <Link href="/" className="text-blue-600 hover:underline mt-4 block">Retour à l'accueil</Link>
        </div>
        <Footer />
      </main>
    );
  }

  // Garantir que specs seja um objeto (pode vir como string JSON do banco)
  let specs: any = {};
  try {
    if (typeof product.specs === 'string') {
      specs = JSON.parse(product.specs);
    } else {
      specs = product.specs || {};
    }
  } catch (e) {
    console.error('Error parsing specs:', e);
    specs = {};
  }

  const labels = typeof product.labels === 'string'
    ? (() => {
        try {
          return JSON.parse(product.labels);
        } catch (e) {
          return {};
        }
      })()
    : (product.labels || {});
  
  // Garantir que autres_categories seja sempre um array
  if (specs.autres_categories) {
    if (typeof specs.autres_categories === 'string') {
      // Se for string, converter para array
      specs.autres_categories = specs.autres_categories
        .split(/[,;|]/)
        .map((cat: string) => cat.trim())
        .filter((cat: string) => cat.length > 0);
    } else if (!Array.isArray(specs.autres_categories)) {
      // Se não for array nem string, tentar converter
      specs.autres_categories = [];
    }
  } else {
    // Se não existir, inicializar como array vazio
    specs.autres_categories = [];
  }
  const fuelColor = (labels.fuel === 'A' || labels.fuel === 'B') ? 'bg-green-500 border-green-500' : (labels.fuel === 'C' || labels.fuel === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';
  const wetColor = (labels.wet === 'A' || labels.wet === 'B') ? 'bg-green-500 border-green-500' : (labels.wet === 'C' || labels.wet === 'D') ? 'bg-yellow-400 border-yellow-400' : 'bg-orange-500 border-orange-500';

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        
        {/* Top Section: Product Main */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row mb-6">
          
          {/* Left Column: Image & Badges */}
          <div className="w-full md:w-5/12 p-8 border-r border-gray-100 flex flex-col items-center">
            
            {/* Brand Logo - apenas imagem, sem estilo de botão */}
            <div className="mb-4">
              {product.brands?.logo_url ? (
                <img src={product.brands.logo_url} alt={product.brand} className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-sm font-bold text-gray-700 uppercase">{product.brand || 'MARQUE'}</span>
              )}
            </div>

            {/* Main Image */}
            <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded-lg mb-6">
              <img 
                src={product.images?.[0] || 'https://placehold.co/400x400/f3f4f6/d1d5db?text=Tire+Image'} 
                alt={product.name} 
                className="max-h-full object-contain mix-blend-multiply"
              />
            </div>

            {/* Labels - fora da imagem, abaixo */}
            <div className="w-full bg-white p-3 rounded-lg shadow-sm mb-6">
              <div className="flex flex-col gap-2">
                <TireLabel type="fuel" value={labels.fuel || '-'} color={fuelColor} />
                <TireLabel type="wet" value={labels.wet || '-'} color={wetColor} />
                <TireLabel type="noise" value={labels.noise || '-'} color="bg-black" />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center mb-6">
              © Les images sont uniquement illustratives. Les prix affichés sont TTC et concernent uniquement les pneus, sans les jantes.
            </p>

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
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" className="text-yellow-400" />)}
                <span className="text-gray-400 ml-1 text-xs">5.0/5 (Nouveau)</span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">
              {[product.brands?.name || product.brand, product.name].filter(Boolean).join(' ')}
            </h1>
            <p className="text-lg text-gray-900 mb-6 font-medium">
              <span>{specs.width}/{specs.height} R{specs.diameter} {specs.load_index}{specs.speed_index}</span>
              {specs.autres_categories && Array.isArray(specs.autres_categories) && specs.autres_categories.length > 0 && (
                <>
                  {' '}
                  {specs.autres_categories.map((cat: string, index: number) => (
                    <React.Fragment key={index}>
                      {index > 0 && ', '}
                      <CategoryTooltip category={cat} />
                    </React.Fragment>
                  ))}
                </>
              )}
            </p>

            <div className="mb-6">
              <span className="text-xs text-gray-500 block mb-1">Prix unitaire</span>
              <ProductPriceDisplay basePrice={product.base_price} category={product.category} />
            </div>

            <div className="text-xs text-green-600 mb-6 font-medium">Disponibilité: <span className="text-gray-600">En stock</span></div>

            <div className="flex items-center gap-4 mb-8">
               <div className="w-16">
                 <input 
                   type="number" 
                   min="1"
                   value={quantity}
                   onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                   className="w-full border border-gray-300 rounded px-2 py-2 text-center text-sm" 
                 />
               </div>
               <button 
                 onClick={() => {
                   addToCart(product, quantity, selectedGarage);
                   // Optional: Router push or toast
                   router.push('/checkout');
                 }}
                 className="flex-1 bg-[#0066CC] hover:bg-blue-700 text-white font-bold py-2 rounded text-sm transition-colors uppercase flex items-center justify-center gap-2"
               >
                 <ShoppingCart size={18} />
                 Ajouter au panier
               </button>
            </div>

            {/* Garage Selection (Dynamic) */}
            <div className={`bg-gray-50 border ${selectedGarage ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded p-4 mb-8 flex items-center justify-between transition-colors`}>
              <div className="flex items-center gap-3">
                <MapPin className={`${selectedGarage ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <span className="font-bold text-gray-700 text-sm block">
                    {selectedGarage ? 'Garage sélectionné :' : 'Montage en garage'}
                  </span>
                  {selectedGarage ? (
                     <span className="text-sm text-blue-800 font-medium">{selectedGarage.name} - {selectedGarage.city}</span>
                  ) : (
                     <span className="text-xs text-gray-500">2000 centres partenaires</span>
                  )}
                </div>
              </div>
              <button 
                onClick={handleOpenGarageModal}
                className={`${selectedGarage ? 'bg-white text-blue-600 border border-blue-200' : 'bg-[#1877F2] text-white'} text-xs font-bold py-2 px-3 rounded hover:opacity-90 transition-all`}
              >
                {selectedGarage ? 'Modifier' : 'Sélectionner un Garage'}
              </button>
            </div>

            {/* Specifications */}
            <h3 className="text-sm font-bold text-gray-600 uppercase border-b border-gray-200 pb-2 mb-4">Spécifications complètes</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Largeur :</span>
                <span className="font-medium text-gray-800">{specs.width || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Hauteur :</span>
                <span className="font-medium text-gray-800">{specs.height || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Diamètre :</span>
                <span className="font-medium text-gray-800">{specs.diameter || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Charge :</span>
                <span className="font-medium text-gray-800">{specs.load_index || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Vitesse :</span>
                <span className="font-medium text-gray-800">{specs.speed_index || '-'}</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Climat :</span>
                <span className="font-medium text-gray-800">{specs.season || '-'}</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Marque :</span>
                <span className="font-medium text-gray-800">{product.brand || '-'}</span>
              </div>
               <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Catégorie :</span>
                <span className="font-medium text-gray-800">{product.category || '-'}</span>
              </div>
              {specs.autres_categories && Array.isArray(specs.autres_categories) && specs.autres_categories.length > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100 col-span-2">
                  <span className="text-gray-500">Autres catégories :</span>
                  <span className="font-medium text-gray-900">
                    {specs.autres_categories.map((cat: string, index: number) => (
                      <React.Fragment key={index}>
                        {index > 0 && ', '}
                        <CategoryTooltip category={cat} />
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              )}
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
              <p>{product.description || "Aucune description disponible pour ce produit."}</p>
            </div>
            
            {/* Étiquette Image */}
            {product.labels?.label_url && (
              <div className="mt-6">
                <h4 className="font-bold text-gray-700 text-sm mb-3">Étiquette du produit</h4>
                <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-4">
                  <img
                    src={product.labels.label_url}
                    alt="Étiquette du produit"
                    className="max-w-full h-auto object-contain"
                    onError={(e) => {
                      // Se a imagem não carregar, tentar abrir em nova aba
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const link = document.createElement('a');
                      link.href = product.labels.label_url;
                      link.target = '_blank';
                      link.textContent = 'Ouvrir l\'étiquette';
                      link.className = 'text-blue-600 hover:underline';
                      target.parentElement?.appendChild(link);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Star size={18} className="text-yellow-400" /> Avis des clients
            </h3>
            <p className="text-gray-500 text-sm italic">Aucun avis pour le moment.</p>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center text-gray-500 text-xs max-w-4xl mx-auto space-y-4 mb-12">
           <h3 className="font-bold text-gray-700 text-sm">MecaniDoc.com : Bien Plus Qu'un Service, Votre Partenaire de Confiance</h3>
           <p>Chez MecaniDoc.com, nous ne nous contentons pas de vendre des pneus, nous nous offrons une expérience unique, alliant qualité, fiabilité et sérénité.</p>
        </div>

        {/* Related Products Carousel */}
        {product && (
          <RelatedProducts 
            productId={product.id}
            category={product.category}
            brandId={product.brand_id || product.brands?.id}
            brandName={product.brand || product.brands?.name}
            specs={specs}
          />
        )}

      </div>

      <Footer />

      {/* Garage Selection Modal */}
      {showGarageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
             <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Choisir un centre de montage</h3>
                <button onClick={() => setShowGarageModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
             </div>
             <div className="p-4 border-b bg-gray-50">
                <div className="relative">
                   <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="Rechercher par ville, code postal ou nom..." 
                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                     value={garageSearch}
                     onChange={(e) => setGarageSearch(e.target.value)}
                   />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingGarages ? (
                   <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : filteredGarages.length > 0 ? (
                   filteredGarages.map(garage => (
                     <div key={garage.id} onClick={() => { setSelectedGarage(garage); setShowGarageModal(false); }} className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors flex justify-between items-center group">
                        <div>
                           <p className="font-bold text-gray-800 text-sm">{garage.name}</p>
                           <p className="text-xs text-gray-500">{garage.address}, {garage.postal_code} {garage.city}</p>
                        </div>
                        <button className="text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">CHOISIR</button>
                     </div>
                   ))
                ) : (
                   <p className="text-center text-gray-500 py-8 text-sm">Aucun garage trouvé pour votre recherche.</p>
                )}
             </div>
          </div>
        </div>
      )}

    </main>
  );
}
