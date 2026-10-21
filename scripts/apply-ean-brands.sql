-- Aplica marca/nome a partir do prefixo EAN (a API Andrés não envia marca).
-- Só altera produtos genéricos (sem marca ou nome "Pneu NA Ref.").

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('4019238', 'Continental', 'Auto'),
      ('4024068', 'Continental', 'Auto'),
      ('4038526', 'Continental', 'Auto'),
      ('4050496', 'Continental', 'Auto'),
      ('8808956', 'Nexen', 'Auto'),
      ('8807622', 'Hankook', 'Auto'),
      ('8808563', 'Kumho', 'Auto'),
      ('8590341', 'Barum', 'Auto'),
      ('6959956', 'Triangle', 'Auto'),
      ('6950306', 'Linglong', 'Auto'),
      ('8903635', 'MRF', 'Auto'),
      ('3528703', 'Kleber', 'Auto'),
      ('8019227', 'Pirelli', 'Auto'),
      ('3286340', 'Sava', 'Auto'),
      ('5420068', 'Giti', 'Auto'),
      ('5600944', 'Falken', 'Auto'),
      ('3831126', 'Mitas', 'Moto'),
      ('3831127', 'Mitas', 'Moto'),
      ('4029234', 'Metzeler', 'Moto'),
      ('545200', 'Dunlop', 'Moto'),
      ('869063', 'Heidenau', 'Moto'),
      ('546425', 'Goodyear', 'Camion'),
      ('328773', 'Bridgestone', 'Camion'),
      ('900224', 'Semperit', 'Camion'),
      ('871234', 'Michelin', 'Camion'),
      ('570425', 'Fulda', 'Camion'),
      ('890801', 'BKT', 'Tracteur'),
      ('890874', 'BKT', 'Tracteur'),
      ('735002', 'Trelleborg', 'Tracteur'),
      ('735004', 'Trelleborg', 'Tracteur'),
      ('401964', 'Alliance', 'Tracteur'),
      ('890309', 'CEAT', 'Tracteur'),
      ('869069', 'Mitas', 'Tracteur'),
      ('403234', 'Continental', 'Auto'),
      ('401923', 'Continental', 'Auto'),
      ('880762', 'Hankook', 'Auto'),
      ('880856', 'Kumho', 'Auto'),
      ('859034', 'Barum', 'Auto'),
      ('695030', 'Linglong', 'Auto'),
      ('693388', 'Sailun', 'Auto'),
      ('697190', 'Goodride', 'Auto'),
      ('697654', 'Westlake', 'Auto'),
      ('352870', 'Michelin', 'Auto'),
      ('801922', 'Pirelli', 'Auto'),
      ('328634', 'Sava', 'Auto'),
      ('496881', 'Yokohama', 'Auto'),
      ('498191', 'Toyo', 'Auto'),
      ('641944', 'Nokian', 'Auto'),
      ('471778', 'Maxxis', 'Auto'),
      ('383', 'Mitas', 'Moto')
    ) as t(prefix, brand, category)
    order by length(t.prefix) desc
  loop
    update public.products p
       set brand = r.brand,
           category = coalesce(nullif(trim(p.category), ''), r.category),
           name = r.brand || ' · EAN ' || regexp_replace(coalesce(p.ean, ''), '\D', '', 'g'),
           description = 'Pneu ' || r.brand || '. EAN ' || regexp_replace(coalesce(p.ean, ''), '\D', '', 'g')
                      || case when p.external_product_id is not null
                              then ' · réf. Andrés ' || p.external_product_id else '' end
     where p.ean is not null
       and regexp_replace(p.ean, '\D', '', 'g') like r.prefix || '%'
       and (
         p.brand is null
         or trim(p.brand) = ''
         or p.name ilike 'pneu na %'
         or p.name ilike 'pneu na ref%'
         or p.name ilike 'pneu exemplo%'
       );
  end loop;
end
$$;

-- Sem EAN reconhecido: pelo menos tira o "Pneu NA Ref." e usa a ref Andrés
update public.products
   set name = 'Pneu · réf. ' || external_product_id
 where (name ilike 'pneu na %' or name ilike 'pneu na ref%')
   and external_product_id is not null
   and trim(external_product_id) <> '';

select brand, count(*) from public.products group by brand order by 2 desc;
