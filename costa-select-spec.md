# Costa Select Valencia — Financieel Dashboard Platform

## Project Overview

Bouw een volledig werkende web-applicatie (Next.js + Supabase) als financieel dashboard voor Costa Select Valencia, een vastgoedmakelaarsbureau aan de Spaanse kust. De app vervangt hun huidige Google Sheet en voegt Pipedrive CRM-integratie toe.

**Tech stack:**
- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Database & storage:** Supabase (PostgreSQL + Storage voor bonnen/facturen)
- **Authenticatie:** Supabase Auth (email/password, minimaal 1-2 users)
- **Externe API:** Pipedrive REST API (leads, deals, activiteiten)
- **Hosting:** Vercel (met custom domain support)
- **Charts:** Recharts of Chart.js

**Design-richting:** Clean, professioneel, minimalistisch. Geen flashy animaties. Denk aan een premium SaaS-dashboard: veel whitespace, duidelijke hiërarchie, subtiele borders, goede typografie. Donkere sidebar, licht content-area. Responsive maar primair desktop-first (1280px+).

---

## Database Schema (Supabase / PostgreSQL)

### Tabel: `settings`
Vervangt het "Aannames" sheet. Key-value pairs voor alle configuratie.
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data:
INSERT INTO settings (key, value) VALUES
('minimum_fee', '6000'),
('makelaar_commissie_pct', '0.40'),
('partner_commissie_pct', '0.20'),
('commissie_per_type', '{"resale": 0.02, "nieuwbouw": 0.04, "invest": 0.03, "renovatie": 0.05}'),
('regios', '["CBN", "CBZ", "CDS", "CD", "CB", "Valencia"]'),
('deal_types', '["Resale", "Nieuwbouw", "Invest", "Renovatie"]'),
('bronnen', '["Website CS", "Website CSV", "Google Ads", "Meta Ads", "LinkedIn Ads", "Referentie van partner", "Referentie"]'),
('afspraak_types', '["Bezichtiging", "Kennismaking", "Follow-up", "Notaris"]'),
('targets', '{"deals_2026": 20, "netto_omzet_2026": 200000}'),
('pipedrive_sync_interval', '15'),
('pipedrive_activiteit_namen', '["afspraak Nederland", "afspraak online"]');
```

### Tabel: `makelaars`
```sql
CREATE TABLE makelaars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data:
INSERT INTO makelaars (naam) VALUES
('Thijs Kranenborg'), ('Ed Bouterse'), ('Danielle de Haan'),
('Denise van Scheppingen'), ('Marc Stam');
```

### Tabel: `deals`
De kern van het systeem. Blauwe velden = handmatige invoer, zwarte velden = auto-berekend.
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_nummer SERIAL,
  datum_passering DATE NOT NULL,
  regio TEXT NOT NULL,
  type_deal TEXT NOT NULL,
  bron TEXT NOT NULL,
  aankoopprijs NUMERIC(12,2) NOT NULL,
  commissie_pct NUMERIC(5,4), -- NULL = auto vanuit type
  min_fee_toegepast BOOLEAN DEFAULT false,
  bruto_commissie NUMERIC(10,2), -- auto-berekend
  makelaar_id UUID REFERENCES makelaars(id),
  makelaar_pct NUMERIC(5,4) DEFAULT 0,
  makelaar_commissie NUMERIC(10,2), -- auto-berekend
  partner_deal BOOLEAN DEFAULT false,
  partner_naam TEXT,
  partner_pct NUMERIC(5,4) DEFAULT 0,
  partner_commissie NUMERIC(10,2), -- auto-berekend
  netto_commissie_cs NUMERIC(10,2), -- auto-berekend
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Berekeningslogica voor deals (BELANGRIJK — implementeer dit als database trigger OF in de applicatie):**
1. `commissie_pct`: als NULL, pak standaard % uit `settings.commissie_per_type` op basis van `type_deal`
2. `bruto_commissie`: MAX(aankoopprijs × commissie_pct, minimum_fee uit settings). Als bruto_commissie == minimum_fee → zet `min_fee_toegepast` = true
3. `makelaar_commissie`: bruto_commissie × makelaar_pct
4. `partner_commissie`: als partner_deal = true → bruto_commissie × partner_pct, anders 0
5. `netto_commissie_cs`: bruto_commissie − makelaar_commissie − partner_commissie

### Tabel: `kosten_categorieen`
```sql
CREATE TABLE kosten_categorieen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  volgorde INT DEFAULT 0,
  actief BOOLEAN DEFAULT true
);

-- Seed:
INSERT INTO kosten_categorieen (naam, volgorde) VALUES
('Software', 1), ('Marketing & Ads', 2), ('Kantoor & faciliteiten', 3),
('Reis & transport', 4), ('Juridisch & administratie', 5), ('Overige kosten', 6);
```

### Tabel: `kosten_posten`
```sql
CREATE TABLE kosten_posten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES kosten_categorieen(id),
  naam TEXT NOT NULL,
  volgorde INT DEFAULT 0,
  actief BOOLEAN DEFAULT true
);

-- Seed (voorbeelden):
INSERT INTO kosten_posten (categorie_id, naam, volgorde) VALUES
-- Software:
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'ActiveCampaign', 1),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Buffer', 2),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Zapier', 3),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Slack Pro', 4),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Google Workspace', 5),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Website hosting', 6),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Apify', 7),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Manus', 8),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Claude', 9),
((SELECT id FROM kosten_categorieen WHERE naam = 'Software'), 'Overige software', 10),
-- Marketing & Ads:
((SELECT id FROM kosten_categorieen WHERE naam = 'Marketing & Ads'), 'Google Ads', 1),
((SELECT id FROM kosten_categorieen WHERE naam = 'Marketing & Ads'), 'Meta Ads (Facebook/Instagram)', 2),
((SELECT id FROM kosten_categorieen WHERE naam = 'Marketing & Ads'), 'LinkedIn Ads', 3),
((SELECT id FROM kosten_categorieen WHERE naam = 'Marketing & Ads'), 'Overige marketing', 4);
```

### Tabel: `maandkosten`
```sql
CREATE TABLE maandkosten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kosten_post_id UUID REFERENCES kosten_posten(id),
  jaar INT NOT NULL,
  maand INT NOT NULL CHECK (maand BETWEEN 1 AND 12),
  bedrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (kosten_post_id, jaar, maand)
);
```

### Tabel: `afspraken`
```sql
CREATE TABLE afspraken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  lead_naam TEXT NOT NULL,
  bron TEXT,
  regio TEXT,
  makelaar_id UUID REFERENCES makelaars(id),
  type TEXT DEFAULT 'Bezichtiging',
  status TEXT DEFAULT 'Gepland' CHECK (status IN ('Gepland', 'Uitgevoerd', 'No-show', 'Geannuleerd')),
  resultaat TEXT CHECK (resultaat IN (NULL, 'Interesse', 'Bod gedaan', 'Deal gewonnen', 'Afgewezen')),
  deal_id UUID REFERENCES deals(id), -- koppeling als het een deal is geworden
  notities TEXT,
  pipedrive_activiteit_id BIGINT UNIQUE, -- voor deduplicatie bij Pipedrive sync
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabel: `bonnen`
```sql
CREATE TABLE bonnen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  bedrag NUMERIC(10,2) NOT NULL,
  btw_bedrag NUMERIC(10,2),
  omschrijving TEXT,
  categorie_id UUID REFERENCES kosten_categorieen(id),
  kosten_post_id UUID REFERENCES kosten_posten(id),
  bestandsnaam TEXT NOT NULL,
  bestandspad TEXT NOT NULL, -- pad in Supabase Storage
  bestandstype TEXT, -- 'pdf', 'jpg', 'png'
  bestandsgrootte INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabel: `commissie_uitbetalingen`
```sql
CREATE TABLE commissie_uitbetalingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  makelaar_id UUID REFERENCES makelaars(id),
  bedrag NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Uitbetaald')),
  uitbetaald_op DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Pagina's & Functionaliteit

### 1. Sidebar (altijd zichtbaar)
- Logo/naam: "Costa Select Valencia" met subtitle "Financieel dashboard"
- Navigatie-items met gekleurde dots:
  - Dashboard (blauw)
  - Deals (groen)
  - Afspraken (paars)
  - Maandkosten (oranje/koraal)
  - Bonnen & facturen (groen)
  - P&L (paars)
  - Commissies (roze)
  - Pipedrive (amber)
  - Aannames (grijs)
- Active state: lichtblauwe achtergrond
- Donkere sidebar achtergrond

### 2. Dashboard (`/`)
Volledig auto-berekend, geen invoer. Toont:

**Kerngetallen (KPI cards, 2 rijen van 3):**
- Totaal aantal deals (count uit deals-tabel)
- Totale aankoopwaarde (SUM aankoopprijs)
- Bruto commissie (SUM bruto_commissie)
- Netto omzet CS (SUM netto_commissie_cs)
- Kosten YTD (SUM alle maandkosten voor huidig jaar)
- Brutowinst YTD (netto omzet - kosten)

**Gemiddelden per deal (3 KPI cards):**
- Gem. aankoopprijs
- Gem. bruto commissie
- Netto marge % (netto omzet / bruto commissie)

**Targets & prognose:**
- Voortgangsbalk: "X van Y deals" met percentage en on-track indicator
- Voortgangsbalk: "€X van €Y netto omzet"
- Prognose op basis van huidige run rate: "Op dit tempo: Z deals eind jaar"

**Charts:**
- Staafdiagram: omzet per maand (netto omzet CS)
- Lijndiagram: cumulatief resultaat door het jaar
- Maandoverzicht tabel: maand | deals | omzet | kosten | winst

**Geavanceerde KPI's (extra rij):**
- LTV:CAC ratio (gem. netto omzet per deal / gem. acquisitiekosten per deal)
- CAC (totale marketing spend / aantal deals)
- ROAS per kanaal (omzet uit bron / spend op dat kanaal)
- Conversie lead → deal %

### 3. Deals (`/deals`)
**Invoerformulier bovenaan:**
- Datum passering (date picker)
- Regio (dropdown uit settings)
- Type deal (dropdown uit settings)
- Bron (dropdown uit settings)
- Aankoopprijs (currency input)
- Commissie % (optioneel — als leeg, auto vanuit type)
- Makelaar (dropdown uit makelaars-tabel)
- Makelaar % (number input, 0-100)
- Partner deal? (toggle)
- Partner naam (text, verschijnt als partner_deal = true)
- Partner % (number input, verschijnt als partner_deal = true)
- Notities (text)
- Knop: "Deal opslaan"

**Deals tabel eronder:**
- Alle deals, nieuwste eerst
- Kolommen: #, Datum, Regio, Type, Bron, Prijs, Bruto comm., Makelaar, Netto CS, Notities
- Inline editing mogelijk
- Verwijder-optie per rij

### 4. Afspraken (`/afspraken`)
**Volledige funnel bovenaan (auto-berekend):**
- Visuele funnel: Leads (uit Pipedrive) → Afspraken → Deals
- Conversie percentages per stap

**KPI cards (2 rijen van 3):**
- Lead → afspraak %
- Afspraak → deal %
- Lead → deal %
- Kosten per afspraak (totale ad spend / aantal afspraken)
- Kosten per deal (totale ad spend / aantal deals)
- LTV:CAC ratio

**Analytics tabellen (auto-berekend):**
- Kosten per afspraak per bron (bron | leads | afspraken | deals | ad spend | kosten/afspraak | kosten/deal | ROAS)
- Kosten per afspraak per regio (regio | afspraken | deals | close % | gem. dealwaarde | kosten/afspraak)
- Afspraken per makelaar (makelaar | afspraken | deals | close % | omzet)
- Leads niet omgezet naar afspraak per bron
- Leads niet omgezet naar afspraak per regio

**Invoerformulier:**
- Datum afspraak
- Lead / klantnaam (text met autocomplete)
- Bron (dropdown)
- Regio (dropdown)
- Makelaar (dropdown)
- Type (Bezichtiging, Kennismaking, Follow-up, Notaris)
- Status (Gepland, Uitgevoerd, No-show, Geannuleerd)
- Resultaat (-, Interesse, Bod gedaan, Deal gewonnen, Afgewezen)
- Notities
- Knop: "Afspraak opslaan"

**Recente afspraken tabel**

### 5. Maandkosten (`/maandkosten`)
**Bewerkbare tabel per categorie:**
- Rijen = kostenposten (gegroepeerd per categorie)
- Kolommen = Jan t/m Dec + Jaar totaal
- Elke cel is klikbaar en bewerkbaar
- Subtotalen per categorie (auto)
- Totaalrij onderaan (auto)
- "+" knop onder elke categorie om nieuwe kostenpost toe te voegen
- "+" knop om nieuwe categorie toe te voegen

### 6. Bonnen & Facturen (`/bonnen`)
**Kwartaal-export bar bovenaan:**
- Dropdown: Q1/Q2/Q3/Q4 + jaar
- "Download ZIP" knop
- Overzicht: "Q1: X bestanden, Y MB"

**Kwartaal-samenvatting (4 cards):**
- Q1 t/m Q4: aantal bestanden per kwartaal

**Upload zone:**
- Drag & drop of klik om te uploaden
- Accepteert PDF, JPG, PNG (max 10 MB)
- Opslag in Supabase Storage bucket "bonnen"

**Labeling na upload:**
- Datum bon/factuur
- Bedrag (€)
- BTW bedrag (€)
- Omschrijving
- Categorie (dropdown uit kosten_categorieen)
- Kostenpost (dropdown, filtert op gekozen categorie)

**Bestandenlijst:**
- Per bestand: icoon (PDF/JPG/PNG), bestandsnaam, datum, bedrag, BTW, tags (categorie + kostenpost)
- Klikbaar om preview te openen
- Filter op kwartaal, categorie, kostenpost

**ZIP export functionaliteit:**
- Server-side: haal alle bonnen van geselecteerd kwartaal op
- Download alle bestanden uit Supabase Storage
- Genereer Excel-overzicht (datum, bedrag, BTW, omschrijving, categorie, kostenpost, bestandsnaam)
- Bundel alles in ZIP en stuur naar client

### 7. P&L (`/pl`)
Volledig auto-berekend. Geen invoer.

**Omzet sectie (tabel, kolommen = maanden + totaal):**
- Aantal deals per maand
- Totale aankoopwaarde per maand
- Bruto commissie per maand
- Makelaar commissie per maand
- Partner commissie per maand
- **Netto omzet Costa Select per maand**

**Kosten sectie:**
- Totale maandkosten per maand (uit maandkosten-tabel)

**Resultaat sectie:**
- Brutowinst per maand (netto omzet - kosten)
- Winstmarge % per maand
- Cumulatief resultaat per maand

Kleur: positieve winst = groen, negatief = rood.

### 8. Commissies (`/commissies`)
Grotendeels auto-berekend vanuit deals.

**Totaaloverzicht per makelaar (tabel):**
- Makelaar | Deals | Aankoopwaarde | Bruto commissie | Makelaar commissie | Gem. per deal | % van totaal deals

**Commissie per maand (tabel):**
- Rijen = makelaars, kolommen = maanden + totaal

**Uitbetaalstatus (tabel + handmatige invoer):**
- Makelaar | Deal | Bedrag | Status (Open/Uitbetaald) | Datum uitbetaald
- Status is klikbaar om te wijzigen

### 9. Pipedrive (`/pipedrive`)
Data wordt opgehaald via Pipedrive REST API.

**Lead funnel (visueel):**
- Toon pipeline stages met aantallen

**KPI cards:**
- Conversie % (deals won / total leads)
- Gem. doorlooptijd (dagen van lead creation tot deal won)
- Pipeline waarde (som van alle open deals)

**Leads per bron (tabel)**
**Leads per makelaar (tabel)**
**Deals per bron (tabel)**
**Deals per makelaar (tabel)**

### 10. Aannames (`/aannames`)
Alles is bewerkbaar en slaat op naar de settings-tabel.

**Commissie-instellingen:**
- Minimum fee (€)
- Makelaar commissie %
- Partner commissie %

**Standaard commissie % per type:**
- Resale, Nieuwbouw, Invest, Renovatie

**Targets 2026:**
- Doel aantal deals
- Doel netto omzet

**Dynamische lijsten (toevoegen/verwijderen):**
- Regio's
- Makelaars
- Bronnen
- Afspraak types
- Kosten categorieën & kostenposten

**Pipedrive-koppeling:**
- API key (password field)
- Sync interval (dropdown)
- Activiteitsnamen voor auto-import afspraken

---

## Pipedrive Integratie

### API Configuratie
- Base URL: `https://api.pipedrive.com/v1`
- Auth: API token als query parameter `?api_token=xxx`
- API key wordt opgeslagen in Supabase (settings tabel, encrypted) of als environment variable

### Data ophalen (server-side, Next.js API routes of server actions)
1. **Leads/Persons:** `GET /persons` — alle contactpersonen
2. **Deals:** `GET /deals` — alle deals met stages
3. **Pipelines & stages:** `GET /pipelines` en `GET /stages` — voor funnel visualisatie
4. **Activiteiten:** `GET /activities?type=afspraak&done=1` — voltooide activiteiten

### Webhook voor auto-import afspraken
Maak een Next.js API route: `POST /api/pipedrive/webhook`

**Flow:**
1. Pipedrive stuurt webhook bij "activity updated" (marked as done)
2. API route ontvangt de payload
3. Check: is `activity.subject` gelijk aan "afspraak Nederland" of "afspraak online"? (uit settings)
4. Zo ja: maak nieuwe afspraak-record aan met:
   - datum = activity.due_date
   - lead_naam = gekoppelde person name
   - makelaar_id = match op activity.user (Pipedrive user → makelaar mapping in settings)
   - status = 'Uitgevoerd'
   - pipedrive_activiteit_id = activity.id (voor deduplicatie)
5. Stuur 200 OK terug

**Setup instructie voor gebruiker:**
In Pipedrive → Settings → Webhooks → voeg toe:
- Event: `updated.activity`
- URL: `https://jouw-domein.com/api/pipedrive/webhook`

### Periodieke sync (als fallback)
- Cron job of Vercel Cron: elke X minuten (instelbaar)
- Haal recent voltooide activiteiten op
- Check of pipedrive_activiteit_id al bestaat (deduplicatie)
- Importeer nieuwe afspraken

---

## Berekeningen & Business Logic

### Ad spend per bron berekenen
Om ROAS en kosten per afspraak per bron te berekenen, moeten we ad spend per bron weten:
- Google Ads spend = SUM maandkosten WHERE kostenpost = 'Google Ads'
- Meta Ads spend = SUM maandkosten WHERE kostenpost = 'Meta Ads (Facebook/Instagram)'
- LinkedIn Ads spend = SUM maandkosten WHERE kostenpost = 'LinkedIn Ads'
- Overige bronnen (Website CS, Referentie) = €0 spend

Maak een mapping in settings: `bron_kostenpost_mapping` die bronnen koppelt aan kostenposten.

### LTV:CAC berekening
- **LTV** (Customer Lifetime Value) = Gemiddelde netto commissie CS per deal
- **CAC** (Customer Acquisition Cost) = Totale marketing & ads spend / Aantal gewonnen deals
- **LTV:CAC ratio** = LTV / CAC

### Kosten per afspraak
- Per bron: ad spend van die bron / aantal afspraken uit die bron
- Totaal: totale ad spend / totaal aantal afspraken

### Conversie percentages
- Lead → Afspraak: (aantal afspraken / aantal leads uit Pipedrive) × 100
- Afspraak → Deal: (aantal deals / aantal uitgevoerde afspraken) × 100
- Lead → Deal: (aantal deals / aantal leads) × 100

### Target tracking
- Deals on track: (huidige deals / target deals) vs (dag van jaar / 365)
- Als ratio deals > ratio tijd → "On track" (groen), anders "Achter schema" (rood)
- Prognose: (huidige deals / verstreken maanden) × 12

---

## UI/UX Specificaties

### Layout
- Sidebar: 220px breed, fixed, donkere achtergrond (slate-900 of soortgelijk)
- Content area: flex-1, padding 24px, lichte achtergrond
- Max content width: geen hard max, maar tabellen/forms max ~1200px

### Componenten
- **KPI Card:** Achtergrond subtle gray, border-radius 8px, label 11px uppercase muted, waarde 20-24px semibold
- **Tabel:** Minimale borders (alleen horizontale lijnen), compact padding, header muted
- **Formulier:** 3-kolom grid, labels boven inputs, subtle borders
- **Status badges:** Kleine pills met semantic kleuren (groen=succes, amber=open, rood=negatief)
- **Tags:** Subtiele achtergrond, kleine tekst, voor categorieën en regio's
- **Charts:** Recharts of Chart.js, consistent kleurenschema, tooltips

### Kleuren
- Positief/winst: groen
- Negatief/verlies: rood
- Waarschuwing/open: amber
- Informatie/links: blauw
- Sidebar active: lichtblauw op donker

### Responsive
- Desktop-first, maar sidebar collapsed op tablet/mobile
- Tabellen horizontaal scrollbaar op small screens

---

## Mappenstructuur (suggestie)

```
costa-select-dashboard/
├── app/
│   ├── layout.tsx              # Root layout met sidebar
│   ├── page.tsx                # Dashboard
│   ├── deals/page.tsx
│   ├── afspraken/page.tsx
│   ├── maandkosten/page.tsx
│   ├── bonnen/page.tsx
│   ├── pl/page.tsx
│   ├── commissies/page.tsx
│   ├── pipedrive/page.tsx
│   ├── aannames/page.tsx
│   └── api/
│       ├── pipedrive/
│       │   ├── sync/route.ts     # Periodieke sync
│       │   └── webhook/route.ts  # Webhook endpoint
│       └── bonnen/
│           └── export/route.ts   # ZIP export
├── components/
│   ├── sidebar.tsx
│   ├── kpi-card.tsx
│   ├── data-table.tsx
│   ├── editable-cell.tsx
│   ├── file-upload.tsx
│   ├── funnel-chart.tsx
│   └── ...
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── pipedrive.ts             # Pipedrive API helpers
│   ├── calculations.ts          # Business logic (commissies, KPIs)
│   └── utils.ts
├── .env.local                   # Environment variables
└── ...
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
PIPEDRIVE_API_TOKEN=xxx
PIPEDRIVE_WEBHOOK_SECRET=xxx (optioneel, voor webhook verificatie)
```

---

## Seed Data

Importeer de bestaande deals uit de Excel:

| # | Datum | Regio | Type | Bron | Prijs | Comm% | Min fee? | Makelaar | Mak% | Partner? | Notities |
|---|-------|-------|------|------|-------|-------|----------|----------|------|----------|----------|
| 1 | 2026-03-02 | CBZ | Resale | Referentie van partner | 230000 | 1.5% | Ja | Thijs Kranenborg | 0% | Nee | Torrevieja |
| 2 | 2026-03-10 | Valencia | Invest | Marc Stam | 319500 | - | Ja | Thijs Kranenborg | 0% | Nee | WeVLC |
| 3 | 2026-03-10 | CBN | Resale | Website CS | 395000 | 1.5% | Ja | Thijs Kranenborg | 0% | Nee | Benidorm |
| 4 | 2026-01-04 | Valencia | Renovatie | Website CSV | 30000 | 5% | Nee | Thijs Kranenborg | 0% | Nee | Saman Reformas, Burjassot |
| 5 | 2026-05-20 | CDS | Nieuwbouw | Website CS | 390000 | 6% | Nee | Ed Bouterse | 40% | Nee | Sunny Golf |

Importeer ook de bestaande maandkosten uit de Excel (jan t/m apr 2026).

---

## Bouw-volgorde (suggestie)

1. **Setup:** Next.js project, Supabase connectie, Tailwind config
2. **Database:** Maak alle tabellen + seed data
3. **Layout:** Sidebar + routing
4. **Aannames pagina:** Settings CRUD (dit is de basis voor alles)
5. **Deals pagina:** Invoer + automatische berekeningen + tabel
6. **Maandkosten pagina:** Bewerkbare grid
7. **Dashboard pagina:** KPI's + charts (leest uit deals + maandkosten)
8. **P&L pagina:** Auto-berekende tabellen
9. **Commissies pagina:** Overzichten + uitbetaalstatus
10. **Afspraken pagina:** Invoer + analytics
11. **Bonnen pagina:** Upload + labeling + ZIP export
12. **Pipedrive pagina:** API integratie + weergave
13. **Pipedrive webhook:** Auto-import afspraken
14. **Targets & prognose:** Toevoegen aan Dashboard
15. **Polish:** Responsive, error handling, loading states

---

## Belangrijke aandachtspunten

- **Alle bedragen in EUR.** Gebruik Nederlandse notatie: €1.234,56 (punt als duizendtal-scheider, komma als decimaal)
- **Taal:** Interface is in het Nederlands
- **Jaar:** Start met 2026 als huidig jaar, maar maak het dynamisch (jaar-selector)
- **Beveiliging:** Supabase Row Level Security (RLS) inschakelen. API routes beveiligen.
- **Error handling:** Toon duidelijke foutmeldingen bij mislukte API calls of database errors
- **Loading states:** Skeleton loaders of spinners bij data laden
- **Optimistic updates:** Bij inline editing, update UI direct en sync met database op achtergrond
- **Supabase Storage:** Maak een publieke bucket "bonnen" voor bestandsopslag (of private met signed URLs)
