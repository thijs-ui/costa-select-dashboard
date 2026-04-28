# Prijzen & marktcontext per regio

**Status:** concept — getallen uit eigen Kompas-data en `regional_settings`-tabel; prose-secties wachten op aanvulling.
**Laatst gecontroleerd:** april 2026
**Volgende review:** juli 2026 (kwartaal-update aanbevolen)
**Eigenaar:** Costa Select

---

## Wat de koper wil weten

> Wat kost een woning werkelijk in regio X — niet alleen de vraagprijs, maar inclusief overdrachtsbelasting, notaris, advocaat, IBI en VvE? En wat is het verhuurpotentieel als ik de woning niet zelf bewoon?

Dit document brengt de **kale getallen** uit onze eigen interne data samen met de **kostenstructuur** per regio. Geen marketingverhaal — feitelijk vergelijkmateriaal voor het klantgesprek.

---

## Niveau 1 — Mediaanprijzen + type-aanbod (Costa Select Kompas-data)

Onze eigen mediaanprijzen voor een 'gemiddelde' woning per regio (vrijstaand, appartement of villa, mid-segment). Deze cijfers zijn ingebed in `lib/kompas-v2/data.ts` en worden gebruikt door de Kompas-tool om budget-fits te scoren.

| Regio | Mediaanprijs | Apt | Villa | Finca | Townhouse | Penthouse |
|---|---:|:---:|:---:|:---:|:---:|:---:|
| Costa del Sol | € 450.000 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Balearen | € 500.000 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Costa Brava | € 350.000 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Costa Blanca Noord | € 350.000 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Canarische Eilanden | € 340.000 | ✓ | ✓ | — | ✓ | ✓ |
| Costa de Valencia | € 310.000 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Costa de la Luz | € 250.000 | ✓ | ✓ | ✓ | ✓ | ⚠ |
| Costa Dorada | € 240.000 | ✓ | ✓ | ⚠ | ✓ | ✓ |
| Costa Tropical | € 220.000 | ✓ | ✓ | ✓ | ✓ | ⚠ |
| Costa Blanca Zuid | € 200.000 | ✓ | ✓ | — | ✓ | ✓ |
| Costa de Almería | € 170.000 | ✓ | ✓ | ⚠ | ✓ | ⚠ |
| Costa Cálida | € 160.000 | ✓ | ✓ | ⚠ | ✓ | ⚠ |
| Costa del Azahar | € 150.000 | ✓ | ✓ | ⚠ | ✓ | ⚠ |

✓ = goed beschikbaar · ⚠ = beperkt aanbod · — = vrijwel niet aanwezig

> **Lees-tip voor consultants:** het mediaan-getal zegt niets over instap-niveau. Op de Costa del Sol is het mediaan €450k, maar een appartement in Benalmádena begint bij €180k en een villa in Marbella Golden Mile schiet richting €5M+. Gebruik het getal als compass-anchor, niet als prijspunt voor de klant.

---

## Niveau 2 — Fiscale + bijkomende kosten per regio (regional_settings)

Wat een koper bovenop de aankoopprijs kwijt is, varieert significant per autonome regio. Dit is de live data uit onze `regional_settings`-tabel:

### 2.1 Bestaande bouw — overdrachtsbelasting (ITP)

| Regio | ITP basistarief | Progressief vanaf |
|---|---:|---|
| **Costa del Sol** (Andalucía) | **7,0 %** | nee — flat tarief |
| Costa Brava (Catalonië) | 10,0 % | nee |
| Costa Dorada (Catalonië) | 10,0 % | nee |
| Costa Blanca Noord (Valencia) | 10,0 % | **11,0 % bij > €1M** |
| Valencia stad / Costa de Valencia | 10,0 % | **11,0 % bij > €1M** |

> **Andalucía heeft strategisch belang.** Sinds de hervorming staat de ITP daar 30 % onder Catalonië/Valencia. Op een woning van €500k scheelt dat €15.000 — direct in zak. Voor koopkracht-vergelijkingen zwaarwegend.

**Andere regio's:** standaard 10,0 %. Bij twijfel: check `regional_settings` — schaalbaar via Supabase, geen hard-coded data in de app.

### 2.2 Nieuwbouw — IVA + AJD

Nieuwbouw heeft een ander regime: **IVA (BTW) 10 %** uniform door heel Spanje, plus **AJD (registratie)**:

| Regio | AJD |
|---|---:|
| Costa del Sol | 1,2 % |
| Catalonië / Valencia / overige | 1,5 % |

> **Praktijk:** voor een nieuwbouw van €400k in Marbella betaalt de koper €40k IVA + €4,8k AJD = €44,8k bovenop de prijs. Vergelijk dat met €60k ITP voor bestaande bouw in Catalonië — IVA-route lijkt vaak duurder maar is btw-aftrekbaar voor verhuur als de koper VAT-geregistreerd is. **Dit verschil moet in elk eerste klantgesprek vallen.**

### 2.3 Vaste bijkomende kosten (ongeacht regio)

Uit de standaardvelden in `regional_settings`:

- **Notaris:** €600–€2.500 (~0,3 % van koopprijs)
- **Registro de la Propiedad:** €400–€1.500 (~0,2 %)
- **Advocaat:** ~1,0 % met minimum €1.500
- **Property tax (IBI) jaarlijks:** ~0,5 % van cadastrale waarde

> **Vuistregel:** kostenkoper voor bestaande bouw in standaard-regio = **circa 12–13 %** van aankoopprijs. Op €350k = €43k. Voor Andalucía: ~9–10 % = €31k op €350k. Dat is de directe upside van Costa del Sol versus Costa Blanca Noord op fiscaal niveau.

---

## Niveau 3 — Verhuurpotentieel (average_rental_yield)

Per regio uit `regional_settings.average_rental_yield`:

| Regio | Avg. rental yield | VvE-bijdrage/maand |
|---|---:|---:|
| Valencia / Costa de Valencia | 6,0 % | € 120 |
| Costa Blanca Noord | 5,5 % | € 140 |
| Costa Dorada | 5,5 % | € 130 |
| Costa Brava | 5,0 % | € 150 |
| Costa del Sol | 5,0 % | € 180 |

> **Investeerders-perspectief:** Valencia/CB-Noord scoren hoogst op rendement omdat instapprijzen daar lager zijn (€310k mediaan vs €450k Costa del Sol) terwijl weeknachten in toeristenseizoen vergelijkbaar prijzen. Costa del Sol heeft hogere absolute huurinkomsten maar lagere yield-percentage door hoge instap.

> **Bewust gebrek aan data:** Costa Tropical, Cálida, de la Luz, Almería, Balearen en Canarische staan niet in `regional_settings`. Voor deze regio's gebruiken we Kompas-positionering of vragen we de klant om eigen onderzoek. **Aanbevolen actie: deze 8 regio's toevoegen aan `regional_settings` met cijfers.**

---

## Niveau 4 — Per-regio snapshots

Onderstaande snapshots combineren de hardcoded getallen met placeholders voor inhoudelijke prose. Vul aan met regio-specifieke kennis (luchthaven, type koper, prijssegmenten per gebied, bijzonderheden).

### 4.1 Costa del Sol (Málaga)

- Mediaan: **€ 450.000** · Type: alle woningtypes goed beschikbaar
- ITP: **7 %** (Andalucía-voordeel) · AJD: 1,2 %
- Verhuur: 5,0 % yield · VvE: € 180/mnd (hoogste van de 5)
- *Prose toe te voegen: Marbella Golden Mile (€7k–€20k/m²) vs Estepona (€3k–€6k/m²) vs Benalmádena (€2k–€4k/m²). Internationale jetset versus middensegment Nederlanders. Luchthaven Málaga 15–60 min afhankelijk van locatie.*

### 4.2 Costa Blanca Noord (Alicante noord)

- Mediaan: **€ 350.000** · Type: alle types beschikbaar
- ITP: 10 % basis, **11 % > €1M** (progressief)
- Verhuur: 5,5 % yield · VvE: € 140/mnd
- *Prose toe te voegen: Jávea, Moraira, Calpe, Altea — overwegend Noord-Europees publiek, sterk Nederlands aandeel. Luchthaven Alicante / Valencia. Microklimaat-bekend door Montgó-rug.*

### 4.3 Costa de Valencia (provincie Valencia)

- Mediaan: **€ 310.000** · Alle types beschikbaar
- ITP: 10/11 % progressief · IVA-nieuwbouw: 10 % + AJD 1,5 %
- Verhuur: **6,0 % yield** (hoogste in onze data) · VvE: € 120/mnd (laagste)
- *Prose toe te voegen: Valencia stad als groeimarkt, Cullera/Gandia als kustsegment. Snelle AVE naar Madrid. Aantrekkelijk voor remote workers + investeerders door yield/instap-verhouding.*

### 4.4 Costa Brava (Girona)

- Mediaan: **€ 350.000**
- ITP: 10 % flat (Catalonië)
- Verhuur: 5,0 % yield · VvE: € 150/mnd
- *Prose toe te voegen: Tossa de Mar, Lloret, Begur. Korter seizoen dan zuidkust (april–oktober ipv jaarrond). Treinverbinding naar Barcelona/Frankrijk. Hogere absolute weekprijzen in juli/aug.*

### 4.5 Costa Dorada (Tarragona)

- Mediaan: **€ 240.000**
- ITP: 10 % (Catalonië)
- Verhuur: 5,5 % yield · VvE: € 130/mnd
- *Prose toe te voegen: Salou, Cambrils, Tarragona. PortAventura-effect. Lage instap, beperkt premium-segment.*

### 4.6 Overige regio's (geen `regional_settings` entry)

Voor de volgende regio's gebruiken we standaard 10 % ITP / 1,5 % AJD / 5 % yield-aanname tenzij ander cijfer beschikbaar uit Kompas-data:

- **Costa Blanca Zuid** — mediaan € 200.000, voornamelijk Brits + Nederlands publiek
- **Costa Cálida (Murcia)** — mediaan € 160.000, instap-regio
- **Costa del Azahar (Castellón)** — mediaan € 150.000, laagste instap
- **Costa Tropical (Granada)** — mediaan € 220.000, subtropisch microklimaat
- **Costa de la Luz (Cádiz/Huelva)** — mediaan € 250.000, Atlantisch klimaat
- **Costa de Almería** — mediaan € 170.000, droogste regio
- **Balearen (Mallorca/Menorca/Ibiza)** — mediaan € 500.000, premium-segment
- **Canarische Eilanden** — mediaan € 340.000, jaarrond-klimaat

> **Aanbeveling:** voeg deze 8 toe aan `regional_settings` zodat de calculator + dossier-PDF kan rekenen met regio-specifieke fiscaliteit.

---

## Bronnen in de codebase

- **Mediaanprijzen + type-matrix:** `lib/kompas-v2/data.ts` (`MEDIAN_PRICES`, `TYPE_AVAILABILITY`)
- **Fiscale + verhuur-data:** Supabase `regional_settings`-tabel — seed in `supabase-regional-settings.sql`
- **Investeerder-positioneringen:** `lib/kompas-v2/investor-data.ts` (`INVESTOR_REGION_POSITIONS`)
- **Algemeen koper-positioneringen:** `lib/kompas-v2/data.ts` (`REGION_POSITIONS`)
- **Historische marktdata snapshot:** git commit `985f8c1`, `content/kennisbank/CS-042-actuele-marktdata.md` (Q1 2025 cijfers, kwartaal-update aanbevolen)

---

## Volgende stappen

1. **Prose aanvullen** in 4.1–4.6 — combineer Costa Select-ervaring met getallen
2. **8 ontbrekende regio's** toevoegen aan `regional_settings` met ITP/AJD/yield/VvE
3. **Kwartaal-update** plannen (juli 2026) — mediaanprijzen verifiëren, ITP/AJD checken op wijzigingen
4. **Cross-link** met CS-microklimaten waar relevant (klimaat ↔ huurprijs ↔ seizoenslengte)
