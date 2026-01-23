"use client";

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronUp, CreditCard, Shield, Truck, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    country: 'France',
    address: '',
    apartment: '',
    zip: '',
    city: '',
    phone: '',
    email: '',
    notes: '',
    orderType: 'Personne' // Or Company
  });

  // Extras State - sempre marcados por padrão
  const [showExtras, setShowExtras] = useState(false);
  const [extras, setExtras] = useState({
    deliveryType: 'fast', // 'normal' ou 'fast'
    warranty: true
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('global_settings').select('*').single();
      setSettings(data || { delivery_base_fee: 10, fast_delivery_fee: 19.90, warranty_fee: 5.50 });
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calcular total de pneus no carrinho
  const totalTires = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculations - Frete dinâmico baseado na quantidade
  const subtotal = cartTotal;
  
  // Lógica de frete:
  // Entrega Normal (5 dias úteis):
  //   - 1 pneu: €10.00
  //   - 2-4 pneus: GRATUITA
  // Entrega Rápida (24-72h):
  //   - 1 pneu: €19.90
  //   - 2 pneus: €19.90
  //   - 3 pneus: €29.90
  //   - 4 pneus: €29.90
  //   - 5+ pneus: €29.90
  let deliveryFee = 0;
  
  if (extras.deliveryType === 'normal') {
    // Entrega Normal (5 dias úteis)
    if (totalTires === 1) {
      deliveryFee = 10.00;
    } else if (totalTires >= 2 && totalTires <= 4) {
      deliveryFee = 0; // Grátis
    } else {
      deliveryFee = settings.delivery_base_fee || 0;
    }
  } else if (extras.deliveryType === 'fast') {
    // Entrega Rápida (24-72h)
    if (totalTires === 1 || totalTires === 2) {
      deliveryFee = 19.90;
    } else {
      // 3+ pneus
      deliveryFee = 29.90;
    }
  }
  
  // Seguro é por unidade (por pneu)
  const warrantyFeePerUnit = extras.warranty ? (settings.warranty_fee || 5.50) : 0;
  const warrantyFee = warrantyFeePerUnit * totalTires;
  const total = subtotal + deliveryFee + warrantyFee;

  const handlePlaceOrder = async () => {
    if (!termsAccepted) {
      alert("Veuillez accepter les termes et conditions.");
      return;
    }
    setPlacingOrder(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    // For Guest Checkout, we might need to handle user creation or allowing null user_id.
    // Assuming for now user must be logged in or we link to guest flow.
    // If no user, we can prompt login or create a guest user.
    // For this demo, let's assume we proceed. If RLS blocks, we need to handle it.
    
    // Create Order Payload
    const orderPayload = {
      user_id: user?.id,
      total_amount: total,
      status: 'pending',
      contact_name: `${formData.firstName} ${formData.lastName}`,
      contact_phone: formData.phone,
      contact_email: formData.email,
      shipping_address: `${formData.address} ${formData.apartment || ''}`,
      shipping_city: formData.city,
      shipping_zip: formData.zip,
      shipping_country: formData.country,
      notes: formData.notes
    };

    const { data: order, error } = await supabase.from('orders').insert([orderPayload]).select().single();

    if (error) {
      console.error(error);
      alert("Erreur lors de la création de la commande. Veuillez vous connecter.");
    } else {
      // Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.base_price,
        garage_id: item.garage?.id || null
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
         console.error("Error creating order items:", itemsError);
      }

      setOrderComplete(true);
      clearCart();
    }
    setPlacingOrder(false);
  };

  if (loading) return <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (orderComplete) {
    return (
      <main className="min-h-screen bg-[#F1F1F1]">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-xl shadow-sm p-12 max-w-2xl mx-auto">
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="text-green-600" size={32} />
             </div>
             <h1 className="text-3xl font-bold text-gray-800 mb-4">Commande Confirmée !</h1>
             <p className="text-gray-600 mb-8">Merci pour votre commande. Vous recevrez un email de confirmation sous peu.</p>
             <Link href="/" className="bg-[#0066CC] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
               Retour à la boutique
             </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (items.length === 0) {
    return (
        <main className="min-h-screen bg-[#F1F1F1]">
          <Header />
          <div className="container mx-auto px-4 py-20 text-center">
             <h1 className="text-2xl font-bold text-gray-800 mb-4">Votre panier est vide</h1>
             <Link href="/" className="text-blue-600 hover:underline">Continuer vos achats</Link>
          </div>
          <Footer />
        </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Validation de la commande</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left: Billing Details */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b">Détails de facturation</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                    <input type="text" name="firstName" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                    <input type="text" name="lastName" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                  </div>
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-gray-700 mb-1">Nom de l'entreprise (optionnel)</label>
                   <input type="text" name="company" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-700 mb-1">Pays / Région <span className="text-red-500">*</span></label>
                   <select name="country" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} defaultValue="France">
                      <option value="France">France</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Luxembourg">Luxembourg</option>
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-700 mb-1">Adresse <span className="text-red-500">*</span></label>
                   <input type="text" name="address" placeholder="Numéro et nom de rue" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 mb-2" onChange={handleChange} />
                   <input type="text" name="apartment" placeholder="Appartement, suite, etc. (optionnel)" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Code Postal <span className="text-red-500">*</span></label>
                    <input type="text" name="zip" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ville <span className="text-red-500">*</span></label>
                    <input type="text" name="city" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-700 mb-1">Téléphone <span className="text-red-500">*</span></label>
                   <input type="tel" name="phone" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                   <input type="email" name="email" required className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" onChange={handleChange} />
                </div>
                
                <div className="pt-4">
                   <label className="block text-xs font-bold text-gray-700 mb-1">Notes de commande (optionnel)</label>
                   <textarea name="notes" placeholder="Notes sur votre commande, ex: instructions de livraison." className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 h-24" onChange={handleChange}></textarea>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="w-full lg:w-[400px]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
               <h2 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b">Votre Commande</h2>
               
               {/* Product List */}
               <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                 {items.map((item, idx) => (
                   <div key={idx} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 block">{item.product.name}</span>
                        <span className="text-xs text-gray-500">Qté: {item.quantity}</span>
                        {item.garage && (
                           <span className="text-xs text-blue-600 block mt-1">Montage: {item.garage.name}</span>
                        )}
                      </div>
                      <span className="font-bold text-gray-800">€{(item.product.base_price * item.quantity).toFixed(2)}</span>
                   </div>
                 ))}
               </div>

               {/* Totals */}
               <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                 <div className="flex justify-between text-gray-600">
                   <span>Sous-total</span>
                   <span>€{subtotal.toFixed(2)}</span>
                 </div>
                 {deliveryFee > 0 && (
                   <div className="flex justify-between text-blue-600">
                     <span>{extras.deliveryType === 'fast' ? 'Livraison Rapide' : 'Livraison Standard'}</span>
                     <span>€{deliveryFee.toFixed(2)}</span>
                   </div>
                 )}
                 {deliveryFee === 0 && extras.deliveryType === 'normal' && (
                   <div className="flex justify-between text-green-600">
                     <span>Livraison Standard</span>
                     <span>GRATUITE</span>
                   </div>
                 )}
                 {extras.warranty && (
                   <div className="flex justify-between text-blue-600">
                     <span>Assurance ({totalTires} {totalTires > 1 ? 'pneus' : 'pneu'})</span>
                     <span>€{warrantyFee.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t mt-2">
                   <span>Total</span>
                   <span>€{total.toFixed(2)}</span>
                 </div>
               </div>

               {/* Extras Expandable */}
               <div className="mt-6 border rounded-lg overflow-hidden">
                 <button 
                   onClick={() => setShowExtras(!showExtras)}
                   className="w-full flex justify-between items-center p-3 bg-[#0066CC] text-white text-sm font-bold"
                 >
                   Informations sur l'assurance et la livraison
                   {showExtras ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                 </button>
                 
                 {showExtras && (
                   <div className="p-4 bg-gray-50 space-y-3 animate-in slide-in-from-top-2">
                     {/* Entrega Normal */}
                     <label className="flex items-start gap-3 cursor-pointer p-3 rounded border-2 border-transparent hover:border-gray-300 transition-colors" style={{ borderColor: extras.deliveryType === 'normal' ? '#0066CC' : 'transparent' }}>
                        <input 
                          type="radio" 
                          name="deliveryType"
                          checked={extras.deliveryType === 'normal'}
                          onChange={() => setExtras({...extras, deliveryType: 'normal'})}
                          className="mt-1"
                        />
                        <div className="flex-1">
                           <span className="block font-bold text-sm text-gray-700">
                             Livraison Standard {totalTires === 1 ? `(+€10.00)` : totalTires >= 2 && totalTires <= 4 ? `(GRATUITE)` : `(+€${(settings.delivery_base_fee || 10).toFixed(2)})`}
                           </span>
                           <span className="text-xs text-gray-500 block mt-1">
                             Livraison en 5 jours ouvrés.
                             {totalTires >= 2 && totalTires <= 4 && (
                               <span className="text-green-600 font-semibold block mt-1">✓ Gratuite à partir de 2 pneus</span>
                             )}
                           </span>
                        </div>
                     </label>
                     
                     {/* Entrega Rápida */}
                     <label className="flex items-start gap-3 cursor-pointer p-3 rounded border-2 border-transparent hover:border-gray-300 transition-colors" style={{ borderColor: extras.deliveryType === 'fast' ? '#0066CC' : 'transparent' }}>
                        <input 
                          type="radio" 
                          name="deliveryType"
                          checked={extras.deliveryType === 'fast'}
                          onChange={() => setExtras({...extras, deliveryType: 'fast'})}
                          className="mt-1"
                        />
                        <div className="flex-1">
                           <span className="block font-bold text-sm text-gray-700">
                             Livraison Rapide (+€{totalTires === 1 || totalTires === 2 ? '19.90' : '29.90'})
                           </span>
                           <span className="text-xs text-gray-500 block mt-1">
                             Livraison entre 24h et 72h.
                           </span>
                        </div>
                     </label>
                     <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={extras.warranty}
                          onChange={(e) => setExtras({...extras, warranty: e.target.checked})}
                          className="mt-1"
                        />
                        <div>
                           <span className="block font-bold text-sm text-gray-700">
                             Assurance Protection (+€{(settings.warranty_fee || 5.50).toFixed(2)}/unité)
                           </span>
                           <span className="text-xs text-gray-500">
                             Garantie contre les dommages accidentels. {totalTires > 1 && extras.warranty && `Total: €${warrantyFee.toFixed(2)} (${totalTires} pneus)`}
                           </span>
                        </div>
                     </label>
                   </div>
                 )}
               </div>

               {/* Payment Placeholder */}
               <div className="mt-6 space-y-3">
                 <div className="border rounded p-3 flex items-center gap-3">
                    <input type="radio" name="payment" defaultChecked />
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">Carte Bancaire <CreditCard size={16} /></span>
                 </div>
                 <div className="bg-gray-50 p-3 rounded border border-dashed border-gray-300">
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-full mb-2"></div>
                    <div className="flex gap-2">
                       <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
                       <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                 </div>
               </div>

               {/* Terms */}
               <div className="mt-6">
                 <label className="flex items-start gap-2 cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={termsAccepted}
                     onChange={(e) => setTermsAccepted(e.target.checked)}
                     className="mt-1"
                   />
                   <span className="text-xs text-gray-600">
                     J'accepte les <a href="#" className="text-blue-600 underline">termes de sécurité, d'assurance et de confidentialité</a> de Mecanidoc. <span className="text-red-500">*</span>
                   </span>
                 </label>
               </div>

               <button 
                 onClick={handlePlaceOrder}
                 disabled={placingOrder}
                 className="w-full mt-6 bg-[#40C4E7] hover:bg-[#3bb0cf] text-white font-bold py-3 rounded text-center transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
               >
                 {placingOrder && <Loader2 className="animate-spin" size={18} />}
                 Place order
               </button>

            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
