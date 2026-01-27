-- Criar/Atualizar página de Conditions de Livraison (Modes de Livraison)
-- Esta página pode ser editada pelo dashboard master

INSERT INTO public.footer_links (title, slug, section, sort_order, content, is_active) 
VALUES
  ('Conditions de Livraison', 'modes-de-livraison', 'products', 15,
   '<div class="container mx-auto px-4 py-8">
     <div class="max-w-4xl mx-auto">
       <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase tracking-tight">Conditions de Livraison</h1>
       
       <p class="text-gray-700 text-base md:text-lg mb-8 leading-relaxed">
         Nous proposons plusieurs options de livraison afin de répondre au mieux à vos besoins :
       </p>

       <div class="space-y-8 mb-12">
         <!-- Livraison STANDARD -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
           <div class="flex items-start gap-4 mb-4">
             <span class="text-3xl flex-shrink-0">🚛</span>
             <div class="flex-1">
               <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison STANDARD – GRATUITE</h2>
               <p class="text-gray-700 text-base md:text-lg leading-relaxed">
                 La livraison standard est gratuite pour toute commande de <strong class="text-gray-900 font-bold">2 pneus ou plus</strong>.<br/>
                 Les pneus sont livrés à domicile ou à l''adresse indiquée lors de la commande, sans frais supplémentaires.
               </p>
             </div>
           </div>
         </div>

         <!-- Livraison EXPRESS -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
           <div class="flex items-start gap-4 mb-4">
             <span class="text-3xl flex-shrink-0">⚡</span>
             <div class="flex-1">
               <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison EXPRESS</h2>
               <p class="text-gray-700 text-base md:text-lg leading-relaxed">
                 Les commandes en livraison express sont traitées en priorité.<br/>
                 Cette option garantit une expédition accélérée pour une réception rapide.
               </p>
             </div>
           </div>
         </div>

         <!-- Point de Retrait -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
           <div class="flex items-start gap-4 mb-4">
             <span class="text-3xl flex-shrink-0">📍</span>
             <div class="flex-1">
               <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison en POINT DE RETRAIT</h2>
               <p class="text-gray-700 text-base md:text-lg leading-relaxed mb-4">
                 Vous avez la possibilité de faire livrer vos pneus dans un garage partenaire ou un point de retrait de votre choix.
               </p>
               <p class="text-gray-700 text-sm md:text-base leading-relaxed bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                 <strong class="font-bold text-gray-900">Important :</strong> Il est de votre responsabilité de contacter le garage partenaire ou le point de retrait afin de l''informer de la réception de votre commande et d''organiser l''installation si nécessaire.
               </p>
             </div>
           </div>
         </div>
       </div>

       <!-- Dispositions générales -->
       <div class="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-200">
         <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Dispositions générales</h2>
         <ul class="space-y-4 text-gray-700 text-base md:text-lg leading-relaxed">
           <li class="flex items-start gap-3">
             <span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span>
             <span>Les délais de livraison sont donnés à titre indicatif et peuvent varier en fonction de la disponibilité des produits et des contraintes logistiques.</span>
           </li>
           <li class="flex items-start gap-3">
             <span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span>
             <span>En cas d''absence lors de la livraison à domicile, un avis de passage pourra être laissé par le transporteur avec les instructions pour reprogrammer la livraison ou récupérer le colis.</span>
           </li>
           <li class="flex items-start gap-3">
             <span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span>
             <span>Nous nous engageons à assurer un service de livraison rapide et efficace afin de garantir votre satisfaction.</span>
           </li>
         </ul>
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
