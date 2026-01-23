"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

export default function DynamicPage() {
  const params = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPage = async () => {
      if (!params.slug) return;
      const { data } = await supabase.from('footer_links').select('*').eq('slug', params.slug).single();
      setPage(data);
      setLoading(false);
    };
    fetchPage();
  }, [params.slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!page) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Page non trouvée</h1>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        {page.content ? (
          <div 
            dangerouslySetInnerHTML={{ __html: page.content }} 
            className="[&_*]:max-w-none"
          />
        ) : (
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
              <p className="text-gray-600">Cette page est en cours de rédaction. Le contenu sera bientôt disponible.</p>
            </article>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
