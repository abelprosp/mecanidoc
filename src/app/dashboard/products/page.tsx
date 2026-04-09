"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ProductUploadPage() {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sftpLoading, setSftpLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [storageBucket, setStorageBucket] = useState('product-imports');
  const [logs, setLogs] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setLogs([]);
      setSuccessCount(0);
      setErrorCount(0);
    }
  };

  const processCSV = async () => {
    if (!file) return;
    setLoading(true);
    setLogs(prev => [...prev, "Début du traitement du fichier..."]);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLogs(prev => [...prev, "Erreur: Utilisateur non connecté."]);
      setLoading(false);
      return;
    }

    // Try to get supplier_id if user is a supplier (optional linking)
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "", // Auto-detect delimiter
      complete: async (results) => {
        setLogs(prev => [...prev, `${results.data.length} lignes trouvées.`]);
        console.log("Headers detected:", results.meta.fields); // Debug headers
        
        let success = 0;
        let errors = 0;
        
        // Coletar valores únicos de pa_tipo agrupados por categoria
        const subcategoriesMap = new Map<string, Set<string>>(); // Map<parentCategory, Set<pa_tipo>>

        for (const row of results.data as any[]) {
          try {
            // 1. Handle Brand (Auto-create if not exists)
            const brandName = row['pa_marca'] || row['Brand'] || row['Marque'];
            let brandId = null;

            if (brandName) {
              // Check if brand exists
              const { data: existingBrand } = await supabase
                .from('brands')
                .select('id')
                .eq('name', brandName)
                .single();

              if (existingBrand) {
                brandId = existingBrand.id;
              } else {
                // Create new brand
                const { data: newBrand, error: brandError } = await supabase
                  .from('brands')
                  .insert([{ name: brandName, is_active: true }])
                  .select('id')
                  .single();
                
                if (brandError) {
                   console.error("Error creating brand:", brandError);
                   setLogs(prev => [...prev, `Warning: Could not create brand ${brandName}`]);
                } else {
                   brandId = newBrand.id;
                   setLogs(prev => [...prev, `New brand created: ${brandName}`]);
                }
              }
            }

            // Map CSV columns to Database Schema
            const productData = {
              name: row['name'] || row['Nom'] || row['Titre'], // Fallbacks
              base_price: parseFloat((row['regular_price'] || row['Prix régulier'] || '0').replace(',', '.')),
              sale_price: row['sale_price'] ? parseFloat(row['sale_price']?.replace(',', '.')) : null,
              description: row['description'] || row['Description'],
              images: [
                row['image de couverture'], 
                row['images'], 
                row['imagem_secundaria']
              ].filter(url => url && url.length > 0),
              
              // New fields mapping
              brand: brandName, // Keep text for backward compatibility
              brand_id: brandId, // Link to brands table
              ean: row['EAN'],
              shipping_cost: parseFloat(row['prix d\'expédition']?.replace(',', '.') || '0'),
              category: row['pa_categoria'] || row['pa_tipo'], // Fallback
              
              // Armazenar pa_tipo para criar subcategorias do menu
              pa_tipo: row['pa_tipo'] || null,
              
              // Specs JSON
              specs: {
                width: row['pa_largeur'],
                height: row['pa_hauteur'],
                diameter: row['pa_diametre'],
                load_index: row['pa_charge'],
                speed_index: row['pa_vitesse'],
                season: row['pa_clima'],
                runflat: row['autres catégories']?.includes('Runflat') || false,
                extra_load: row['autres catégories']?.includes('XL') || false,
                // Armazenar outras categorias como array (ex: ["M+S", "XL", "Runflat"])
                autres_categories: (() => {
                  const autresCat = row['autres catégories'] || row['autres categories'] || row['autres_categories'] || '';
                  if (!autresCat || autresCat.trim() === '') return [];
                  // Suporta separação por vírgula, ponto e vírgula, ou pipe
                  return autresCat
                    .split(/[,;|]/)
                    .map((cat: string) => cat.trim())
                    .filter((cat: string) => cat.length > 0);
                })(),
              },

              // Labels JSON
              labels: {
                fuel: row['consommation de carburant'],
                wet: row['adhérence au sol'],
                noise: row['niveau sonore extreme'],
                noise_class: row['Class'],
                label_url: row['étiquette'] // URL to PDF/Image of label
              },

              // Linking
              supplier_user_id: user.id, // Direct link to uploader
              supplier_id: supplier?.id || null, // Link to supplier profile if exists
              is_active: true
            };

            // Basic Validation
            if (!productData.name || !productData.base_price) {
              throw new Error(`Nom ou prix manquant pour ${productData.name || 'Produit inconnu'}`);
            }

            const { error } = await supabase.from('products').insert(productData);

            if (error) throw error;
            success++;
            
            // Coletar pa_tipo para criar subcategorias do menu
            const paTipo = row['pa_tipo'];
            const productCategory = productData.category;
            
            if (paTipo && productCategory) {
              // Mapear categoria do produto para categoria pai do menu
              let parentCategory = 'Auto'; // Default
              const catLower = productCategory.toLowerCase();
              if (catLower.includes('moto')) parentCategory = 'Moto';
              else if (catLower.includes('camion') || catLower.includes('poids lourd')) parentCategory = 'Camion';
              else if (catLower.includes('tracteur') || catLower.includes('agricol')) parentCategory = 'Tracteur';
              
              if (!subcategoriesMap.has(parentCategory)) {
                subcategoriesMap.set(parentCategory, new Set());
              }
              subcategoriesMap.get(parentCategory)!.add(paTipo);
            }

          } catch (err: any) {
            console.error(err);
            errors++;
            setLogs(prev => [...prev, `Erreur ligne: ${row['name']} - ${err.message}`]);
          }
        }

        // Criar/atualizar subcategorias do menu baseadas em pa_tipo
        if (subcategoriesMap.size > 0) {
          setLogs(prev => [...prev, `Création des sous-catégories du menu...`]);
          let subcategoriesCreated = 0;
          
          for (const [parentCategory, paTipos] of subcategoriesMap.entries()) {
            for (const paTipo of paTipos) {
              if (!paTipo || paTipo.trim() === '') continue;
              
              try {
                // Gerar slug a partir do nome
                const slug = paTipo
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9\s]/g, '')
                  .replace(/\s+/g, '-')
                  .trim();
                
                // Verificar se já existe
                const { data: existing } = await supabase
                  .from('menu_subcategories')
                  .select('id')
                  .eq('parent_category', parentCategory)
                  .eq('slug', slug)
                  .single();
                
                if (!existing) {
                  // Criar nova subcategoria
                  const { error: subError } = await supabase
                    .from('menu_subcategories')
                    .insert([{
                      parent_category: parentCategory,
                      name: paTipo,
                      slug: slug,
                      is_active: true,
                      sort_order: 0
                    }]);
                  
                  if (subError) {
                    console.error('Error creating subcategory:', subError);
                  } else {
                    subcategoriesCreated++;
                  }
                }
              } catch (err: any) {
                console.error('Error processing subcategory:', err);
              }
            }
          }
          
          if (subcategoriesCreated > 0) {
            setLogs(prev => [...prev, `${subcategoriesCreated} sous-catégories créées dans le menu.`]);
          }
        }

        setSuccessCount(success);
        setErrorCount(errors);
        setLoading(false);
        setLogs(prev => [...prev, `Terminé. ${success} succès, ${errors} échecs.`]);
      }
    });
  };

  const importFromSftp = async () => {
    setSftpLoading(true);
    setLogs((prev) => [...prev, "Début de l'importation SFTP..."]);
    setSuccessCount(0);
    setErrorCount(0);

    try {
      const response = await fetch('/api/admin/import-products-sftp', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }

      setSuccessCount(data.success || 0);
      setErrorCount(data.errors || 0);
      const apiLogs: string[] = Array.isArray(data.logs) ? data.logs : [];
      setLogs((prev) => [...prev, ...apiLogs, "Importation SFTP terminée."]);
    } catch (error: any) {
      setLogs((prev) => [...prev, `Erreur SFTP: ${error?.message || 'inconnue'}`]);
    } finally {
      setSftpLoading(false);
    }
  };

  const importFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) {
      setLogs((prev) => [...prev, 'Erreur: URL vide.']);
      return;
    }
    setUrlLoading(true);
    setLogs((prev) => [...prev, "Début de l'importation depuis URL HTTPS..."]);
    setSuccessCount(0);
    setErrorCount(0);
    try {
      const response = await fetch('/api/admin/import-products-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }
      setSuccessCount(data.success || 0);
      setErrorCount(data.errors || 0);
      const apiLogs: string[] = Array.isArray(data.logs) ? data.logs : [];
      setLogs((prev) => [...prev, ...apiLogs, 'Importation URL terminée.']);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'inconnue';
      setLogs((prev) => [...prev, `Erreur URL: ${msg}`]);
    } finally {
      setUrlLoading(false);
    }
  };

  const importFromStorage = async () => {
    const path = storagePath.trim();
    if (!path) {
      setLogs((prev) => [...prev, 'Erreur: chemin Storage vide (ex: imports/produits.csv).']);
      return;
    }
    setStorageLoading(true);
    setLogs((prev) => [...prev, "Début de l'importation depuis Supabase Storage..."]);
    setSuccessCount(0);
    setErrorCount(0);
    try {
      const bucket = storageBucket.trim() || 'product-imports';
      const response = await fetch('/api/admin/import-products-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ path, bucket }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }
      setSuccessCount(data.success || 0);
      setErrorCount(data.errors || 0);
      const apiLogs: string[] = Array.isArray(data.logs) ? data.logs : [];
      setLogs((prev) => [...prev, ...apiLogs, 'Importation Storage terminée.']);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'inconnue';
      setLogs((prev) => [...prev, `Erreur Storage: ${msg}`]);
    } finally {
      setStorageLoading(false);
    }
  };

  const remoteBusy = loading || sftpLoading || urlLoading || storageLoading;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Importer des Produits</h1>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="mb-4 p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-indigo-900">Importation via SFTP</p>
            <p className="text-xs text-indigo-700">
              Télécharge le CSV distant défini dans les variables d&apos;environnement (Vercel / .env).
            </p>
          </div>
          <button
            onClick={importFromSftp}
            disabled={remoteBusy}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sftpLoading && <Loader2 className="animate-spin" size={16} />}
            Importer via SFTP
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100 space-y-3">
          <p className="text-sm font-bold text-emerald-900">Importation via URL HTTPS</p>
          <p className="text-xs text-emerald-800">
            Lien direct vers un fichier CSV (éviter Google Drive/Dropbox sans lien de téléchargement direct). Max ~15 Mo.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://exemple.com/export/produits.csv"
              className="flex-1 border border-emerald-200 rounded px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={importFromUrl}
              disabled={remoteBusy}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {urlLoading && <Loader2 className="animate-spin" size={16} />}
              Importer depuis URL
            </button>
          </div>
        </div>

        <div className="mb-4 p-4 rounded-lg bg-sky-50 border border-sky-100 space-y-3">
          <p className="text-sm font-bold text-sky-900">Importation via Supabase Storage</p>
          <p className="text-xs text-sky-800">
            Créez le bucket <code className="bg-sky-100 px-1 rounded">product-imports</code> (script SQL), uploadez le CSV
            depuis le dashboard Supabase, puis indiquez le chemin du fichier.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={storageBucket}
              onChange={(e) => setStorageBucket(e.target.value)}
              placeholder="Bucket (défaut: product-imports)"
              className="border border-sky-200 rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)}
              placeholder="Chemin: imports/produits.csv"
              className="border border-sky-200 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={importFromStorage}
            disabled={remoteBusy}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
          >
            {storageLoading && <Loader2 className="animate-spin" size={16} />}
            Importer depuis Storage
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Glissez votre fichier CSV ici ou cliquez pour parcourir</p>
          <p className="text-xs text-gray-400 mb-4">Format supporté: CSV (Tabulation ou Virgule)</p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="mt-6 flex justify-between items-center bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" />
              <span className="font-medium text-blue-900">{file.name}</span>
              <span className="text-xs text-blue-500">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
            <button 
              onClick={processCSV} 
              disabled={remoteBusy}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Lancer l'importation
            </button>
          </div>
        )}
      </div>

      {(successCount > 0 || errorCount > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3 text-green-700 border border-green-100">
            <CheckCircle />
            <div>
              <p className="font-bold text-lg">{successCount}</p>
              <p className="text-sm">Produits importés</p>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg flex items-center gap-3 text-red-700 border border-red-100">
            <AlertCircle />
            <div>
              <p className="font-bold text-lg">{errorCount}</p>
              <p className="text-sm">Erreurs</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 text-gray-300 p-6 rounded-lg font-mono text-xs h-64 overflow-y-auto">
        <p className="text-gray-500 mb-2">// Logs d'importation</p>
        {logs.length === 0 && <p className="opacity-50">En attente...</p>}
        {logs.map((log, i) => (
          <p key={i} className="mb-1 border-b border-gray-800 pb-1">{`> ${log}`}</p>
        ))}
      </div>
    </div>
  );
}
