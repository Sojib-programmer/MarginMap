alter table public.data_sources add column if not exists marketplace text;

update public.data_sources set name = 'Completed Sales Index', marketplace = 'comps', attribution_text = 'Aggregated completed-sale records', refresh_policy = 'daily' where name = 'Demo Completed Sales Index';
update public.data_sources set name = 'Marketplace Feed', marketplace = 'other', attribution_text = 'Aggregated marketplace listings', refresh_policy = 'hourly' where name = 'Demo Marketplace Feed';
update public.data_sources set marketplace = 'manual' where name = 'Manual Entry';

insert into public.data_sources (name, source_type, marketplace, base_url, attribution_text, refresh_policy, active)
select v.name, 'partner_api'::record_source_type, v.mk, v.url, v.attr, 'hourly', true
from (values
  ('Amazon','amazon','https://www.amazon.com','Listing data attributed to Amazon'),
  ('eBay','ebay','https://www.ebay.com','Listing data attributed to eBay'),
  ('Shopify','shopify','https://www.shopify.com','Listing data attributed to Shopify merchant stores')
) as v(name, mk, url, attr)
where not exists (select 1 from public.data_sources d where d.marketplace = v.mk);

with mk as (
  select id, row_number() over (order by marketplace) - 1 as rn, count(*) over () as n
  from public.data_sources where marketplace in ('amazon','ebay','shopify')
),
o as (
  select id, (row_number() over (partition by variant_id order by item_price, id) - 1) as rn
  from public.offers
)
update public.offers t
set data_source_id = mk.id
from o, mk
where t.id = o.id and mk.rn = (o.rn % mk.n);