# Handoff: Woningbot — Costa Select Dashboard

## Overview

De **Woningbot** is een interne tool voor Costa Select consultants, bereikbaar op `/woningbot` in de Costa Select Dashboard. Gebruikers typen een zoekopdracht in natuurlijke taal — een AI-service doorzoekt Spaanse vastgoedwoningen en retourneert een lijst properties met motivatie. De consultant kan properties aanvinken en toevoegen aan een klant-shortlist.

Eén route, één pagina, één doel: zoekopdracht → resultaten → shortlist.

## About the Design Files

De bestanden in deze bundle zijn **design-referenties gemaakt in HTML + React (via Babel in-browser)** — prototypes die het bedoelde uiterlijk, de copy en het gedrag tonen. Het zijn **geen productie-ready componenten**.

De taak is om dit ontwerp te **herbouwen in de bestaande Costa Select Dashboard-codebase** (`thijs-ui/costa-select-dashboard` — Next.js 14 + Supabase + Tailwind v4) met de al aanwezige patronen: `components/sidebar.tsx`, de globale tokens uit `app/globals.css`, en de serverroutes genoemd onder **Backend-endpoints** hieronder. Gebruik de bestaande Lucide-setup (`lucide-react`) en het bestaande Bricolage + Raleway font-stack; geen extra CSS-systemen introduceren.

## Fidelity

**High-fidelity.** Kleuren, typografie, spacing, iconen en interacties zijn final en volgen het Costa Select design system v1.1 (februari 2026). De developer moet pixel-pareel herbouwen in React/Tailwind. Gebruik exacte hex-waarden en pixel-spacings uit dit document.

## Route

`/woningbot` — single page, client-side React. Geen sub-routes.

## Layout structure (top → bottom)

De pagina neemt de **volledige hoogte van de main-area rechts van de sidebar**. De main-area is een vertical flex-container; van boven naar beneden:

1. **Header-rij** — vaste hoogte, border-bottom.
2. **(optioneel) Geschiedenis-paneel** — collapsible, `max-height: 260px`, `overflow-y: auto`. Geanimeerd in (fade + slide-down 200ms ease-out).
3. **Chat-area** — `flex: 1`, `overflow-y: auto`. Content gecentreerd met `max-width: 920px`.
4. **(conditioneel) Shortlist-selectiebalk** — verschijnt alleen als `selectedProps.size > 0`, deepsea-achtergrond, slide-up animatie (220ms).
5. **(conditioneel) Shortlist-picker dropdown** — positioneel boven de input (absolute), 360px breed.
6. **Input-form** — onderaan vastgeplakt, border-top, marble-achtergrond.

Alleen 3 (chat-area) scrollt; 1-2 en 4-6 zijn `flex-shrink: 0`.

## Screens / Views

### 1. Header

- **Links (titles block):**
  - Eyebrow: `COSTA SELECT · AI SEARCH` — Raleway 700, 10px, letter-spacing 0.18em, uppercase, color `#D4921A` (sun-dark).
  - H1: `Woningbot.` — Bricolage Grotesque 700, 30px, line-height 1, letter-spacing -0.01em, color `#004B46` (deepsea). **Met punt aan het eind** (brand: sentence-case met terminal period).
  - Subtitle: `Zoek en vergelijk woningen met AI.` — Raleway 400, 13px, color `#7A8C8B` (fg-subtle).
- **Rechts (action buttons):** flex, gap 10px.
  - **Geschiedenis** — `<button>` met klok-icoon (Lucide `clock`), label "Geschiedenis", en een count-badge (aantal opgeslagen chats) in sun `#F5AF40` op deepsea tekst als de knop actief is. Toggle-state: actief = deepsea-fill, inactief = white met deepsea-tekst en border-strong. Padding 9px 14px, radius 10px, font 12px/600.
  - **Nieuwe chat** — primary variant (deepsea-fill), plus-icoon + "Nieuwe chat". Reset sessie en messages.
- **Padding:** `24px 32px 18px`.
- **Border-bottom:** `1px solid rgba(0,75,70,0.12)`.

### 2. Geschiedenis-paneel (uitklap)

Verschijnt onder de header wanneer de Geschiedenis-knop aan staat.

- **Container:** `#fff` background, border-bottom `1px solid rgba(0,75,70,0.12)`, max-height 260px, scrollt intern.
- **Inner padding:** `14px 32px 18px`.
- **Sectiekop:** `EERDERE ZOEKOPDRACHTEN` — 10px uppercase Raleway 700, letter-spacing 0.18em, color fg-subtle. Marge-bottom 8px.
- **Lijstitem (`.hp-item`):** `display: flex; gap: 12px; padding: 10px 12px; border-radius: 8px`.
  - **Icon (links):** 32×32 vierkant, radius 8px. Default: sun-subtle `#FEF6E4` achtergrond + sun-dark `#D4921A` `message-square`-icoon. Actieve chat: deepsea-fill + marble-icoon.
  - **Title + meta:** title is de eerste user-message (truncated op 50 chars, single-line, ellipsis). Meta: relative-time (NL strings — `Zojuist`, `5m geleden`, `2u geleden`, `Gisteren`, `3d geleden`, `2w geleden`) + `·` + `{N} berichten`. 11px, fg-subtle.
  - **Delete-knop (rechts):** trash-2 icoon, `opacity: 0` default, `opacity: 1` on hover van parent. Hover-state: rood (`rgba(224,82,82,.12)` bg, `#c24040` color).
- **Actieve chat:** background `#E6F0EF` (deepsea-lighter), border `1px solid rgba(0,75,70,0.18)`.
- **Lege state:** centered tekst "Nog geen eerdere chats." — 13px fg-subtle, padding 28px 20px.

### 3. Chat-area

`flex: 1; overflow-y: auto; padding: 28px 32px 24px`. Inner wrapper `max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px`.

#### 3a. Lege state (geen messages)

Vertical flex, centered in de available space.

- **Icon-block:** 76×76, radius 18px, deepsea-fill, marble-kleur `message-square` Lucide-icoon (34px, stroke 1.6). Sun-accent chip (22×22 cirkel, sun-fill) absoluut op top-right `-8px / -8px`. Box-shadow `0 10px 28px rgba(7,42,36,0.18)`.
- **Kop:** `Wat zoek je?` — Bricolage 700, 40px, line-height 1, letter-spacing -0.015em. Marge-bottom 14px.
- **Lead-tekst:** "Beschrijf wat je zoekt, bijvoorbeeld: *Villa in Estepona, budget 500k–800k, 3 slaapkamers, zwembad, zeezicht.*" — 15px, fg-muted, max-width 540px. Het voorbeeld staat in een `<em>` met sun-subtle achtergrond + deepsea tekst + 2px 6px padding + radius 4px (niet italic — font-style: normal).
- **Divider-eyebrow:** `VOORBEELDEN` — 10px sun-dark uppercase, letter-spacing 0.22em, met horizontale lijntjes (18px) links en rechts (pseudo-elementen).
- **Chip-grid:** `grid-template-columns: 1fr 1fr; gap: 10px; max-width: 620px`. 5 chips, spec-exacte teksten:
  1. `Appartement Costa del Sol, 2 slpk, max 300k` (icoon: `building`)
  2. `Villa Marbella, 4 slpk, zwembad, 1M+` (icoon: `home`)
  3. `Nieuwbouw Costa Blanca, 2 slpk, zeezicht` (icoon: `sparkles`)
  4. `Prijzen Marbella` (icoon: `trending-up`, variant `topic`)
  5. `Buurt Jávea` (icoon: `map-pin`, variant `topic`)
  - **Chip-styling:** white bg, 1px border, radius 10px, padding 12px 16px 12px 14px, font 13px/500. Icon-block 28×28 radius 8px (default: deepsea-lighter bg + deepsea icoon; `topic` variant: deepsea-lighter bg + sun-dark icoon op white `chip-icon`).
  - **Hover:** border-color → deepsea, `translateY(-1px)`. Pijl-icoon rechts fade-in + slide-right.
- **Klik-gedrag:** zet de chip-text in het input-veld + focust het.

#### 3b. Message-bubbles

- **User (rechts, `.msg-row.user`):** `margin-left: auto`, flex-direction row-reverse, max-width 85%. Avatar 32×32 radius 10px, sand bg `#FFE5BD`, deepsea `user`-icoon. Bubble: deepsea-fill `#004B46`, marble-text, padding 14px 16px, radius 14px met `border-top-right-radius: 4px`.
- **Bot (links, `.msg-row.bot`):** `margin-right: auto`, max-width 85%. Avatar 32×32 deepsea-fill + marble `sparkles`-icoon. Bubble: white bg, 1px border, fg-color, padding 14px 16px, radius 14px met `border-top-left-radius: 4px`.
- **Content:** `white-space: pre-wrap`, font 14px line-height 1.55.

#### 3c. Stats-rij (alleen bij bot-messages met resultaten)

Onder de bot-bubble, boven de property-grid. Drie badges, flex row, gap 8px, flex-wrap.

- Badge styling: radius 999px, padding 5px 10px, 11px Raleway 600, border 1px border (default), bg white, fg-muted text.
- Badges (volgorde vast):
  1. `{total_found} gevonden` — met `database`-icoon. Number bold in Bricolage.
  2. `{after_filter} na filter` — met `filter`-icoon.
  3. `{selected} geselecteerd` — accent variant: bg `#FEF6E4` (sun-subtle), border `rgba(212,146,26,.25)`, color sun-dark. Met `check-circle-2` icoon.

#### 3d. Property-grid (alleen bij bot-messages met properties)

`display: grid; grid-template-columns: 1fr; gap: 14px`. Vanaf 720px: `grid-template-columns: 1fr 1fr`.

**Property card (`.prop-card`):**

- White bg, 1px border, radius 14px, overflow hidden, flex-column.
- **Hover:** box-shadow `0 4px 12px rgba(7,42,36,0.08)`, border → `rgba(0,75,70,.2)`.
- **Selected state:** border-color `#F5AF40` (sun), box-shadow `0 0 0 2px rgba(245,175,64,.25), 0 4px 12px rgba(7,42,36,0.08)`.

**Card structure:**

1. **Thumbnail (`.prop-thumb`):** `aspect-ratio: 16/10`. `<img object-cover>`; on parent hover → `transform: scale(1.04)` (350ms ease-out). Fallback als er geen thumbnail is: linear-gradient 135deg van deepsea-lighter naar sand, met `image`-icoon gecentreerd (opacity 0.7).
   - **Overlay checkbox (top-left, absolute `10px/10px`):** 28×28, radius 8px. Default: `rgba(255,250,239,.95)` bg met backdrop-blur 4px, `1.5px solid rgba(0,75,70,.25)` border, transparent color. Checked: sun-fill bg, sun border, deepsea `check`-icoon (15px stroke 3).
   - **Match-score badge (top-right, absolute):** `Match {score}` in 10px uppercase bold, radius 999px, padding 4px 9px, met `sparkles`-icoon. Default: `rgba(7,42,36,.75)` bg + backdrop-blur 8px + marble tekst. Top-scoring (rank 0 met score ≥ 90): sun-fill + deepsea.
2. **Body:** padding 14px 16px, flex-column, gap 8px.
   - **Title-row:** title (Bricolage 700, 16px, line-height 1.15, 1-line truncate) + external-link button (26×26, radius 8px, 1px border, hover → deepsea-fill). Link opent `prop.url` in nieuw tabblad (`target="_blank" rel="noopener noreferrer"`).
   - **Location:** 12px fg-subtle met `map-pin`-icoon (12px stroke 1.8).
   - **Prijs:** Bricolage 700, 20px, deepsea-kleur, letter-spacing -0.01em. **NL-locale formatting:** `€\u00A0450.000` (€ + non-breaking space + punt als duizendtal-scheider, geen decimalen). `null` → "Prijs op aanvraag" (fg-subtle, normaal gewicht).
   - **Spec-rij:** flex, gap 14px, 12px fg-muted. Items: `bed`+aantal, `bath`+aantal, `maximize-2`+m². Number in `<b>` met font-weight 600 + fg-color. Source (e.g. "Idealista", "Kyero") staat rechts-aligned, 10px uppercase, letter-spacing 0.1em, opacity 0.6.
   - **Motivatie-blok (optioneel):** `margin-top: 2px; padding-top: 12px; border-top: 1px solid border`. 12.5px fg-muted, line-height 1.5. Start met sun-subtle 18×18 icon-badge (sparkles 11px stroke 2), dan `<p>` daarnaast.

#### 3e. Loading state

Na submit, tijdens wacht — bot-bubble variant:

- Avatar: deepsea-fill + sparkles (zoals normale bot-msg).
- Bubble: white, 1px border, radius 14px met top-left 4px, padding 14px 16px.
- Content: spinner (18px, 2px border deepsea-lighter, top-color deepsea, 0.8s linear rotate) + tekst `Zoeken kan 30–60 seconden duren…` (13px fg-muted) + drie pulsing dots (5×5 fg-subtle, staggered 1.2s blink animation).
- **Backend timeout:** 120s max, maar de UI-copy blijft "30–60 seconden".

#### 3f. Auto-scroll

Bij elke nieuwe message én bij de loading-bubble: scroll de chat-area naar de bodem. Implementeer met een ref op de scroll-container en een `useEffect` op `messages.length` + `loading`.

### 4. Shortlist-selectiebalk

Rendert alleen als `selectedProps.size > 0`. Boven de input-form, onder de chat-area.

- **Container:** deepsea-fill, marble-tekst, padding 14px 32px, border-top `1px solid #072A24` (deepsea-deep).
- **Animatie:** slide-up (translateY 8px → 0) + fade, 220ms ease-out.
- **Links:** 28×28 sun-pill met count (Bricolage 700, 14px, deepsea-tekst) + label `{N} woning(en) geselecteerd`. Gebruik NL plural: 1 = "woning", 2+ = "woningen".
- **Rechts (2 knoppen):**
  - **Deselecteren** — ghost variant: transparent bg, `1.5px solid rgba(255,250,239,.3)` border, marble-tekst. Hover: `rgba(255,250,239,.12)` bg + marble border. Met `x`-icoon.
  - **Toevoegen aan shortlist** — primary variant: sun-fill, deepsea-tekst, sun border. Hover: sun-dark bg. Met `clipboard-list`-icoon.
- **Knop-styling:** padding 9px 16px, radius 10px, 12px Raleway 700, letter-spacing 0.06em.

### 5. Shortlist-picker dropdown

Opent boven de input (absolute positioning). Toont klantenlijst van `GET /api/woninglijst`.

- **Container:** 360px breed, white bg, `1px solid rgba(0,75,70,0.24)` border, radius 14px, shadow-lg `0 12px 32px rgba(7,42,36,0.12)`. Positie: `bottom: calc(100% + 10px); right: 32px`. Fade+slide-up animatie 180ms.
- **Header:** padding 14px 16px 10px, border-bottom.
  - Eyebrow: `STAP 2 VAN 2` — 10px uppercase sun-dark.
  - H4: `Kies een klant.` — Bricolage 700, 16px, letter-spacing -0.005em.
- **Lijst:** max-height 280px, overflow-y auto, padding 6px.
  - **Item:** `<button>`, flex, gap 12px, padding 10px 12px, radius 8px, hover: deepsea-lighter bg.
    - Avatar: 32×32 round, sand bg, deepsea-tekst. Initials uit naam (max 2 karakters).
    - Main: naam (13px Raleway 600 fg) + meta (`{region} · {count} op shortlist`, 11px fg-subtle).
    - Chevron-right rechts, fg-subtle.
  - **Disabled state** tijdens saving: opacity 0.5, cursor wait.
- **Lege state:** "Geen klanten gevonden. Maak er eerst een aan op de [Woninglijsten]-pagina." — met link naar `/woninglijsten`.
- **Footer:** padding 10px 16px, border-top, rechts-aligned "Annuleren" knop (transparent, fg-muted, hover → deepsea-lighter bg).
- **Klik op klant:** `POST /api/woninglijst/{customer_id}/items` met `{ items: [...selectedProps] }`, dan: close picker, clear selection, toon success-toast (in productie — in de mock is het een `alert`).

### 6. Input-form (onderaan)

- **Wrap:** padding 14px 32px 22px, marble bg, border-top.
- **Input-container:** max-width 920px gecentreerd, flex, gap 10px, white bg, `1.5px solid border`, radius 14px, padding 6px 6px 6px 16px, shadow-sm.
  - **Focus-within:** border → deepsea, `box-shadow: 0 0 0 3px rgba(0,75,70,.08)`.
- **Input:** single-line `<input type="text">`, geen textarea. 14.5px Raleway, fg color. Placeholder:
  - Nieuwe chat: `Beschrijf wat je zoekt…`
  - Bestaande sessie (`sessionId` aanwezig): `Verfijn je zoekopdracht…` (volgvragen worden via sessionId ondersteund door backend)
- **Send-knop:** 40×40, radius 10px, deepsea-fill, marble `send`-icoon. Disabled als input leeg of loading — dan bg `rgba(0,75,70,.18)`. Hover (enabled): deepsea-light.
- **Submit:** `Enter` of klik. `preventDefault`, trim value, `onSubmit()`, clear input.
- **Footer-tips (onder input):** max-width 920px, flex justify-between, 11px fg-subtle.
  - Links: contextueel — `Typ in natuurlijke taal; AI vertaalt naar filters` bij nieuwe chat, `Volgvraag — sessie wordt onthouden voor context` als `isRefining`.
  - Rechts: `Verstuur met [Enter]` met kbd-styling (deepsea-lighter bg, 1px border, 10px Raleway 600).

## Interactions & Behavior

### State & workflow

1. Gebruiker typt zoekopdracht → submit.
2. User-message verschijnt rechts; loading-bubble verschijnt links (30–60s).
3. Bot antwoordt met: (a) tekst-uitleg, (b) stats-badges, (c) property-grid.
4. `sessionId` wordt onthouden → vervolgvragen verfijnen dezelfde zoektocht.
5. Gebruiker vinkt 1+ properties aan → selectiebalk verschijnt → "Toevoegen aan shortlist" → klant kiezen → items opgeslagen bij die klant.
6. Chat wordt automatisch opgeslagen in geschiedenis na elk bot-antwoord (POST `/api/woningbot/history`).
7. "Nieuwe chat" reset `sessionId`, `chatId`, `messages` en focust de input.

### Animations & transitions

- **Fades:** 150ms ease-out voor hover en state changes (`background`, `color`, `border-color`).
- **Press:** `transform: translateY(1px)`, geen schaalanimatie.
- **History-panel in:** 200ms slide-down + fade.
- **Shortlist-bar in:** 220ms slide-up (8px) + fade.
- **Picker in:** 180ms slide-up (6px) + fade.
- **Property-thumb hover:** 350ms `transform: scale(1.04)` ease-out.
- **Loading spinner:** 0.8s linear rotate.
- **Dots:** 1.2s staggered blink (delays 0, 0.2s, 0.4s).

### Keyboard

- `Enter` submits form als input niet leeg.
- Focus-ring op alle interactieve elementen: `2px solid #F5AF40` (sun) met 2px offset.

### Responsive

- **≤ 900px:** sidebar verborgen, chat single-column property-grid, alle padding → 18px.
- **Desktop:** sidebar 224px vast, property-grid 2 kolommen vanaf 720px.

### Edge cases

- Property met `thumbnail: null` → fallback gradient + image-icoon (geen gebroken `<img>`).
- Property met `price: null` → "Prijs op aanvraag" in fg-subtle.
- Property zonder `motivation` → motivatie-blok niet renderen.
- Property zonder `bedrooms`/`bathrooms`/`size_m2` → betreffende spec niet tonen.
- Lege history → "Nog geen eerdere chats." placeholder.
- Lege klantenlijst in picker → lege state met link naar `/woninglijsten`.

## State Management

```ts
interface Property {
  id: string;
  title: string;
  price: number | null;         // EUR
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_m2: number | null;
  url: string;
  thumbnail: string | null;
  source: string;
  motivation: string;
  score: number | null;         // 0–100
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  properties?: Property[];
  stats?: { total_found: number; after_filter: number; selected: number };
}

interface SavedChat {
  id: string;
  session_id: string;
  title: string;
  messages: ChatMessage[];
  updated_at: string;           // ISO
}

// Component state
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [sessionId, setSessionId] = useState<string | null>(null);
const [chatId, setChatId] = useState<string | null>(null);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);
const [historyOpen, setHistoryOpen] = useState(false);
const [history, setHistory] = useState<SavedChat[]>([]);
const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
const [pickerOpen, setPickerOpen] = useState(false);
const [saving, setSaving] = useState(false);
```

### Data fetching

- **Op mount:** `GET /api/woningbot/history` → set `history`.
- **Submit:** `POST /api/woningbot/chat { message, sessionId }` → `{response, properties, stats, sessionId}` (maxDuration 120s). Proxy naar externe Woningbot-service.
- **Open picker:** `GET /api/woninglijst` → customers-array.
- **Add to shortlist:** `POST /api/woninglijst/{id}/items { items: Property[] }`.
- **Delete chat:** `DELETE /api/woningbot/history/{id}`.

## Design Tokens

### Colors (exact hex)

```
--deepsea:        #004B46   /* primary, dominant */
--deepsea-light:  #0A6B63   /* hover on deepsea */
--deepsea-lighter:#E6F0EF   /* tint, hover backgrounds */
--deepsea-deep:   #072A24   /* shadows, darker borders */
--sun:            #F5AF40   /* accent, spaarzaam */
--sun-light:      #FBD78A
--sun-dark:       #D4921A   /* eyebrows, accent tekst */
--sun-subtle:     #FEF6E4   /* accent chip-bg */
--marble:         #FFFAEF   /* page bg, on-brand text */
--sand:           #FFE5BD   /* warm supporting */
--sky:            #B3FFF0
--sea:            #0EAE96
--coral:          #FF8761   /* notification badge */

/* Semantic */
--fg:             #004B46
--fg-muted:       #5F7472
--fg-subtle:      #7A8C8B
--fg-on-brand:    #FFFAEF

--border:         rgba(0,75,70,0.12)
--border-strong:  rgba(0,75,70,0.24)
```

### Typography

- **Heading:** `'Bricolage Grotesque', Georgia, serif`. Weights: 600 (subtle), 700 (display).
- **Body:** `'Raleway', -apple-system, BlinkMacSystemFont, sans-serif`. Weights: 400, 500, 600, 700, 800.
- **Scale:**
  - H1 (page title): 30px / 1.0 / -0.01em / 700
  - H2 (empty state hero): 40px / 1.0 / -0.015em / 700
  - Card title: 16px / 1.15 / -0.005em / 700 Bricolage
  - Price: 20px / 1.0 / -0.01em / 700 Bricolage
  - Stats number: 12px / 1 / 700 Bricolage
  - Lead: 15px / 1.5 / 400 Raleway, fg-muted
  - Body/bubble: 14px / 1.55 / 400
  - Small (meta, specs): 12px / 1.4 / 400–600
  - Tip/kbd: 11px / 1 / 400–600
  - Eyebrow: 10–11px / uppercase / 0.18–0.22em tracking / 700 Raleway

### Spacing (8px base)

Zie tokens v1.1: `8, 16, 24, 32, 48, 64, 96, 128`. Page padding: 32px x-axis, 24–28px y-axis. Card inner padding: 14–16px. Gap tussen messages: 20px.

### Radii

- Buttons (header/action): 10px
- Chips, suggestion: 10px
- Message bubble: 14px (met gekorte hoek 4px aan de oorsprong-zijde)
- Property card: 14px
- Input container: 14px
- History item: 8px
- Picker container: 14px
- Icon-blocks: 8–10px
- Avatars: 10px (msg avatar) / 999px (round picker avatar)
- Pill badges: 999px

### Shadows

- `--shadow-sm: 0 1px 2px rgba(7,42,36,0.04), 0 1px 3px rgba(7,42,36,0.06);`
- `--shadow-md: 0 4px 12px rgba(7,42,36,0.08);`
- `--shadow-lg: 0 12px 32px rgba(7,42,36,0.12);`
- Empty-state icon block: `0 10px 28px rgba(7,42,36,0.18)`.

### Icons (Lucide)

Stroke-weight 1.5 (inactive), 1.8–2.0 (active/small). Geen emoji.

Gebruikt in deze pagina: `message-square, send, loader-2 (vervangen door css-spinner), external-link, bed, bath, maximize-2, plus, clock, trash-2, check, clipboard-list, sparkles, arrow-right, building, home, trending-up, map-pin, user, x, filter, database, check-circle-2, chevron-right, image`.

## Copywriting (NL — exacte teksten)

- Page title: `Woningbot.` · subtitle `Zoek en vergelijk woningen met AI.`
- Eyebrow: `COSTA SELECT · AI SEARCH`
- Empty hero: `Wat zoek je?`
- Empty lead: `Beschrijf wat je zoekt, bijvoorbeeld: Villa in Estepona, budget 500k–800k, 3 slaapkamers, zwembad, zeezicht.`
- Divider eyebrow: `VOORBEELDEN`
- Loading: `Zoeken kan 30–60 seconden duren…`
- History title: `EERDERE ZOEKOPDRACHTEN`
- History empty: `Nog geen eerdere chats.`
- Shortlist bar: `{N} woning(en) geselecteerd` · buttons `Deselecteren` en `Toevoegen aan shortlist`
- Picker: eyebrow `STAP 2 VAN 2`, H4 `Kies een klant.`, footer `Annuleren`
- Picker empty: `Geen klanten gevonden. Maak er eerst een aan op de [Woninglijsten]-pagina.`
- Input placeholder (new): `Beschrijf wat je zoekt…`
- Input placeholder (refining): `Verfijn je zoekopdracht…`
- Input tips: `Typ in natuurlijke taal; AI vertaalt naar filters` / `Volgvraag — sessie wordt onthouden voor context` · `Verstuur met Enter`
- Suggestion chips (exact):
  1. `Appartement Costa del Sol, 2 slpk, max 300k`
  2. `Villa Marbella, 4 slpk, zwembad, 1M+`
  3. `Nieuwbouw Costa Blanca, 2 slpk, zeezicht`
  4. `Prijzen Marbella`
  5. `Buurt Jávea`

**Brand copy-regels:** Nederlandse notatie voor valuta (`€ 450.000` met non-breaking space, punt als duizendtal-scheider, geen decimalen). Sentence-case, headlines eindigen met een punt. **Geen emoji**, geen Unicode-dingbats. Spaanse plaatsnamen blijven Spaans.

## Backend endpoints (zoals in de bestaande codebase)

- `POST /api/woningbot/chat` — proxy naar externe Woningbot-service, retourneert `{response, properties, stats, sessionId}`. `maxDuration: 120`.
- `GET /api/woningbot/history` — lijst van opgeslagen chats (Supabase).
- `POST /api/woningbot/history` — upsert een chat (na elk bot-antwoord).
- `DELETE /api/woningbot/history/{id}` — verwijder een chat.
- `GET /api/woninglijst` — lijst klanten.
- `POST /api/woninglijst/{id}/items` — woningen toevoegen aan klant-shortlist.

Geen wijzigingen aan deze endpoints nodig — alleen consumeren vanuit de nieuwe UI.

## Assets

- **Logo (sidebar):** `assets/logos/beeldmerk-on-deepsea.svg` — Costa Select sunburst beeldmerk op deepsea. Reuse de bestaande logo-file uit het design system (`uploads/logo_icon_deepseaBackground.svg` in de repo).
- **Photo placeholders:** in de HTML-mock zijn de eerste 3 property-thumbnails gekopieerd uit `ui_kits/photos/` van het design system (`villa-alicante.png`, `carousel-03-villa.png`, `carousel-04-villa.png`). In productie zijn dit de thumbnails die de Woningbot-service retourneert; de 4e demo-property heeft `thumbnail: null` om de fallback-gradient te tonen.
- **Fonts:** Bricolage Grotesque + Raleway — reeds aanwezig in de codebase via de bestaande `app/globals.css` of via Google Fonts CDN.
- **Icons:** `lucide-react` — al een dependency.

## Files in this bundle

- `README.md` — dit document
- `Woningbot.html` — de HTML-entry die React + Babel + Lucide laadt en de prototype mount
- `styles.css` — alle CSS (gebruik als kleur/spacing-referentie; in productie vertalen naar Tailwind-utilities of een scoped `globals.css`-extensie)
- `app.jsx` — main App-component met state management
- `components.jsx` — alle UI-componenten (Sidebar, Header, HistoryPanel, EmptyState, MessageBubble, LoadingBubble, StatsRow, PropertyCard, PropertyGrid, BotMessage, ShortlistBar, ShortlistPicker, InputForm)
- `data.js` — seed data (sample properties, customers, chat history, suggestion chips)
- `tweaks-panel.jsx` — in-page tweaks (alleen voor demo; niet overnemen naar productie)
- `assets/logos/beeldmerk-on-deepsea.svg` — brand logo
- `assets/photos/*.png` — placeholder property thumbnails

## Implementation notes

1. **Sidebar:** hergebruik de bestaande `components/sidebar.tsx` uit de repo. Zet de Woningbot-nav-item op `active` wanneer de route `/woningbot` is.
2. **Server vs. client:** de chat-area en alles onder de header is stateful en client-only — markeer het file met `"use client"`. De sidebar mag een server-component blijven.
3. **Tailwind vertaling:** alle kleuren staan al als CSS custom properties in `app/globals.css`. Map de klassen uit `styles.css` naar Tailwind-utilities met de tokens (e.g. `bg-[color:var(--deepsea)]` of breid `tailwind.config.ts` uit met de `deepsea/sun/marble/...` kleuren als named utilities).
4. **Auto-scroll:** gebruik een `ref` op de scroll-container + `useEffect` op `[messages.length, loading]`. **Niet** `scrollIntoView` (kan de page layout breken).
5. **Session persistence:** bewaar `sessionId` en `chatId` in component-state, niet in URL. Dat matcht de spec ("Nieuwe chat reset sessionId/chatId/messages").
6. **Optimistic UI:** push de user-message direct na submit, render de loading-bubble, pas na response de bot-message toevoegen.
7. **Number formatting:** `new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(price)` met `€\u00A0` (non-breaking space) ervoor.
8. **Accessibility:** `aria-label` op de prop-checkbox (toggle), `title` attributes op icon-only buttons, focus-visible outlines (2px solid sun met 2px offset).
