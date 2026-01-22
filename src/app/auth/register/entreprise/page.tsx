"use client";

import React, { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';

export default function RegisterCompanyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    username: '',
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
            full_name: formData.username, // Using username as display name for now
            role: 'company', // Important for the Trigger
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert into Companies Table
        // Note: The 'profiles' entry is created automatically by the DB trigger on auth.users insert
        
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            profile_id: authData.user.id,
            company_name: formData.companyName,
            // discount_tier default is set in DB schema
          });

        if (companyError) {
            console.error("Company insert error:", companyError);
        }

        // Redirect to Dashboard
        router.push('/dashboard/entreprise');
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
        <div className="bg-white w-full max-w-md rounded shadow-sm overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <Link href="/auth/login" className="flex-1 py-4 text-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50">
              Connexion
            </Link>
            <div className="flex-1 py-4 text-center text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-blue-50/30">
              Inscription
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom de l'entreprise</label>
                <input 
                  type="text" 
                  name="companyName" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom d'utilisateur</label>
                <input 
                  type="text" 
                  name="username" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-blue-500 focus:outline-none bg-blue-50/20" 
                  placeholder="johndoe123"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mot de passe</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-blue-500 focus:outline-none bg-blue-50/20" 
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmer le mot de passe</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-blue-500 focus:outline-none bg-gray-50/50" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#0044CC] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-800 transition-colors text-sm disabled:opacity-70 flex items-center justify-center gap-2"
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
