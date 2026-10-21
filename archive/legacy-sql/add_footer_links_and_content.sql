-- Adicionar links faltantes da barra inferior e criar slugs para links existentes
-- Atualizar links existentes para ter slugs se não tiverem

-- Atualizar links existentes para ter slugs
update public.footer_links 
set slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
where slug is null or slug = '';

-- Adicionar links da barra inferior (seção 'legal')
insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Conditions générales de vente', 'cgv', 'legal', 10, 
   '<h1>Conditions générales de vente</h1>
   <p>Les présentes conditions générales de vente régissent les relations entre MecaniDoc.com et ses clients.</p>
   <h2>1. Objet</h2>
   <p>Les présentes conditions générales de vente ont pour objet de définir les modalités et conditions de vente des produits proposés par MecaniDoc.com.</p>
   <h2>2. Prix</h2>
   <p>Les prix de nos produits sont indiqués en euros, toutes taxes comprises (TTC).</p>
   <h2>3. Commande</h2>
   <p>La commande est validée après confirmation par email.</p>
   <h2>4. Livraison</h2>
   <p>Les délais de livraison sont indiqués lors de la commande.</p>
   <h2>5. Retour</h2>
   <p>Conformément à la législation en vigueur, vous disposez d''un délai de 14 jours pour retourner un produit non conforme.</p>', 
   true)
on conflict do nothing;

insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Mentions légales', 'mentions-legales', 'legal', 20,
   '<h1>Mentions légales</h1>
   <h2>1. Éditeur du site</h2>
   <p><strong>MecaniDoc.com</strong></p>
   <p>Société spécialisée dans la vente de pneus en ligne.</p>
   <h2>2. Directeur de publication</h2>
   <p>Le directeur de publication est le représentant légal de MecaniDoc.com.</p>
   <h2>3. Hébergement</h2>
   <p>Le site est hébergé par [Nom de l''hébergeur].</p>
   <h2>4. Propriété intellectuelle</h2>
   <p>Tous les éléments du site MecaniDoc.com sont protégés par le droit d''auteur.</p>
   <h2>5. Données personnelles</h2>
   <p>Conformément à la loi Informatique et Libertés, vous disposez d''un droit d''accès, de rectification et de suppression des données vous concernant.</p>',
   true)
on conflict do nothing;

insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Politique de gestion des données personnelles', 'politique-donnees-personnelles', 'legal', 30,
   '<h1>Politique de gestion des données personnelles</h1>
   <h2>1. Collecte des données</h2>
   <p>MecaniDoc.com collecte les données personnelles nécessaires à la gestion de votre commande et à l''amélioration de nos services.</p>
   <h2>2. Utilisation des données</h2>
   <p>Vos données personnelles sont utilisées pour :</p>
   <ul>
     <li>Le traitement de vos commandes</li>
     <li>La gestion de votre compte client</li>
     <li>L''envoi d''informations commerciales (avec votre consentement)</li>
   </ul>
   <h2>3. Conservation des données</h2>
   <p>Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.</p>
   <h2>4. Vos droits</h2>
   <p>Conformément au RGPD, vous disposez d''un droit d''accès, de rectification, de suppression et d''opposition concernant vos données personnelles.</p>
   <h2>5. Contact</h2>
   <p>Pour exercer vos droits, contactez-nous à l''adresse : [email]</p>',
   true)
on conflict do nothing;

insert into public.footer_links (title, slug, section, sort_order, content, is_active) 
values
  ('Paramétrez les cookies', 'parametrez-les-cookies', 'legal', 40,
   '<h1>Paramétrez les cookies</h1>
   <h2>1. Qu''est-ce qu''un cookie ?</h2>
   <p>Un cookie est un petit fichier texte déposé sur votre terminal lors de la visite d''un site.</p>
   <h2>2. Types de cookies utilisés</h2>
   <p>MecaniDoc.com utilise différents types de cookies :</p>
   <ul>
     <li><strong>Cookies techniques</strong> : nécessaires au fonctionnement du site</li>
     <li><strong>Cookies analytiques</strong> : pour analyser l''utilisation du site</li>
     <li><strong>Cookies publicitaires</strong> : pour personnaliser les publicités</li>
   </ul>
   <h2>3. Gestion des cookies</h2>
   <p>Vous pouvez accepter ou refuser les cookies via les paramètres de votre navigateur.</p>
   <h2>4. Cookies tiers</h2>
   <p>Certains cookies sont déposés par des services tiers (Google Analytics, etc.).</p>',
   true)
on conflict do nothing;

-- Adicionar conteúdo padrão para links existentes que não têm conteúdo
update public.footer_links 
set content = '<h1>' || title || '</h1>
<p>Cette page est en cours de rédaction. Le contenu sera bientôt disponible.</p>
<p>MecaniDoc.com s''engage à vous fournir des informations complètes et à jour.</p>'
where (content is null or content = '') and slug is not null and slug != '';

-- Adicionar slugs e conteúdo padrão para links que ainda não têm
update public.footer_links 
set slug = 'assurance-crevaison',
    content = '<h1>Assurance crevaison</h1>
<p>Protégez-vous contre les imprévus de la route avec notre assurance crevaison.</p>
<h2>Avantages</h2>
<ul>
  <li>Remplacement rapide en cas de crevaison</li>
  <li>Assistance 24/7</li>
  <li>Couverture étendue</li>
</ul>'
where title = 'Assurance crevaison' and (slug is null or slug = '');

update public.footer_links 
set slug = 'guide-des-pneus',
    content = '<h1>Guide des pneus</h1>
<p>Découvrez notre guide complet pour choisir les pneus adaptés à votre véhicule.</p>
<h2>Conseils d''achat</h2>
<ul>
  <li>Comment choisir la bonne dimension</li>
  <li>Comprendre les indices de charge et de vitesse</li>
  <li>Pneus été vs hiver vs 4 saisons</li>
</ul>'
where title = 'Guide des pneus' and (slug is null or slug = '');

update public.footer_links 
set slug = 'besoin-d-aide',
    content = '<h1>Besoin d''aide ?</h1>
<p>Notre équipe est à votre disposition pour répondre à toutes vos questions.</p>
<h2>Contactez-nous</h2>
<p>Email : support@mecanidoc.com</p>
<p>Téléphone : [Numéro]</p>
<p>Horaires : Du lundi au vendredi, 9h-18h</p>'
where title = 'Besoin d''aide ?' and (slug is null or slug = '');

update public.footer_links 
set slug = 'garantie-pneus',
    content = '<h1>Garantie pneus</h1>
<p>MecaniDoc.com vous garantit la qualité de tous ses produits.</p>
<h2>Garantie constructeur</h2>
<p>Tous nos pneus bénéficient de la garantie du constructeur.</p>
<h2>Garantie MecaniDoc</h2>
<p>En cas de problème, nous remplaçons ou remboursons votre pneu.</p>'
where title = 'Garantie pneus' and (slug is null or slug = '');

update public.footer_links 
set slug = 'devenez-affilie',
    content = '<h1>Devenez affilié</h1>
<p>Rejoignez notre programme d''affiliation et gagnez des commissions.</p>
<h2>Avantages</h2>
<ul>
  <li>Commissions attractives</li>
  <li>Outils de suivi performants</li>
  <li>Support dédié</li>
</ul>
<h2>Comment s''inscrire ?</h2>
<p>Contactez-nous à l''adresse : affiliation@mecanidoc.com</p>'
where title = 'Devenez affilié' and (slug is null or slug = '');

update public.footer_links 
set slug = 'qui-sommes-nous',
    content = '<h1>Qui sommes-nous ?</h1>
<p>MecaniDoc.com est votre spécialiste en pneus en ligne.</p>
<h2>Notre mission</h2>
<p>Vous offrir les meilleurs pneus au meilleur prix, avec un service client irréprochable.</p>
<h2>Nos valeurs</h2>
<ul>
  <li>Qualité</li>
  <li>Fiabilité</li>
  <li>Service client</li>
</ul>'
where title = 'Qui sommes-nous?' and (slug is null or slug = '');
