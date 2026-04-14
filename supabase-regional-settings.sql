create table if not exists public.regional_settings (
  id uuid primary key default gen_random_uuid(),
  region text not null unique,
  itp_percentage numeric not null default 10.0,
  itp_progressive jsonb,
  ajd_percentage numeric not null default 1.5,
  iva_percentage numeric not null default 10.0,
  notary_min numeric not null default 600,
  notary_max numeric not null default 2500,
  notary_percentage numeric not null default 0.3,
  registro_min numeric not null default 400,
  registro_max numeric not null default 1500,
  registro_percentage numeric not null default 0.2,
  lawyer_percentage numeric not null default 1.0,
  lawyer_minimum numeric not null default 1500,
  mortgage_tax_percentage numeric,
  average_rental_yield numeric,
  property_tax_percentage numeric not null default 0.5,
  community_fees_avg_monthly numeric not null default 150,
  updated_at timestamptz not null default now()
);

alter table public.regional_settings enable row level security;
create policy "regional_settings_all" on public.regional_settings for all using (true) with check (true);

insert into public.regional_settings (region, itp_percentage, ajd_percentage, itp_progressive, average_rental_yield, community_fees_avg_monthly) values
  ('Costa Brava', 10.0, 1.5, null, 5.0, 150),
  ('Costa Dorada', 10.0, 1.5, null, 5.5, 130),
  ('Valencia', 10.0, 1.5, '[{"threshold": 1000000, "rate": 10.0}, {"threshold": null, "rate": 11.0}]', 6.0, 120),
  ('Costa Blanca Noord', 10.0, 1.5, '[{"threshold": 1000000, "rate": 10.0}, {"threshold": null, "rate": 11.0}]', 5.5, 140),
  ('Costa del Sol', 7.0, 1.2, null, 5.0, 180)
on conflict (region) do nothing;
