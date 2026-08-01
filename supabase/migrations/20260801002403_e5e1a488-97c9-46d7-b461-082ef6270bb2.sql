
-- ============ enums ============
create type public.role_mode as enum ('buyer','reseller');
create type public.record_source_type as enum ('affiliate_api','partner_api','user_input','public_api','manual');
create type public.pipeline_status as enum ('watch','researching','source_now','acquired','listed','sold','passed');

-- ============ shared trigger ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  default_role public.role_mode not null default 'buyer',
  currency_code text not null default 'USD',
  country_code text not null default 'US',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ catalog ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id),
  name text not null,
  slug text not null unique,
  attribute_schema jsonb not null default '{}'::jsonb
);
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  website_url text
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  canonical_name text not null,
  slug text not null unique,
  description text,
  specs jsonb not null default '{}'::jsonb,
  image_url text,
  identity_confidence numeric(4,3) not null default 0.9,
  created_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  sku_or_mpn text,
  gtin text,
  attributes jsonb not null default '{}'::jsonb,
  canonical_key text not null unique,
  image_url text
);
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text,
  source_type public.record_source_type not null,
  terms_url text,
  attribution_text text,
  active boolean not null default true,
  refresh_policy text
);
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id),
  variant_id uuid references public.product_variants(id) on delete cascade,
  external_url text,
  title text not null,
  condition_grade text not null default 'used_good',
  condition_notes text,
  item_price numeric(12,2) not null,
  shipping_price numeric(12,2) not null default 0,
  estimated_tax numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  seller_name text,
  seller_rating numeric(4,3),
  availability text not null default 'in_stock',
  location_text text,
  listing_url text,
  listed_at timestamptz,
  retrieved_at timestamptz not null default now(),
  match_confidence numeric(4,3) not null default 0.8,
  is_active boolean not null default true
);
create table public.sale_comps (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id),
  variant_id uuid references public.product_variants(id) on delete cascade,
  title text not null,
  condition_grade text not null default 'used_good',
  sold_price numeric(12,2) not null,
  shipping_paid numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  sold_at timestamptz not null,
  sale_url text,
  match_confidence numeric(4,3) not null default 0.85,
  is_verified_completed_sale boolean not null default true
);
create table public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  region_code text not null default 'US',
  period_start date not null,
  period_end date not null,
  active_listing_count int not null default 0,
  completed_sale_count int not null default 0,
  median_sold_price numeric(12,2),
  mean_sold_price numeric(12,2),
  low_sold_price numeric(12,2),
  high_sold_price numeric(12,2),
  days_to_sell_estimate int,
  data_confidence numeric(4,3) not null default 0.7,
  computed_at timestamptz not null default now()
);

grant select on public.categories, public.brands, public.products, public.product_variants,
  public.data_sources, public.offers, public.sale_comps, public.market_snapshots to anon, authenticated;
grant all on public.categories, public.brands, public.products, public.product_variants,
  public.data_sources, public.offers, public.sale_comps, public.market_snapshots to service_role;

alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.data_sources enable row level security;
alter table public.offers enable row level security;
alter table public.sale_comps enable row level security;
alter table public.market_snapshots enable row level security;

create policy "public read" on public.categories for select to anon, authenticated using (true);
create policy "public read" on public.brands for select to anon, authenticated using (true);
create policy "public read" on public.products for select to anon, authenticated using (true);
create policy "public read" on public.product_variants for select to anon, authenticated using (true);
create policy "public read" on public.data_sources for select to anon, authenticated using (true);
create policy "public read" on public.offers for select to anon, authenticated using (true);
create policy "public read" on public.sale_comps for select to anon, authenticated using (true);
create policy "public read" on public.market_snapshots for select to anon, authenticated using (true);

-- ============ workspace ============
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  raw_query text not null,
  parsed_intent jsonb not null default '{}'::jsonb,
  role_mode public.role_mode not null default 'buyer',
  created_at timestamptz not null default now()
);
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  role_mode public.role_mode not null default 'buyer',
  created_at timestamptz not null default now()
);
create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  note text,
  target_price numeric(12,2),
  created_at timestamptz not null default now()
);
create table public.deal_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  label text,
  input jsonb not null default '{}'::jsonb,
  expected_sale_low numeric(12,2),
  expected_sale_mid numeric(12,2),
  expected_sale_high numeric(12,2),
  net_proceeds numeric(12,2),
  profit numeric(12,2),
  roi_pct numeric(8,2),
  days_to_sell_estimate int,
  score int,
  confidence numeric(4,3),
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  source_evaluation_id uuid references public.deal_evaluations(id) on delete set null,
  title text not null,
  status public.pipeline_status not null default 'watch',
  quantity int not null default 1,
  cost_basis numeric(12,2),
  acquired_at timestamptz,
  condition_grade text,
  storage_location text,
  listed_price numeric(12,2),
  sold_price numeric(12,2),
  sold_at timestamptz,
  actual_profit numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  query text not null,
  role_mode public.role_mode not null default 'buyer',
  answer_markdown text,
  structured_output jsonb not null default '{}'::jsonb,
  model_name text,
  created_at timestamptz not null default now()
);
create table public.research_evidence (
  id uuid primary key default gen_random_uuid(),
  research_report_id uuid not null references public.research_reports(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  url text,
  title text,
  excerpt text,
  evidence_type text,
  retrieved_at timestamptz,
  supports_claim text
);
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  saved_search jsonb not null default '{}'::jsonb,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  channel text not null default 'in_app',
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  entity_type text not null,
  entity_id uuid,
  reason text not null,
  detail text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.searches, public.watchlists, public.watchlist_items,
  public.deal_evaluations, public.inventory_items, public.research_reports, public.research_evidence,
  public.alerts, public.feedback to authenticated;
grant all on public.searches, public.watchlists, public.watchlist_items, public.deal_evaluations,
  public.inventory_items, public.research_reports, public.research_evidence, public.alerts,
  public.feedback to service_role;

alter table public.searches enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.deal_evaluations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.research_reports enable row level security;
alter table public.research_evidence enable row level security;
alter table public.alerts enable row level security;
alter table public.feedback enable row level security;

create policy "own rows" on public.searches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.watchlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.watchlist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.deal_evaluations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.inventory_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.research_reports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.research_evidence for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.alerts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger inventory_updated_at before update on public.inventory_items for each row execute function public.update_updated_at_column();

-- ============ seed ============
insert into public.categories (id, name, slug, attribute_schema) values
 ('11111111-0000-4000-8000-000000000001','Cameras','cameras','{"fields":["condition","shutter_count","kit"]}'),
 ('11111111-0000-4000-8000-000000000002','Collectibles','collectibles','{"fields":["condition","sealed","edition"]}'),
 ('11111111-0000-4000-8000-000000000003','Laptops','laptops','{"fields":["condition","storage","memory","battery_cycles"]}'),
 ('11111111-0000-4000-8000-000000000004','Consoles','consoles','{"fields":["condition","bundle","region"]}'),
 ('11111111-0000-4000-8000-000000000005','Guitars','guitars','{"fields":["condition","year","case"]}');

insert into public.brands (id, name, normalized_name, website_url) values
 ('22222222-0000-4000-8000-000000000001','Sony','sony','https://sony.com'),
 ('22222222-0000-4000-8000-000000000002','LEGO','lego','https://lego.com'),
 ('22222222-0000-4000-8000-000000000003','Apple','apple','https://apple.com'),
 ('22222222-0000-4000-8000-000000000004','Nintendo','nintendo','https://nintendo.com'),
 ('22222222-0000-4000-8000-000000000005','Fender','fender','https://fender.com');

insert into public.products (id, category_id, brand_id, canonical_name, slug, description, specs, identity_confidence) values
 ('33333333-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','Sony Alpha A7 IV (ILCE-7M4)','sony-a7-iv','Full-frame 33MP hybrid mirrorless body.','{"sensor":"33MP full-frame","mount":"Sony E","video":"4K 60p","weight_g":658}',0.97),
 ('33333333-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000002','LEGO Icons Eiffel Tower 10307','lego-10307-eiffel-tower','10,001-piece Icons display set.','{"pieces":10001,"released":"2022","retail_usd":629.99}',0.99),
 ('33333333-0000-4000-8000-000000000003','11111111-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000003','Apple MacBook Air 13" M2','macbook-air-13-m2','M2 8-core CPU ultraportable.','{"cpu":"Apple M2","display":"13.6in Liquid Retina","ports":"2x TB4"}',0.96),
 ('33333333-0000-4000-8000-000000000004','11111111-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000004','Nintendo Switch OLED','nintendo-switch-oled','7-inch OLED hybrid console.','{"screen":"7in OLED","storage":"64GB"}',0.95),
 ('33333333-0000-4000-8000-000000000005','11111111-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000005','Fender Player Stratocaster MIM','fender-player-stratocaster','Mexico-built Player Series Strat.','{"body":"Alder","pickups":"Player Series Alnico V","country":"Mexico"}',0.92);

insert into public.product_variants (id, product_id, title, sku_or_mpn, gtin, attributes, canonical_key) values
 ('44444444-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','A7 IV Body Only','ILCE7M4/B','027242923478','{"kit":"body_only","color":"black"}','sony-a7-iv:body'),
 ('44444444-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000001','A7 IV + 28-70mm Kit','ILCE7M4K/B','027242923485','{"kit":"28-70mm","color":"black"}','sony-a7-iv:kit-28-70'),
 ('44444444-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000002','10307 Sealed Retail Box','10307','673419357944','{"sealed":true}','lego-10307:sealed'),
 ('44444444-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000003','M2 / 8GB / 256GB Midnight','MLY33LL/A','194253081074','{"memory":"8GB","storage":"256GB","color":"midnight"}','mba13-m2:8-256-midnight'),
 ('44444444-0000-4000-8000-000000000005','33333333-0000-4000-8000-000000000003','M2 / 16GB / 512GB Starlight','Z15Y','194253081081','{"memory":"16GB","storage":"512GB","color":"starlight"}','mba13-m2:16-512-starlight'),
 ('44444444-0000-4000-8000-000000000006','33333333-0000-4000-8000-000000000004','Switch OLED White Joy-Con','HEGSKAAAA','045496882686','{"color":"white"}','switch-oled:white'),
 ('44444444-0000-4000-8000-000000000007','33333333-0000-4000-8000-000000000005','Player Strat SSS Maple Neck','0144502506','885978619009','{"neck":"maple","pickups":"SSS","color":"3-color sunburst"}','player-strat:sss-maple');

insert into public.data_sources (id, name, base_url, source_type, terms_url, attribution_text, refresh_policy) values
 ('55555555-0000-4000-8000-000000000001','Demo Marketplace Feed','https://demo.marketplace.example','partner_api','https://demo.marketplace.example/terms','Demo partner feed (synthetic data)','hourly'),
 ('55555555-0000-4000-8000-000000000002','Demo Completed Sales Index','https://demo.comps.example','public_api','https://demo.comps.example/terms','Demo completed-sale index (synthetic data)','daily'),
 ('55555555-0000-4000-8000-000000000003','Manual Entry','','manual',null,'Entered by the user','on_demand');

insert into public.offers (data_source_id, variant_id, title, condition_grade, condition_notes, item_price, shipping_price, estimated_tax, seller_name, seller_rating, availability, location_text, listing_url, listed_at, match_confidence)
values
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','Sony A7 IV body, 4k actuations','used_excellent','Box and two batteries included.',1649.00,0,0,'NorthLightCameras',0.982,'in_stock','Portland, OR','https://demo.marketplace.example/l/a7iv-1',now()-interval '2 days',0.96),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','A7 IV body only - open box','open_box','Retail demo unit, full warranty.',1899.00,0,152.00,'BigBoxOutlet',0.941,'in_stock','Newark, NJ','https://demo.marketplace.example/l/a7iv-2',now()-interval '5 hours',0.99),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','Sony a7IV - shutter 41k','used_good','Heavy use, grip wear.',1425.00,35.00,0,'gear_flipper88',0.874,'in_stock','Tampa, FL','https://demo.marketplace.example/l/a7iv-3',now()-interval '9 days',0.88),
 ('55555555-0000-4000-8000-000000000002','44444444-0000-4000-8000-000000000002','A7 IV with 28-70 kit lens','used_excellent','Kit lens unused.',1899.00,25.00,0,'StudioClearance',0.958,'in_stock','Chicago, IL','https://demo.marketplace.example/l/a7ivk-1',now()-interval '1 day',0.93),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000003','LEGO 10307 Eiffel Tower sealed','new_sealed','Factory sealed, minor shelf wear.',529.00,0,42.30,'BrickVaultUS',0.996,'in_stock','Columbus, OH','https://demo.marketplace.example/l/10307-1',now()-interval '3 days',0.99),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000003','Eiffel Tower 10307 NISB','new_sealed','Retired set, sealed.',612.00,29.00,0,'setsandsealed',0.913,'low_stock','Reno, NV','https://demo.marketplace.example/l/10307-2',now()-interval '11 hours',0.97),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000004','MacBook Air M2 256GB midnight','used_excellent','38 battery cycles.',739.00,18.00,0,'MacResaleCo',0.967,'in_stock','Austin, TX','https://demo.marketplace.example/l/mba-1',now()-interval '4 days',0.94),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000004','MacBook Air 13 M2 - refurb','refurbished','Certified refurb, 1yr warranty.',829.00,0,66.30,'CertifiedRefurb',0.988,'in_stock','Sacramento, CA','https://demo.marketplace.example/l/mba-2',now()-interval '20 hours',0.99),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000005','MBA M2 16/512 starlight','used_good','Small lid scuff.',949.00,0,0,'campusgear',0.842,'in_stock','Boulder, CO','https://demo.marketplace.example/l/mba-3',now()-interval '6 days',0.9),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000006','Switch OLED white - complete','used_excellent','All accessories, original box.',248.00,12.00,0,'ConsoleCorner',0.951,'in_stock','Phoenix, AZ','https://demo.marketplace.example/l/sw-1',now()-interval '18 hours',0.95),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000006','Nintendo Switch OLED new','new_sealed','Sealed retail.',329.00,0,26.30,'BigBoxOutlet',0.941,'in_stock','Newark, NJ','https://demo.marketplace.example/l/sw-2',now()-interval '2 days',0.99),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000007','Fender Player Strat sunburst','used_good','Setup done, light fret wear.',589.00,45.00,0,'SixStringTrader',0.905,'in_stock','Nashville, TN','https://demo.marketplace.example/l/strat-1',now()-interval '7 days',0.91),
 ('55555555-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000007','Player Stratocaster w/ gig bag','used_excellent','Barely played, gig bag included.',679.00,0,54.30,'GuitarDepot',0.972,'in_stock','Denver, CO','https://demo.marketplace.example/l/strat-2',now()-interval '1 day',0.94);

insert into public.sale_comps (data_source_id, variant_id, title, condition_grade, sold_price, shipping_paid, sold_at, sale_url, match_confidence)
select '55555555-0000-4000-8000-000000000002', v.variant_id,
       v.title || ' (completed sale)',
       (array['used_good','used_excellent','new_sealed'])[1 + (g % 3)],
       round((v.base * (0.9 + ((g * 37 % 21)::numeric / 100)))::numeric, 2),
       (array[0,15,25])[1 + (g % 3)],
       now() - ((g * 6 + 3) || ' days')::interval,
       'https://demo.comps.example/s/' || v.variant_id || '-' || g,
       0.8 + ((g % 4)::numeric / 25)
from (values
  ('44444444-0000-4000-8000-000000000001'::uuid,'Sony A7 IV body',1720.00),
  ('44444444-0000-4000-8000-000000000002'::uuid,'Sony A7 IV kit',2020.00),
  ('44444444-0000-4000-8000-000000000003'::uuid,'LEGO 10307',690.00),
  ('44444444-0000-4000-8000-000000000004'::uuid,'MacBook Air M2 8/256',845.00),
  ('44444444-0000-4000-8000-000000000005'::uuid,'MacBook Air M2 16/512',1075.00),
  ('44444444-0000-4000-8000-000000000006'::uuid,'Switch OLED',292.00),
  ('44444444-0000-4000-8000-000000000007'::uuid,'Fender Player Strat',702.00)
) as v(variant_id,title,base), generate_series(1,9) as g;

insert into public.market_snapshots (variant_id, period_start, period_end, active_listing_count, completed_sale_count, median_sold_price, mean_sold_price, low_sold_price, high_sold_price, days_to_sell_estimate, data_confidence)
select c.variant_id,
       (current_date - 90), current_date,
       (array[38,12,54,96,31,140,64])[row_number() over (order by c.variant_id)],
       count(*)::int * 4,
       percentile_cont(0.5) within group (order by c.sold_price)::numeric(12,2),
       avg(c.sold_price)::numeric(12,2),
       min(c.sold_price), max(c.sold_price),
       (array[16,21,9,11,19,6,27])[row_number() over (order by c.variant_id)],
       0.72
from public.sale_comps c group by c.variant_id;
