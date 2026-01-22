"use client";

import React, { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';

export default function RegisterGaragePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone1: '',
    phone2: '',
    email: '',
    garageName: '',
    country: 'France',
    zipCode: '',
    city: '',
    address: '',
    streetNumber: '',
    complement: '',
    companyName: '',
    siret: '',
    legalForm: '',
    tireTypes: {
      voiture: false,
      moto: false,
      utilitaire: false,
      camion: false,
      x4x4: false
    },
    openingHours: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      tireTypes: { ...prev.tireTypes, [name]: checked }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: 'garage', // Important for the Trigger
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert into Garages Table (Using the ID from Auth)
        // Note: The 'profiles' entry is created automatically by the DB trigger on auth.users insert
        
        const { error: garageError } = await supabase
          .from('garages')
          .insert({
            profile_id: authData.user.id,
            name: formData.garageName,
            address: `${formData.streetNumber} ${formData.address} ${formData.complement}`.trim(),
            zip_code: formData.zipCode,
            city: formData.city,
            country: formData.country,
            phone_primary: formData.phone1,
            phone_secondary: formData.phone2,
            company_name: formData.companyName,
            siret: formData.siret,
            legal_form: formData.legalForm,
            tire_types: formData.tireTypes,
            opening_hours: formData.openingHours,
            is_approved: false,
            installation_price: 0 
          });

        if (garageError) {
            // Determine if we need to manually insert profile if trigger failed or is not set up perfectly
            console.error("Garage insert error:", garageError);
            // Non-blocking for demo, but in prod handle cleanup
        }

        // Redirect to Dashboard
        router.push('/dashboard/garage');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <Header />

      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="bg-white w-full max-w-3xl rounded shadow-sm overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <Link href="/auth/login" className="flex-1 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
              Connexion
            </Link>
            <div className="flex-1 py-4 text-center text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-blue-50/30">
              Inscription
            </div>
          </div>

          <div className="p-8 md:p-12">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* General Info */}
              <section>
                <h3 className="text-blue-600 font-bold mb-6 text-sm uppercase tracking-wide">Informations générales</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom du responsable *</label>
                    <input type="text" name="lastName" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Prénom du responsable *</label>
                    <input type="text" name="firstName" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Téléphone 1 *</label>
                    <input type="tel" name="phone1" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Téléphone 2</label>
                    <input type="tel" name="phone2" onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">E-mail *</label>
                    <input type="email" name="email" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom du garage *</label>
                    <input type="text" name="garageName" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pays</label>
                    <select name="country" onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50">
                      <option value="France">France</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Suisse">Suisse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Code postal *</label>
                    <input type="text" name="zipCode" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ville *</label>
                    <input type="text" name="city" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Adresse du centre *</label>
                    <input type="text" name="address" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">N°</label>
                    <input type="text" name="streetNumber" onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Complément d'adresse</label>
                    <input type="text" name="complement" onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Raison sociale *</label>
                    <input type="text" name="companyName" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Numéro SIRET *</label>
                    <input type="text" name="siret" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Forme juridique *</label>
                    <select name="legalForm" required onChange={handleInputChange} className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50">
                      <option value="">Sélectionner</option>
                      <option value="SARL">SARL</option>
                      <option value="SAS">SAS</option>
                      <option value="EURL">EURL</option>
                      <option value="SASU">SASU</option>
                      <option value="EI">EI (Entreprise Individuelle)</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Professional Info */}
              <section>
                <h3 className="text-blue-600 font-bold mb-6 text-sm uppercase tracking-wide">Informations professionnelles</h3>
                
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 mb-3">Types de pneus montés *</label>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name="voiture" checked={formData.tireTypes.voiture} onChange={handleCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500" />
                      Voiture
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name="moto" checked={formData.tireTypes.moto} onChange={handleCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500" />
                      Moto
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name="utilitaire" checked={formData.tireTypes.utilitaire} onChange={handleCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500" />
                      Utilitaire
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name="camion" checked={formData.tireTypes.camion} onChange={handleCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500" />
                      Camion
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" name="x4x4" checked={formData.tireTypes.x4x4} onChange={handleCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500" />
                      4x4
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Horaires de fonctionnement</label>
                  <textarea 
                    name="openingHours" 
                    rows={4} 
                    placeholder="Du Lundi - Vendredi: 8h00 - 18h00&#10;Samedi: 9h00 - 12h00"
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 resize-none"
                  ></textarea>
                </div>
              </section>

              {/* Account Info */}
              <section>
                <h3 className="text-blue-600 font-bold mb-6 text-sm uppercase tracking-wide">Compte utilisateur</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom d'utilisateur *</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="garage123"
                      required
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-blue-50/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mot de passe *</label>
                    <input 
                      type="password" 
                      name="password" 
                      required 
                      onChange={handleInputChange}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-blue-50/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Confirmer le mot de passe *</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      required 
                      onChange={handleInputChange}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-blue-50/20" 
                    />
                  </div>
                </div>
              </section>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#0044CC] text-white font-bold py-3 px-8 rounded shadow-md hover:bg-blue-800 transition-colors text-sm uppercase tracking-wide disabled:opacity-70 flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  S'inscrire
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
