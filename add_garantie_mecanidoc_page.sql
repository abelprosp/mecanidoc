-- Adicionar página de destino da Garantie MecaniDoc
-- Esta página pode ser editada pelo dashboard master

insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Garantie MecaniDoc', 'garantie-mecanidoc', 'terms', 25,
   '<div class="bg-gradient-to-r from-[#0066CC] to-[#004499] text-white py-12 px-4 mb-8 rounded-xl">
     <div class="container mx-auto text-center">
       <h1 class="text-4xl md:text-5xl font-bold mb-4 uppercase tracking-wide">La Garantie MecaniDoc</h1>
     </div>
   </div>

   <div class="container mx-auto px-4">
     <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
       <div>
         <h2 class="text-3xl font-bold text-gray-800 mb-6 uppercase">GARANTIE MECANIDOC</h2>
         <p class="text-lg text-gray-700 mb-6 leading-relaxed">
           Votre pneu <strong class="text-gray-900">remplacé ou remboursé</strong> en toute sérénité en cas de dommage !
         </p>
         <p class="text-gray-600 mb-4">
           Chez MecaniDoc, nous comprenons l''importance de la sécurité et de la tranquillité d''esprit. C''est pourquoi nous vous offrons une garantie complète sur tous nos pneus.
         </p>
         <p class="text-gray-600 mb-4">
           Notre garantie couvre les dommages accidentels, les défauts de fabrication, et bien plus encore. Vous pouvez rouler en toute confiance, sachant que nous sommes là pour vous protéger.
         </p>
       </div>
       <div class="flex items-center justify-center">
         <div class="w-full max-w-md">
           <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop" alt="Pneus MecaniDoc" class="w-full h-auto rounded-lg shadow-lg" />
         </div>
       </div>
     </div>

     <div class="bg-gray-50 rounded-xl p-8 mb-8">
       <h3 class="text-2xl font-bold text-gray-800 mb-6">Ce que couvre notre garantie</h3>
       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div class="flex items-start gap-4">
           <div class="bg-blue-100 rounded-full p-3 flex-shrink-0">
             <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
             </svg>
           </div>
           <div>
             <h4 class="font-bold text-gray-800 mb-2">Dommages accidentels</h4>
             <p class="text-gray-600 text-sm">Crevaisons, impacts, déformations causées par des obstacles sur la route.</p>
           </div>
         </div>
         <div class="flex items-start gap-4">
           <div class="bg-blue-100 rounded-full p-3 flex-shrink-0">
             <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
             </svg>
           </div>
           <div>
             <h4 class="font-bold text-gray-800 mb-2">Défauts de fabrication</h4>
             <p class="text-gray-600 text-sm">Problèmes liés à la qualité ou à la fabrication du pneu.</p>
           </div>
         </div>
         <div class="flex items-start gap-4">
           <div class="bg-blue-100 rounded-full p-3 flex-shrink-0">
             <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
             </svg>
           </div>
           <div>
             <h4 class="font-bold text-gray-800 mb-2">Usure prématurée</h4>
             <p class="text-gray-600 text-sm">Usure anormale dans les conditions d''utilisation normales.</p>
           </div>
         </div>
         <div class="flex items-start gap-4">
           <div class="bg-blue-100 rounded-full p-3 flex-shrink-0">
             <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
             </svg>
           </div>
           <div>
             <h4 class="font-bold text-gray-800 mb-2">Assistance 24/7</h4>
             <p class="text-gray-600 text-sm">Service client disponible à tout moment pour vous aider.</p>
           </div>
         </div>
       </div>
     </div>

     <div class="bg-white border-2 border-blue-200 rounded-xl p-8 mb-8">
       <h3 class="text-2xl font-bold text-gray-800 mb-4">Comment fonctionne la garantie ?</h3>
       <ol class="list-decimal list-inside space-y-4 text-gray-700">
         <li class="mb-4">
           <strong class="text-gray-900">Achat du pneu</strong> : La garantie est automatiquement incluse avec l''achat de tout pneu sur MecaniDoc.com.
         </li>
         <li class="mb-4">
           <strong class="text-gray-900">En cas de problème</strong> : Contactez notre service client dans les 30 jours suivant la découverte du dommage.
         </li>
         <li class="mb-4">
           <strong class="text-gray-900">Évaluation</strong> : Notre équipe évalue le dommage et détermine si celui-ci est couvert par la garantie.
         </li>
         <li class="mb-4">
           <strong class="text-gray-900">Solution</strong> : Nous remplaçons le pneu ou vous remboursons intégralement selon le cas.
         </li>
       </ol>
     </div>

     <div class="bg-blue-50 rounded-xl p-8 text-center">
       <h3 class="text-2xl font-bold text-gray-800 mb-4">Des questions sur la garantie ?</h3>
       <p class="text-gray-700 mb-6">
         Notre équipe est à votre disposition pour répondre à toutes vos questions concernant la garantie MecaniDoc.
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
