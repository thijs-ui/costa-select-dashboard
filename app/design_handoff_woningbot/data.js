/* global window */
// Seed data for the Woningbot demo. In production these come from the API.

window.WB_DATA = (() => {

  // Photos available in assets/photos/
  const PHOTO_VILLA_ALICANTE = "assets/photos/villa-alicante.png";
  const PHOTO_CAR3 = "assets/photos/carousel-03-villa.png";
  const PHOTO_CAR4 = "assets/photos/carousel-04-villa.png";

  // Lightweight SVG placeholders (data URLs) for extra property thumbnails
  const ph = (bg, fg, label) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="${bg}"/>
      <g fill="${fg}" opacity="0.5">
        <rect x="60" y="90" width="80" height="80"/>
        <polygon points="60,90 100,60 140,90"/>
        <rect x="150" y="110" width="120" height="60"/>
        <polygon points="150,110 210,75 270,110"/>
      </g>
      <text x="20" y="184" fill="${fg}" opacity="0.85" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1">${label}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };

  const SAMPLE_PROPERTIES = [
    {
      id: "p1",
      title: "Villa Mirador, Costa del Sol",
      price: 875000,
      location: "Estepona · Nueva Andalucía",
      bedrooms: 3,
      bathrooms: 2,
      size_m2: 245,
      url: "https://example.com/mirador",
      thumbnail: PHOTO_VILLA_ALICANTE,
      source: "Idealista",
      score: 94,
      motivation: "Past binnen budget en voldoet aan alle harde eisen: 3 slaapkamers, privé zwembad en open zeezicht vanaf het dakterras. De tuin ligt op het zuidwesten, perfect voor late middagzon."
    },
    {
      id: "p2",
      title: "Casa del Pino, Marbella Hills",
      price: 720000,
      location: "Marbella · Sierra Blanca",
      bedrooms: 3,
      bathrooms: 3,
      size_m2: 218,
      url: "https://example.com/pino",
      thumbnail: PHOTO_CAR3,
      source: "Kyero",
      score: 88,
      motivation: "Iets kleiner qua perceel maar energielabel A en recente renovatie drukken de onderhoudskosten. 8 minuten rijden naar Puerto Banús."
    },
    {
      id: "p3",
      title: "Residencia Horizonte",
      price: 640000,
      location: "Benahavís · La Zagaleta-zijde",
      bedrooms: 3,
      bathrooms: 2,
      size_m2: 189,
      url: "https://example.com/horizonte",
      thumbnail: PHOTO_CAR4,
      source: "Fotocasa",
      score: 82,
      motivation: "Scherper geprijsd dan de buurpanden. Zwembad is gemeenschappelijk — dat scheelt in beheerskosten maar vraagt vereniging-akkoord voor verhuur."
    },
    {
      id: "p4",
      title: "Villa Las Brisas",
      price: 790000,
      location: "Estepona · El Paraíso",
      bedrooms: 4,
      bathrooms: 3,
      size_m2: 262,
      url: "https://example.com/brisas",
      thumbnail: null,
      source: "Direct",
      score: 77,
      motivation: "Off-market via partner-makelaar. Vraagt onderhoud aan de buitengevel maar prijs reflecteert dat. Vier slaapkamers geeft extra flexibiliteit voor verhuur."
    }
  ];

  const SAMPLE_CUSTOMERS = [
    { id: "c1", name: "Familie Van den Berg", region: "Marbella · Estepona", count: 4 },
    { id: "c2", name: "Dhr. & Mevr. De Vries", region: "Costa Blanca", count: 2 },
    { id: "c3", name: "Mevr. J. Bakker", region: "Jávea · Moraira", count: 7 },
    { id: "c4", name: "Familie Peeters", region: "Valencia-regio", count: 0 },
    { id: "c5", name: "Dhr. M. Janssens", region: "Alicante", count: 3 }
  ];

  // A saved chat used as the "active" one in demo mode
  const SAMPLE_HISTORY = [
    {
      id: "h1",
      session_id: "sess-001",
      title: "Villa Estepona 3 slpk zwembad zeezicht 800k",
      updated_at: Date.now() - 5 * 60 * 1000, // 5m ago
      message_count: 4
    },
    {
      id: "h2",
      session_id: "sess-002",
      title: "Appartement Jávea oude stad, budget 300k",
      updated_at: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
      message_count: 3
    },
    {
      id: "h3",
      session_id: "sess-003",
      title: "Nieuwbouw Alicante met zeezicht",
      updated_at: Date.now() - 24 * 60 * 60 * 1000 - 1000, // yesterday
      message_count: 6
    },
    {
      id: "h4",
      session_id: "sess-004",
      title: "Prijzen Marbella 2024 overzicht",
      updated_at: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3d
      message_count: 2
    },
    {
      id: "h5",
      session_id: "sess-005",
      title: "Buurtvergelijking Benahavís vs Nueva Andalucía",
      updated_at: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1w
      message_count: 5
    }
  ];

  // Suggestion chips (spec-exact texts)
  const SUGGESTIONS = [
    { text: "Appartement Costa del Sol, 2 slpk, max 300k", icon: "building" },
    { text: "Villa Marbella, 4 slpk, zwembad, 1M+", icon: "home" },
    { text: "Nieuwbouw Costa Blanca, 2 slpk, zeezicht", icon: "sparkles" },
    { text: "Prijzen Marbella", icon: "trending-up", topic: true },
    { text: "Buurt Jávea", icon: "map-pin", topic: true }
  ];

  // Scripted demo: for a given (hint'd) search query, return bot response
  const DEMO_RESPONSE = {
    text: "Ik heb vier woningen gevonden die matchen met 3 slaapkamers en een zwembad in de regio Marbella–Estepona, binnen je budget van € 800.000. Ik heb er 1.247 bekeken en de vier sterkste voor je geselecteerd op basis van ligging, zeezicht en prijs-per-m².\n\nDe eerste twee liggen boven € 720k maar scoren hoog op zeezicht en tuinoriëntatie. Residencia Horizonte is scherper geprijsd — let op dat het zwembad daar gedeeld is.",
    stats: { total_found: 1247, after_filter: 38, selected: 4 },
    properties: SAMPLE_PROPERTIES
  };

  return {
    SAMPLE_PROPERTIES,
    SAMPLE_CUSTOMERS,
    SAMPLE_HISTORY,
    SUGGESTIONS,
    DEMO_RESPONSE,
    PHOTO_VILLA_ALICANTE,
    PHOTO_CAR3,
    PHOTO_CAR4
  };
})();
