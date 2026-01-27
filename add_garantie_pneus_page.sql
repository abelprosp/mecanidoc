-- Criar/Atualizar página de Garantie Pneus
-- Esta página pode ser editada pelo dashboard master

INSERT INTO public.footer_links (title, slug, section, sort_order, content, is_active) 
VALUES
  ('Assurance Crevaison Mecanidoc', 'garantie-pneus', 'products', 16,
   '<div class="container mx-auto px-4 py-8">
     <div class="max-w-4xl mx-auto">
       <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase tracking-tight">Assurance Crevaison Mecanidoc</h1>
       
       <div class="bg-blue-50 border-l-4 border-blue-600 p-4 md:p-6 mb-8 rounded-r-lg">
         <p class="text-base md:text-lg text-gray-800 leading-relaxed">
           Pour seulement <strong class="text-blue-700 font-bold">5,50 € par pneu</strong>, bénéficiez d''une couverture complète contre les crevaisons et les hernies dues à un choc pendant la première année.
         </p>
       </div>

       <div class="space-y-6 mb-8">
         <!-- Remboursement total le premier mois -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-green-600 text-2xl">✓</span>
             Remboursement total le premier mois
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             Lors du premier mois suivant l''achat, <strong class="text-gray-900 font-bold">100% de la valeur du nouveau pneu</strong> est remboursée.
           </p>
         </div>

         <!-- Garantie pneu -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-blue-600 text-2xl">🛡️</span>
             Garantie pneu
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             Protégez vos achats contre les crevaisons.
           </p>
         </div>

         <!-- Période de protection -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-yellow-600 text-2xl">📅</span>
             Période de protection de 12 mois
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             Profitez d''une garantie de protection pour une période de <strong class="text-gray-900 font-bold">12 mois</strong>.
           </p>
         </div>

         <!-- Tranquillité pour un an -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-green-600 text-2xl">✨</span>
             Tranquillité pour un an
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             Un an de tranquillité pour vos pneus.
           </p>
         </div>

         <!-- Protection pour toutes les marques -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-blue-600 text-2xl">🚗</span>
             Protection pour toutes les marques de pneus
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             La garantie s''applique à <strong class="text-gray-900 font-bold">toutes les marques de pneus</strong>.
           </p>
         </div>

         <!-- Applicabilité -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
             <span class="text-gray-700 text-2xl">📋</span>
             Applicabilité
           </h2>
           <p class="text-gray-700 text-base md:text-lg leading-relaxed">
             La garantie couvre tous les pneus <strong class="text-gray-900 font-bold">été, hiver, moto, quad et 4×4</strong>, utilisés uniquement sur route.
           </p>
         </div>
       </div>

       <!-- Lien vers condições -->
       <div class="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
         <p class="text-gray-700 text-base md:text-lg mb-4">
           Veuillez <a href="/assurance-crevaison" class="text-blue-600 hover:text-blue-800 underline font-medium">consulter ici les conditions d''application de la garantie pneus</a>.
         </p>
       </div>

       <!-- Call to Action -->
       <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 md:p-8 text-center text-white">
         <p class="text-xl md:text-2xl font-bold mb-2">
           Optez pour l''assurance crevaison Mecanidoc et roulez l''esprit tranquille !
         </p>
       </div>
     </div>
   </div>',
   true)
ON CONFLICT (slug) DO UPDATE 
SET content = EXCLUDED.content,
    title = EXCLUDED.title,
    section = EXCLUDED.section,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;
