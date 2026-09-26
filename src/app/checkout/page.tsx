"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronUp, AlertCircle, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Quote = {
  currency: string;
  lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    garageId: string | null;
    garageName: string | null;
    installationPrice: number;
    installationTotal: number;
  }>;
  totalTires: number;
  subtotal: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  installationFee: number;
  deliveryType: 'normal' | 'fast';
  deliveryFee: number;
  warrantyIncluded: boolean;
  warrantyFeePerUnit: number;
  warrantyFee: number;
  total: number;
  settings: {
    deliveryBaseFee: number;
    fastDeliveryFee: number;
    fastDeliveryFeeBulk: number;
    fastDeliveryBulkMinQty: number;
    freeStandardDeliveryMinQty: number;
    warrantyFee: number;
  };
};

type FormData = {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  address: string;
  apartment: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  notes: string;
};

const FORM_STORAGE_KEY = 'mecanidoc_checkout_form';

const EMPTY_FORM: FormData = {
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
};

function eur(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

export default function CheckoutPage() {
  const { items, removeFromCart, updateQuantity } = useCart();
  const supabase = createClient();
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [showExtras, setShowExtras] = useState(false);
  const [extras, setExtras] = useState<{ deliveryType: 'normal' | 'fast'; warranty: boolean }>({
    deliveryType: 'normal',
    warranty: true,
  });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentCanceled, setPaymentCanceled] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState<'details' | 'payment'>('details');
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const embeddedMountRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Sessão + restauro do formulário (guardado ao ir fazer login)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setIsLoggedIn(Boolean(data.session?.user));
      if (data.session?.user?.email) {
        setFormData((prev) => (prev.email ? prev : { ...prev, email: data.session!.user.email }));
      }
    })();
    try {
      const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormData> & { extras?: typeof extras };
        setFormData((prev) => ({ ...prev, ...parsed, notes: parsed.notes ?? prev.notes }));
        if (parsed.extras) setExtras(parsed.extras);
        sessionStorage.removeItem(FORM_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stripe/config', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const key = typeof data.publishableKey === 'string' ? data.publishableKey.trim() : '';
        setStripePublishableKey(key);
        setStripeConfigured(Boolean(data.configured && key));
      } catch {
        if (!cancelled) setStripeConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Orçamento do servidor (fonte única de preços)
  const quoteAbort = useRef<AbortController | null>(null);
  const refreshQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    quoteAbort.current?.abort();
    const controller = new AbortController();
    quoteAbort.current = controller;
    setQuoteLoading(true);
    try {
      const res = await fetch('/api/checkout/quote', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, garageId: i.garage?.id ?? null })),
          deliveryType: extras.deliveryType,
          warranty: extras.warranty,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok || !data.quote) {
        setQuote(null);
        setQuoteError(data.error || 'Impossible de calculer le montant.');
      } else {
        setQuote(data.quote as Quote);
        setQuoteError(null);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setQuoteError('Erreur réseau lors du calcul du montant.');
    } finally {
      if (!controller.signal.aborted) setQuoteLoading(false);
    }
  }, [items, extras.deliveryType, extras.warranty]);

  useEffect(() => {
    if (checkoutPhase === 'payment') return;
    const t = window.setTimeout(refreshQuote, 250);
    return () => window.clearTimeout(t);
  }, [refreshQuote, checkoutPhase]);

  useEffect(() => {
    if (!embeddedClientSecret || !stripePublishableKey) return;
    const mountEl = embeddedMountRef.current;
    if (!mountEl) return;

    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    (async () => {
      const stripe = await loadStripe(stripePublishableKey);
      if (!stripe || cancelled) return;
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret: embeddedClientSecret });
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
  }, [embeddedClientSecret, stripePublishableKey]);

  useEffect(() => {
    if (checkoutPhase !== 'payment') return;
    const t = window.setTimeout(() => {
      embeddedMountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [checkoutPhase]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.get('canceled') === '1') {
      setPaymentCanceled(true);
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateLocally = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'Prénom requis';
    if (!formData.lastName.trim()) errs.lastName = 'Nom requis';
    if (!formData.address.trim()) errs.address = 'Adresse requise';
    if (!formData.city.trim()) errs.city = 'Ville requise';
    if (!/^[0-9A-Za-z -]{3,16}$/.test(formData.zip.trim())) errs.zip = 'Code postal invalide';
    if (!/^[0-9+().\s-]{6,30}$/.test(formData.phone.trim())) errs.phone = 'Téléphone invalide';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) errs.email = 'E-mail invalide';
    return errs;
  };

  const goToLogin = () => {
    try {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ ...formData, extras }));
    } catch {
      /* ignore */
    }
    window.location.href = `/auth/login?redirect=${encodeURIComponent('/checkout')}`;
  };

  const focusFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePlaceOrder = async () => {
    setFormError(null);

    const localErrors = validateLocally();
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      focusFirstError(localErrors);
      return;
    }
    if (!termsAccepted) {
      setFormError('Veuillez accepter les conditions pour continuer.');
      return;
    }
    if (!stripeConfigured || !stripePublishableKey) {
      setFormError('Le paiement est temporairement indisponible. Veuillez réessayer plus tard.');
      return;
    }
    if (isLoggedIn === false) {
      goToLogin();
      return;
    }

    setPlacingOrder(true);
    setPaymentCanceled(false);

    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, garageId: i.garage?.id ?? null })),
          deliveryType: extras.deliveryType,
          warranty: extras.warranty,
          contact: formData,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        goToLogin();
        return;
      }
      if (!res.ok || !data.orderId) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          focusFirstError(data.fieldErrors);
        }
        if (data.code === 'OUT_OF_STOCK' || data.code === 'PRODUCT_UNAVAILABLE') {
          refreshQuote();
        }
        setFormError(data.error || 'Impossible de créer la commande. Veuillez réessayer.');
        return;
      }

      if (data.quote) setQuote(data.quote as Quote);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ orderId: data.orderId }),
      });

      let paymentData: { clientSecret?: string; error?: string; alreadyPaid?: boolean } = {};
      try {
        paymentData = await response.json();
      } catch {
        paymentData = { error: 'Le service de paiement ne répond pas. Veuillez réessayer.' };
      }

      if (!response.ok || !paymentData.clientSecret) {
        if (response.status === 409 && paymentData.alreadyPaid) {
          window.location.href = `/checkout/success?order_id=${encodeURIComponent(data.orderId)}`;
          return;
        }
        setFormError(paymentData.error || "Erreur lors de l'initialisation du paiement. Veuillez réessayer.");
        return;
      }

      setEmbeddedClientSecret(paymentData.clientSecret);
      setCheckoutPhase('payment');
    } catch (error) {
      console.error('Error placing order:', error);
      setFormError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setPlacingOrder(false);
    }
  };

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

  const cartLocked = checkoutPhase === 'payment';
  const totalTires = items.reduce((sum, item) => sum + item.quantity, 0);
  const s = quote?.settings;
  const standardLabel = s
    ? totalTires >= s.freeStandardDeliveryMinQty
      ? 'GRATUITE'
      : `+${eur(s.deliveryBaseFee)}`
    : '';
  const fastLabel = s
    ? `+${eur(totalTires >= s.fastDeliveryBulkMinQty ? s.fastDeliveryFeeBulk : s.fastDeliveryFee)}`
    : '';

  const inputClass = (name: string) =>
    `w-full border rounded px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/40 ${
      fieldErrors[name] ? 'border-red-400 bg-red-50/40' : 'border-gray-300'
    }`;

  const FieldError = ({ name }: { name: string }) =>
    fieldErrors[name] ? (
      <p id={`${name}-error`} className="mt-1 text-xs text-red-600" role="alert">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />

      <div className="layout-container py-8">
        {paymentCanceled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800" role="status">
            <AlertCircle size={20} aria-hidden />
            <span>Paiement annulé. Vous pouvez modifier votre commande et réessayer.</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          {checkoutPhase === 'payment' ? 'Paiement sécurisé' : 'Validation de la commande'}
        </h1>

        {isLoggedIn === false && checkoutPhase === 'details' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex flex-wrap items-center justify-between gap-3">
            <span>Vous devez être connecté pour finaliser la commande. Vos informations seront conservées.</span>
            <button type="button" onClick={goToLogin} className="font-bold text-[#0066CC] hover:underline">
              Se connecter / Créer un compte
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b">Détails de facturation</h2>
              <form ref={formRef} className="space-y-4" noValidate onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-bold text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                    <input id="firstName" type="text" name="firstName" value={formData.firstName} required autoComplete="given-name" disabled={cartLocked} className={inputClass('firstName')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined} />
                    <FieldError name="firstName" />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-bold text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                    <input id="lastName" type="text" name="lastName" value={formData.lastName} required autoComplete="family-name" disabled={cartLocked} className={inputClass('lastName')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined} />
                    <FieldError name="lastName" />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-xs font-bold text-gray-700 mb-1">Nom de l&apos;entreprise (optionnel)</label>
                  <input id="company" type="text" name="company" value={formData.company} autoComplete="organization" disabled={cartLocked} className={inputClass('company')} onChange={handleChange} />
                </div>

                <div>
                  <label htmlFor="country" className="block text-xs font-bold text-gray-700 mb-1">Pays / Région <span className="text-red-500">*</span></label>
                  <select id="country" name="country" value={formData.country} autoComplete="country-name" disabled={cartLocked} className={inputClass('country')} onChange={handleChange}>
                    <option value="France">France</option>
                    <option value="Belgique">Belgique</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Suisse">Suisse</option>
                  </select>
                  <FieldError name="country" />
                </div>

                <div>
                  <label htmlFor="address" className="block text-xs font-bold text-gray-700 mb-1">Adresse <span className="text-red-500">*</span></label>
                  <input id="address" type="text" name="address" value={formData.address} placeholder="Numéro et nom de rue" required autoComplete="address-line1" disabled={cartLocked} className={`${inputClass('address')} mb-2`} onChange={handleChange} aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? 'address-error' : undefined} />
                  <FieldError name="address" />
                  <label htmlFor="apartment" className="sr-only">Complément d&apos;adresse</label>
                  <input id="apartment" type="text" name="apartment" value={formData.apartment} placeholder="Appartement, suite, etc. (optionnel)" autoComplete="address-line2" disabled={cartLocked} className={inputClass('apartment')} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zip" className="block text-xs font-bold text-gray-700 mb-1">Code Postal <span className="text-red-500">*</span></label>
                    <input id="zip" type="text" name="zip" value={formData.zip} required inputMode="numeric" autoComplete="postal-code" disabled={cartLocked} className={inputClass('zip')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.zip)} aria-describedby={fieldErrors.zip ? 'zip-error' : undefined} />
                    <FieldError name="zip" />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-xs font-bold text-gray-700 mb-1">Ville <span className="text-red-500">*</span></label>
                    <input id="city" type="text" name="city" value={formData.city} required autoComplete="address-level2" disabled={cartLocked} className={inputClass('city')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.city)} aria-describedby={fieldErrors.city ? 'city-error' : undefined} />
                    <FieldError name="city" />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-gray-700 mb-1">Téléphone <span className="text-red-500">*</span></label>
                  <input id="phone" type="tel" name="phone" value={formData.phone} required autoComplete="tel" disabled={cartLocked} className={inputClass('phone')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} />
                  <FieldError name="phone" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input id="email" type="email" name="email" value={formData.email} required autoComplete="email" disabled={cartLocked} className={inputClass('email')} onChange={handleChange} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                  <FieldError name="email" />
                </div>

                <div className="pt-4">
                  <label htmlFor="notes" className="block text-xs font-bold text-gray-700 mb-1">Notes de commande (optionnel)</label>
                  <textarea id="notes" name="notes" value={formData.notes} placeholder="Notes sur votre commande, ex: instructions de livraison." disabled={cartLocked} className={`${inputClass('notes')} h-24`} onChange={handleChange} />
                </div>
              </form>
            </div>
          </div>

          <div className="w-full lg:w-[400px]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b">Votre Commande</h2>

              <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-2">
                {items.map((item) => {
                  const line = quote?.lines.find(
                    (l) => l.productId === item.product.id && (l.garageId ?? null) === (item.garage?.id ?? null)
                  );
                  return (
                    <div key={`${item.product.id}-${item.garage?.id ?? ''}`} className="flex justify-between gap-3 text-sm border-b border-gray-50 pb-3 last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700 block truncate">{item.product.name}</span>
                        {item.garage && (
                          <span className="text-xs text-blue-600 block mt-1">
                            Montage : {item.garage.name}
                            {line && line.installationPrice > 0 && ` (+${eur(line.installationPrice)}/pneu)`}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Qté</span>
                          <div className="inline-flex items-center rounded border border-gray-200 bg-gray-50">
                            <button type="button" disabled={cartLocked || placingOrder} onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 text-gray-600 hover:bg-gray-200 disabled:opacity-40 rounded-l" aria-label="Diminuer la quantité">
                              <Minus size={14} />
                            </button>
                            <span className="min-w-[2rem] text-center text-xs font-bold text-gray-800 tabular-nums">{item.quantity}</span>
                            <button type="button" disabled={cartLocked || placingOrder} onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 text-gray-600 hover:bg-gray-200 disabled:opacity-40 rounded-r" aria-label="Augmenter la quantité">
                              <Plus size={14} />
                            </button>
                          </div>
                          <button type="button" disabled={cartLocked || placingOrder} onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 disabled:opacity-40" title="Retirer du panier" aria-label="Retirer du panier">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <span className="font-bold text-gray-800 shrink-0 tabular-nums">
                        {line ? eur(line.lineTotal + line.installationTotal) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {quoteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2" role="alert">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
                  <span>{quoteError}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm" aria-live="polite" aria-busy={quoteLoading}>
                {quote ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Sous-total ({quote.totalTires} {quote.totalTires > 1 ? 'pneus' : 'pneu'}, TTC)</span>
                      <span className="tabular-nums">{eur(quote.subtotal)}</span>
                    </div>
                    {quote.discountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Remise entreprise ({quote.discountRate}%)</span>
                        <span className="tabular-nums">−{eur(quote.discountAmount)}</span>
                      </div>
                    )}
                    {quote.installationFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Montage en garage</span>
                        <span className="tabular-nums">{eur(quote.installationFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>{quote.deliveryType === 'fast' ? 'Livraison Express (24-72h)' : 'Livraison Standard (5 j. ouvrés)'}</span>
                      <span className={`tabular-nums ${quote.deliveryFee === 0 ? 'text-green-700 font-semibold' : ''}`}>
                        {quote.deliveryFee === 0 ? 'GRATUITE' : eur(quote.deliveryFee)}
                      </span>
                    </div>
                    {quote.warrantyIncluded && (
                      <div className="flex justify-between text-gray-600">
                        <span>Assurance crevaison ({quote.totalTires} × {eur(quote.warrantyFeePerUnit)})</span>
                        <span className="tabular-nums">{eur(quote.warrantyFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t mt-2">
                      <span>Total TTC</span>
                      <span className="tabular-nums">{eur(quote.total)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                    {quoteLoading && <Loader2 className="animate-spin" size={14} aria-hidden />}
                    {quoteLoading ? 'Calcul du montant…' : 'Montant indisponible.'}
                  </div>
                )}
              </div>

              <div className="mt-6 border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExtras(!showExtras)}
                  aria-expanded={showExtras}
                  aria-controls="checkout-extras"
                  className="w-full flex justify-between items-center p-3 bg-[#0066CC] text-white text-sm font-bold"
                >
                  Livraison et assurance
                  {showExtras ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                </button>

                {showExtras && (
                  <div id="checkout-extras" className="p-4 bg-gray-50 space-y-3">
                    <fieldset disabled={cartLocked} className="space-y-3">
                      <legend className="sr-only">Mode de livraison</legend>
                      <label className={`flex items-start gap-3 cursor-pointer p-3 rounded border-2 transition-colors ${extras.deliveryType === 'normal' ? 'border-[#0066CC]' : 'border-transparent hover:border-gray-300'}`}>
                        <input type="radio" name="deliveryType" checked={extras.deliveryType === 'normal'} onChange={() => setExtras({ ...extras, deliveryType: 'normal' })} className="mt-1" />
                        <div className="flex-1">
                          <span className="block font-bold text-sm text-gray-700">Livraison Standard {standardLabel && `(${standardLabel})`}</span>
                          <span className="text-xs text-gray-500 block mt-1">
                            Livraison en 5 jours ouvrés.
                            {s && <span className="block mt-1">Gratuite à partir de {s.freeStandardDeliveryMinQty} pneus.</span>}
                          </span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 cursor-pointer p-3 rounded border-2 transition-colors ${extras.deliveryType === 'fast' ? 'border-[#0066CC]' : 'border-transparent hover:border-gray-300'}`}>
                        <input type="radio" name="deliveryType" checked={extras.deliveryType === 'fast'} onChange={() => setExtras({ ...extras, deliveryType: 'fast' })} className="mt-1" />
                        <div className="flex-1">
                          <span className="block font-bold text-sm text-gray-700">Livraison Express {fastLabel && `(${fastLabel})`}</span>
                          <span className="text-xs text-gray-500 block mt-1">Livraison entre 24h et 72h.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer p-3">
                        <input type="checkbox" checked={extras.warranty} onChange={(e) => setExtras({ ...extras, warranty: e.target.checked })} className="mt-1" />
                        <div>
                          <span className="block font-bold text-sm text-gray-700">
                            Assurance crevaison {s && `(+${eur(s.warrantyFee)}/pneu)`}
                          </span>
                          <span className="text-xs text-gray-500">
                            Remplacement ou remboursement en cas de crevaison ou hernie pendant 12 mois.{' '}
                            <Link href="/assurance-crevaison" className="text-blue-600 underline">Conditions</Link>
                          </span>
                        </div>
                      </label>
                    </fieldset>
                  </div>
                )}
              </div>

              {checkoutPhase === 'details' && stripeConfigured === false && (
                <p className="mt-6 text-xs text-red-700 bg-red-50 border border-red-100 rounded p-2" role="alert">
                  Le paiement est temporairement indisponible. Veuillez réessayer plus tard ou contacter le support.
                </p>
              )}
              {checkoutPhase === 'details' && stripeConfigured !== false && (
                <p className="mt-6 text-xs text-gray-600">Vous pourrez régler en toute sécurité via Stripe à l&apos;étape suivante.</p>
              )}
              {checkoutPhase === 'payment' && (
                <p className="mt-6 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2" role="status">
                  Paiement en cours. Ne fermez pas cette page avant la confirmation.
                </p>
              )}

              <div className="mt-6">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={termsAccepted} disabled={cartLocked} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" />
                  <span className="text-xs text-gray-600">
                    J&apos;accepte les <Link href="/conditions-generales-vente" className="text-blue-600 underline hover:text-blue-800">conditions générales de vente</Link>, les <Link href="/assurance-crevaison" className="text-blue-600 underline hover:text-blue-800">conditions d&apos;assurance</Link> et la <Link href="/politique-donnees-personnelles" className="text-blue-600 underline hover:text-blue-800">politique de confidentialité</Link> de MecaniDoc. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {formError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2" role="alert">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
                  <span>{formError}</span>
                </div>
              )}

              {checkoutPhase === 'details' && (
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || stripeConfigured === false || !quote || quoteLoading}
                  className="w-full mt-6 bg-[#0066CC] hover:bg-blue-700 text-white font-bold py-3 rounded text-center transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {placingOrder && <Loader2 className="animate-spin" size={18} aria-hidden />}
                  {isLoggedIn === false ? 'Se connecter et commander' : `Commander${quote ? ` · ${eur(quote.total)}` : ''}`}
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
