"use client";

import React, { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, User, Mail, Lock } from 'lucide-react';

export default function RegisterClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
            role: 'customer', // Default role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Redirect to Client Dashboard
        router.push('/dashboard/client');
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
        <div className="bg-white w-full max-w-md rounded-xl shadow-sm overflow-hidden border border-gray-100">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <Link href="/auth/login" className="flex-1 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
              Connexion
            </Link>
            <div className="flex-1 py-4 text-center text-sm font-bold text-[#0066CC] border-b-2 border-[#0066CC] bg-blue-50/30">
              Inscription
            </div>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Créer un compte</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prénom</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      name="firstName" 
                      required 
                      onChange={handleInputChange} 
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 transition-colors" 
                      placeholder="Jean"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nom</label>
                  <input 
                    type="text" 
                    name="lastName" 
                    required 
                    onChange={handleInputChange} 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 transition-colors" 
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    onChange={handleInputChange} 
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 transition-colors" 
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    onChange={handleInputChange} 
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 transition-colors" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmer le mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    required 
                    onChange={handleInputChange} 
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50 transition-colors" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#0066CC] text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors text-sm uppercase tracking-wide disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Créer mon compte
                </button>
              </div>

              <div className="text-center text-xs text-gray-500 mt-4">
                En créant un compte, vous acceptez nos <Link href="/conditions-generales-vente" className="text-blue-600 hover:underline">Conditions Générales de Vente</Link> et notre <Link href="/politique-donnees-personnelles" className="text-blue-600 hover:underline">Politique de Confidentialité</Link>.
              </div>

            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
