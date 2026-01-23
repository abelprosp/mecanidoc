-- Adicionar página de destino dos Modes de Livraison
-- Esta página pode ser editada pelo dashboard master

insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Modes de Livraison', 'modes-de-livraison', 'products', 15,
   '<div class="bg-gradient-to-r from-[#0066CC] to-[#004499] text-white py-12 px-4 mb-8 rounded-xl">
     <div class="container mx-auto text-center">
       <h1 class="text-4xl md:text-5xl font-bold mb-4 uppercase tracking-wide">Modes de Livraison</h1>
     </div>
   </div>

   <div class="container mx-auto px-4 py-8">
     <!-- Cards de Métodos de Entrega -->
     <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
       <!-- Card STANDARD -->
       <div class="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
         <h3 class="text-2xl font-bold text-gray-900 mb-4 uppercase">STANDARD</h3>
         <p class="text-blue-600 font-bold mb-3 underline">GRATUITE</p>
         <p class="text-gray-600 text-sm leading-relaxed">
           Livraison gratuite pour toute commande de deux pneus ou plus.
         </p>
       </div>

       <!-- Card EXPRESS -->
       <div class="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
         <h3 class="text-2xl font-bold text-gray-900 mb-4 uppercase">EXPRESS</h3>
         <p class="text-blue-600 font-bold mb-3 underline">Livraison prioritaire</p>
         <p class="text-gray-600 text-sm leading-relaxed">
           Vos pneus livrés rapidement et en toute sécurité.
         </p>
       </div>

       <!-- Card POINT DE RETRAIT -->
       <div class="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
         <h3 class="text-2xl font-bold text-gray-900 mb-4 uppercase">POINT DE RETRAIT</h3>
         <p class="text-blue-600 font-bold mb-3 underline">Retrait dans un point partenaire</p>
         <p class="text-gray-600 text-sm leading-relaxed">
           Choisissez le point de livraison le plus pratique pour vous et recevez vos pneus en toute simplicité.
         </p>
       </div>
     </div>

     <!-- Call to Action removido - já está no componente DeliveryModes -->

     <!-- Informações Adicionais -->
     <div class="bg-gray-50 rounded-xl p-8 mb-8">
       <h2 class="text-2xl font-bold text-gray-800 mb-6">Détails des modes de livraison</h2>
       
       <div class="space-y-6">
         <div>
           <h3 class="text-xl font-bold text-gray-800 mb-3">Livraison STANDARD (Gratuite)</h3>
           <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
             <li>Livraison gratuite pour les commandes de 2 pneus ou plus</li>
             <li>Délai de livraison : 3 à 5 jours ouvrés</li>
             <li>Suivi de commande disponible</li>
             <li>Livraison à domicile ou en point relais</li>
           </ul>
         </div>

         <div>
           <h3 class="text-xl font-bold text-gray-800 mb-3">Livraison EXPRESS</h3>
           <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
             <li>Livraison prioritaire en 24-48h</li>
             <li>Frais de livraison : selon la destination</li>
             <li>Suivi en temps réel de votre colis</li>
             <li>Livraison garantie avant 18h</li>
           </ul>
         </div>

         <div>
           <h3 class="text-xl font-bold text-gray-800 mb-3">Point de Retrait Partenaire</h3>
           <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
             <li>Récupération dans un de nos points partenaires</li>
             <li>Gratuit pour toutes les commandes</li>
             <li>Horaires d''ouverture flexibles</li>
             <li>Plus de 500 points disponibles en France</li>
             <li>Possibilité de montage sur place (selon le partenaire)</li>
           </ul>
         </div>
       </div>
     </div>

     <!-- Zone de Couverture -->
     <div class="bg-white border-2 border-blue-200 rounded-xl p-8 mb-8">
       <h2 class="text-2xl font-bold text-gray-800 mb-4">Zone de livraison</h2>
       <p class="text-gray-700 mb-4">
         Nous livrons dans toute la France métropolitaine. Pour les DOM-TOM et l''international, 
         veuillez nous contacter pour connaître les conditions et tarifs spécifiques.
       </p>
       <p class="text-gray-600 text-sm">
         Les délais de livraison peuvent varier selon la disponibilité des produits et la période de l''année.
       </p>
     </div>

     <!-- Contact -->
     <div class="bg-blue-50 rounded-xl p-8 text-center">
       <h3 class="text-2xl font-bold text-gray-800 mb-4">Des questions sur la livraison ?</h3>
       <p class="text-gray-700 mb-6">
         Notre équipe est à votre disposition pour répondre à toutes vos questions concernant nos modes de livraison.
       </p>
       <a href="/auth/login" class="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
         Contactez-nous
       </a>
     </div>
   </div>',
   true)
on conflict (slug) do update 
set content = excluded.content,
    title = excluded.title,
    section = excluded.section,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;
