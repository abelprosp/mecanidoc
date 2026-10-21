-- Marca produtos existentes com EAN para integração Neumáticos Andrés.
-- Execute APÓS create_neumaticos_andres_integration.sql
--
-- Ajuste o filtro WHERE conforme o seu catálogo (marca, categoria, etc.)

-- Pré-visualizar quantos serão afetados:
-- select count(*) from public.products where ean is not null and trim(ean) <> '' and external_supplier is null;

update public.products
set external_supplier = 'neumaticos_andres'
where ean is not null
  and trim(ean) <> ''
  and (external_supplier is null or external_supplier = '');

-- Verificar:
-- select count(*) from public.products where external_supplier = 'neumaticos_andres';
