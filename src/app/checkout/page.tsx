"use client";

import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronUp, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

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
  const [paymentCanceled, setPaymentCanceled] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState<'details' | 'payment'>('details');
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const embeddedMountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('global_settings').select('*').maybeSingle();
        setSettings(data || { delivery_base_fee: 10, fast_delivery_fee: 19.90, warranty_fee: 5.50 });
      } catch {
        setSettings({ delivery_base_fee: 10, fast_delivery_fee: 19.90, warranty_fee: 5.50 });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!embeddedClientSecret || !stripePublishableKey) return;
    const mountEl = embeddedMountRef.current;
    if (!mountEl) return;

    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    (async () => {
      const stripe = await loadStripe(stripePublishableKey);
      if (!stripe || cancelled) return;
      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: embeddedClientSecret,
      });
      if (cancelled) {
        checkout.destroy();
        return;
      }
      instance = checkout;
      checkout.mount(mountEl);
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [embeddedClientSecret]);

  useEffect(() => {
    if (checkoutPhase !== 'payment') return;
    const t = window.setTimeout(() => {
      embeddedMountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [checkoutPhase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calcular total de pneus no carrinho
  const totalTires = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculations - Frete dinâmico baseado na quantidade
  const subtotal = cartTotal;
  
  // Lógica de frete:
  // Entrega Normal (5 dias úteis):
  //   - 1 pneu: €10.00 (obrigatório)
  //   - 2+ pneus: GRATUITA (sempre grátis)
  // Entrega Rápida (24-72h):
  //   - 1 pneu: €19.90
  //   - 2 pneus: €19.90
  //   - 3 pneus: €19.90
  //   - 4+ pneus: €29.90
  let deliveryFee = 0;
  
  if (extras.deliveryType === 'normal') {
    // Entrega Normal (5 dias úteis)
    if (totalTires === 1) {
      deliveryFee = 10.00; // Obrigatório para 1 pneu
    } else {
      // 2+ pneus: sempre grátis
      deliveryFee = 0;
    }
  } else if (extras.deliveryType === 'fast') {
    // Entrega Rápida (24-72h)
    if (totalTires >= 1 && totalTires <= 3) {
      deliveryFee = 19.90;
    } else {
      // 4+ pneus
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

    if (!stripePublishableKey) {
      alert('Paiement indisponible : ajoutez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY dans la configuration.');
      return;
    }

    // Validação básica
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.address || !formData.city || !formData.zip) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setPlacingOrder(true);
    setPaymentCanceled(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Veuillez vous connecter pour passer une commande.");
        setPlacingOrder(false);
        return;
      }
      
      // Create Order Payload (omitir payment_status para evitar PGRST204 se o schema cache estiver desatualizado; a tabela usa default 'pending')
      const orderPayload = {
        user_id: user.id,
        total_amount: total,
        subtotal_amount: subtotal,
        delivery_fee: deliveryFee,
        delivery_type: extras.deliveryType,
        warranty_included: extras.warranty,
        warranty_fee: warrantyFee,
        status: 'pending',
        contact_name: `${formData.firstName} ${formData.lastName}`.trim(),
        contact_phone: formData.phone?.trim() ?? '',
        contact_email: formData.email?.trim() ?? '',
        shipping_address: `${formData.address || ''} ${formData.apartment || ''}`.trim(),
        shipping_city: formData.city?.trim() ?? '',
        shipping_zip: formData.zip?.trim() ?? '',
        shipping_country: formData.country?.trim() ?? 'France',
        notes: formData.notes?.trim() ?? '',
      };

      const { data: order, error } = await supabase.from('orders').insert([orderPayload]).select().single();

      if (error) {
        console.error('Orders insert error:', error);
        const msg = error.message?.includes('column') ? 'A tabela orders pode estar sem colunas (execute run_all_migrations.sql no Supabase).' : error.message;
        alert(`Erreur lors de la création de la commande: ${msg}`);
        setPlacingOrder(false);
        return;
      }

      // Inserir itens via API (conexão direta à DB; contorna schema cache do Supabase)
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: Number(item.product.base_price) || 0,
        garage_id: item.garage?.id ?? null,
      }));

      const itemsRes = await fetch('/api/checkout/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, items: orderItems }),
      });
      const itemsData = await itemsRes.json().catch(() => ({}));
      let itemsOk = itemsRes.ok;
      // Hébergement statique ou API absente : 404. Config DB manquante : 503.
      if (!itemsOk && (itemsRes.status === 404 || itemsRes.status === 503)) {
        const { error: directErr } = await supabase.from('order_items').insert(orderItems);
        if (!directErr) itemsOk = true;
        else console.error('order_items insert (fallback):', directErr);
      }
      if (!itemsOk) {
        console.error('Order items insert error:', itemsData);
        alert(itemsData.error || `Erreur articles: ${itemsRes.status}`);
        setPlacingOrder(false);
        return;
      }

      // Redirecionar para o Stripe Checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      let paymentData: { clientSecret?: string; error?: string } = {};
      try {
        paymentData = await response.json();
      } catch {
        paymentData = { error: `Erreur serveur (${response.status}). Vérifiez la configuration Stripe (.env).` };
      }

      if (!response.ok || !paymentData.clientSecret) {
        console.error('Error creating checkout session:', paymentData);
        alert(paymentData.error || "Erreur lors de l'initialisation du paiement. Veuillez réessayer.");
        setPlacingOrder(false);
        return;
      }

      setEmbeddedClientSecret(paymentData.clientSecret);
      setCheckoutPhase('payment');
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Detectar se o usuário voltou após cancelar o pagamento no Stripe
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.get('canceled') === '1') {
      setPaymentCanceled(true);
      // Limpar o parâmetro da URL sem recarregar
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  if (loading) return <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (items.length === 0 && !paymentCanceled && checkoutPhase === 'details') {
    return (
        <main className="min-h-screen bg-[#F1F1F1]">
          <Header />
          <div className="layout-container py-20 text-center">
             <h1 className="text-2xl font-bold text-gray-800 mb-4">Votre panier est vide</h1>
             <Link href="/" className="text-blue-600 hover:underline">Continuer vos achats</Link>
          </div>
          <Footer />
        </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />
      
      <div className="layout-container py-8">
        {paymentCanceled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
            <AlertCircle size={20} />
            <span>Paiement annulé. Vous pouvez modifier votre commande et réessayer.</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          {checkoutPhase === 'payment' ? 'Paiement sécurisé' : 'Validation de la commande'}
        </h1>
        
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
                             Livraison Standard {totalTires === 1 ? `(+€10.00)` : `(GRATUITE)`}
                           </span>
                           <span className="text-xs text-gray-500 block mt-1">
                             Livraison en 5 jours ouvrés.
                             {totalTires >= 2 && (
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
                             Livraison Rapide (+€{totalTires >= 1 && totalTires <= 3 ? '19.90' : '29.90'})
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

               {checkoutPhase === 'details' && (
                 <p className="mt-6 text-xs text-gray-600">
                   Será direcionado para o checkout para escolher os métodos de pagamento.
                 </p>
               )}

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
                    J'accepte les <Link href="/mentions-legales" className="text-blue-600 underline hover:text-blue-800">termes de sécurité</Link>, <Link href="/assurance-crevaison" className="text-blue-600 underline hover:text-blue-800">d'assurance</Link> et de <Link href="/politique-donnees-personnelles" className="text-blue-600 underline hover:text-blue-800">confidentialité</Link> de Mecanidoc. <span className="text-red-500">*</span>
                  </span>
                 </label>
               </div>

               {checkoutPhase === 'details' && (
                 <button 
                   onClick={handlePlaceOrder}
                   disabled={placingOrder}
                   className="w-full mt-6 bg-[#40C4E7] hover:bg-[#3bb0cf] text-white font-bold py-3 rounded text-center transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                 >
                   {placingOrder && <Loader2 className="animate-spin" size={18} />}
                   Place order
                 </button>
               )}

            </div>
          </div>

        </div>

        {checkoutPhase === 'payment' && embeddedClientSecret && (
          <div className="mt-10 max-w-3xl mx-auto w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <p className="text-sm text-gray-600 mb-4">
                Finalisez votre paiement. Vous serez redirigé vers la confirmation une fois le paiement accepté.
              </p>
              <div ref={embeddedMountRef} className="min-h-[480px] w-full" />
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
