/* global React */
// Costa Select Woningbot — UI components
// Icons are rendered inline (lucide via <i data-lucide>) after each render pass.

const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React;

// ========= Lucide helper =========
// Re-run lucide.createIcons() after each render. Safe to call often — it only
// replaces <i data-lucide="..."> nodes that haven't been processed.
function useLucide(deps) {
  useLayoutEffect(() => {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }, deps);
}

const Icon = ({ name, ...rest }) => <i data-lucide={name} {...rest} />;

// ========= Utils =========
function formatPrice(n) {
  if (n == null) return "Prijs op aanvraag";
  return "€\u00A0" + new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n);
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Zojuist";
  if (m < 60) return `${m}m geleden`;
  if (h < 24) return `${h}u geleden`;
  if (d === 1) return "Gisteren";
  if (d < 7) return `${d}d geleden`;
  return `${Math.floor(d/7)}w geleden`;
}

// ========= SIDEBAR =========
function Sidebar() {
  useLucide([]);
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="assets/logos/beeldmerk-on-deepsea.svg" alt="Costa Select" />
      </div>
      <div className="sect">Menu</div>
      <nav>
        <a className="active"><Icon name="message-square" />Woningbot</a>
        <a><Icon name="clipboard-list" />Woninglijsten</a>
        <a><Icon name="route" />Bezichtigingen</a>
        <a><Icon name="calculator" />Calculators</a>
        <a><Icon name="building-2" />Samenwerkingen</a>
        <a><Icon name="map-pin" />Nieuwbouwkaart</a>
        <a><Icon name="file-text" />Dossier</a>
        <a><Icon name="book-open" />Kennisbank</a>
        <a><Icon name="graduation-cap" />Training</a>
        <a><Icon name="compass" />Costa Kompas</a>
      </nav>
      <div className="sect">Financieel <span style={{opacity:.5}}>▾</span></div>
      <nav>
        <a><Icon name="layout-dashboard" />Overzicht</a>
        <a><Icon name="users" />Consultants</a>
        <a><Icon name="handshake" />Sales</a>
        <a><Icon name="calendar-days" />Afspraken</a>
        <a><Icon name="trending-up" />P&amp;L</a>
        <a><Icon name="receipt" />Maandkosten</a>
      </nav>
      <div className="sect">Operations</div>
      <nav>
        <a><Icon name="check-square" />To-do <span className="badge">3</span></a>
        <a><Icon name="layers" />Projecten</a>
      </nav>
      <div className="user">
        <Icon name="log-out" style={{width:13, height:13}} />
        Uitloggen · thijs@costaselect.com
      </div>
    </aside>
  );
}

// ========= HEADER =========
function Header({ historyOpen, onToggleHistory, historyCount, onNewChat }) {
  useLucide([historyOpen, historyCount]);
  return (
    <div className="wb-header">
      <div className="titles">
        <div className="eyebrow">Costa Select · AI Search</div>
        <h1>Woningbot.</h1>
        <p className="subtitle">Zoek en vergelijk woningen met AI.</p>
      </div>
      <div className="wb-header-right">
        <button
          className={`wb-btn ${historyOpen ? "active-toggle" : ""}`}
          onClick={onToggleHistory}
        >
          <Icon name="clock" />
          Geschiedenis
          {historyCount > 0 && <span className="count-badge">{historyCount}</span>}
        </button>
        <button className="wb-btn primary" onClick={onNewChat}>
          <Icon name="plus" />
          Nieuwe chat
        </button>
      </div>
    </div>
  );
}

// ========= HISTORY PANEL =========
function HistoryPanel({ items, activeId, onPick, onDelete }) {
  useLucide([items.length, activeId]);
  return (
    <div className="history-panel">
      <div className="hp-inner">
        <div className="hp-title">Eerdere zoekopdrachten</div>
        {items.length === 0 ? (
          <div className="hp-empty">Nog geen eerdere chats.</div>
        ) : (
          <div className="hp-list">
            {items.map(item => (
              <div
                key={item.id}
                className={`hp-item ${item.id === activeId ? "active" : ""}`}
                onClick={() => onPick(item)}
              >
                <div className="hp-icon"><Icon name="message-square" /></div>
                <div className="hp-main">
                  <div className="hp-title-text">{item.title}</div>
                  <div className="hp-meta">
                    <span>{relativeTime(item.updated_at)}</span>
                    <span className="dot" />
                    <span>{item.message_count} berichten</span>
                  </div>
                </div>
                <button
                  className="hp-delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  title="Verwijderen"
                >
                  <Icon name="trash-2" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========= EMPTY STATE =========
function EmptyState({ suggestions, onPickSuggestion }) {
  useLucide([]);
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="message-square" />
      </div>
      <h2>Wat zoek je?</h2>
      <p className="lead">
        Beschrijf wat je zoekt, bijvoorbeeld: <em>Villa in Estepona, budget 500k–800k, 3 slaapkamers, zwembad, zeezicht.</em>
      </p>
      <div className="eyebrow-row">Voorbeelden</div>
      <div className="chip-grid">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className={`chip ${s.topic ? "topic" : ""}`}
            onClick={() => onPickSuggestion(s.text)}
          >
            <span className="chip-icon"><Icon name={s.icon} /></span>
            <span className="chip-text">{s.text}</span>
            <span className="chip-arrow"><Icon name="arrow-right" /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ========= MESSAGE BUBBLE =========
function MessageBubble({ role, content }) {
  useLucide([]);
  return (
    <div className={`msg-row ${role}`}>
      <div className="msg-avatar">
        <Icon name={role === "user" ? "user" : "sparkles"} />
      </div>
      <div className="msg-body">
        <div className="msg-bubble">{content}</div>
      </div>
    </div>
  );
}

// ========= LOADING BUBBLE =========
function LoadingBubble() {
  useLucide([]);
  return (
    <div className="loading-row">
      <div className="msg-avatar" style={{background:"var(--deepsea)", color:"var(--marble)"}}>
        <Icon name="sparkles" />
      </div>
      <div className="loading-bubble">
        <div className="spinner" />
        <span>Zoeken kan 30–60 seconden duren…</span>
        <span className="dots"><span/><span/><span/></span>
      </div>
    </div>
  );
}

// ========= STATS ROW =========
function StatsRow({ stats }) {
  useLucide([]);
  if (!stats) return null;
  return (
    <div className="stats-row">
      <span className="stat-badge">
        <Icon name="database" />
        <span className="num">{stats.total_found.toLocaleString("nl-NL")}</span>
        gevonden
      </span>
      <span className="stat-badge">
        <Icon name="filter" />
        <span className="num">{stats.after_filter}</span>
        na filter
      </span>
      <span className="stat-badge accent">
        <Icon name="check-circle-2" />
        <span className="num">{stats.selected}</span>
        geselecteerd
      </span>
    </div>
  );
}

// ========= PROPERTY CARD =========
function PropertyCard({ prop, selected, onToggle, rank }) {
  useLucide([selected, prop.id]);
  const topScore = rank === 0 && prop.score >= 90;
  return (
    <div className={`prop-card ${selected ? "selected" : ""}`}>
      <div className="prop-thumb">
        {prop.thumbnail ? (
          <img src={prop.thumbnail} alt={prop.title} />
        ) : (
          <div className="prop-thumb-placeholder">
            <Icon name="image" />
          </div>
        )}
        <button
          className={`prop-check ${selected ? "checked" : ""}`}
          onClick={() => onToggle(prop.id)}
          aria-label={selected ? "Deselecteren" : "Selecteren"}
          title={selected ? "Deselecteren" : "Selecteren"}
        >
          <Icon name="check" />
        </button>
        {prop.score != null && (
          <div className={`prop-score ${topScore ? "top" : ""}`}>
            <Icon name="sparkles" />
            Match {prop.score}
          </div>
        )}
      </div>
      <div className="prop-body">
        <div className="prop-title-row">
          <h3 className="prop-title">{prop.title}</h3>
          <a className="prop-link" href={prop.url} target="_blank" rel="noopener noreferrer" title="Open in nieuwe tab">
            <Icon name="external-link" />
          </a>
        </div>
        <div className="prop-loc">
          <Icon name="map-pin" />{prop.location}
        </div>
        <div className="prop-price">{formatPrice(prop.price)}</div>
        <div className="prop-specs">
          {prop.bedrooms != null && (
            <span className="spec"><Icon name="bed" /><b>{prop.bedrooms}</b></span>
          )}
          {prop.bathrooms != null && (
            <span className="spec"><Icon name="bath" /><b>{prop.bathrooms}</b></span>
          )}
          {prop.size_m2 != null && (
            <span className="spec"><Icon name="maximize-2" /><b>{prop.size_m2}</b> m²</span>
          )}
          {prop.source && <span className="source">{prop.source}</span>}
        </div>
        {prop.motivation && (
          <div className="prop-motivation">
            <span className="moti-icon"><Icon name="sparkles" /></span>
            <p>{prop.motivation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========= PROPERTY GRID =========
function PropertyGrid({ properties, selected, onToggle }) {
  return (
    <div className="property-grid">
      {properties.map((p, i) => (
        <PropertyCard
          key={p.id}
          prop={p}
          rank={i}
          selected={selected.has(p.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

// ========= BOT MESSAGE (composed: bubble + stats + grid) =========
function BotMessage({ msg, selected, onToggle }) {
  return (
    <div className="msg-row bot">
      <div className="msg-avatar"><Icon name="sparkles" /></div>
      <div className="msg-body">
        <div className="msg-bubble">{msg.content}</div>
        {msg.stats && <StatsRow stats={msg.stats} />}
        {msg.properties && msg.properties.length > 0 && (
          <PropertyGrid
            properties={msg.properties}
            selected={selected}
            onToggle={onToggle}
          />
        )}
      </div>
    </div>
  );
}

// ========= SHORTLIST BAR =========
function ShortlistBar({ count, onClear, onAdd }) {
  useLucide([count]);
  return (
    <div className="shortlist-bar">
      <div className="sb-left">
        <span className="sb-count-pill">{count}</span>
        <span className="sb-label">
          <b>{count}</b> {count === 1 ? "woning" : "woningen"} geselecteerd
        </span>
      </div>
      <div className="sb-right">
        <button className="sb-btn" onClick={onClear}>
          <Icon name="x" /> Deselecteren
        </button>
        <button className="sb-btn primary" onClick={onAdd}>
          <Icon name="clipboard-list" /> Toevoegen aan shortlist
        </button>
      </div>
    </div>
  );
}

// ========= PICKER DROPDOWN =========
function ShortlistPicker({ customers, saving, onPick, onCancel }) {
  useLucide([customers.length, saving]);
  return (
    <div className="picker">
      <div className="picker-header">
        <div className="eyebrow">Stap 2 van 2</div>
        <h4>Kies een klant.</h4>
      </div>
      {customers.length === 0 ? (
        <div className="picker-empty">
          Geen klanten gevonden.<br/>
          Maak er eerst een aan op de <a href="#">Woninglijsten</a>-pagina.
        </div>
      ) : (
        <div className="picker-list">
          {customers.map(c => (
            <button
              key={c.id}
              className="picker-item"
              disabled={saving}
              onClick={() => onPick(c)}
            >
              <span className="picker-avatar">
                {c.name.split(" ").map(w => w[0]).filter(Boolean).slice(0,2).join("")}
              </span>
              <span className="picker-item-main">
                <div className="picker-item-name">{c.name}</div>
                <div className="picker-item-meta">{c.region} · {c.count} op shortlist</div>
              </span>
              <span className="chev"><Icon name="chevron-right" /></span>
            </button>
          ))}
        </div>
      )}
      <div className="picker-footer">
        <button onClick={onCancel} disabled={saving}>Annuleren</button>
      </div>
    </div>
  );
}

// ========= INPUT FORM =========
function InputForm({ value, onChange, onSubmit, isRefining, disabled }) {
  useLucide([disabled, value]);
  const inputRef = useRef(null);

  // expose ref to parent for auto-focus from suggestion chips
  useEffect(() => {
    window.__wb_input_ref = inputRef;
  }, []);

  const canSubmit = value.trim().length > 0 && !disabled;
  const placeholder = isRefining
    ? "Verfijn je zoekopdracht…"
    : "Beschrijf wat je zoekt…";

  return (
    <div className="wb-input-wrap">
      <form
        className="wb-input"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="submit" className="send-btn" disabled={!canSubmit}>
          <Icon name="send" />
        </button>
      </form>
      <div className="wb-input-footer">
        <span className="tip">
          {isRefining
            ? "Volgvraag — sessie wordt onthouden voor context"
            : "Typ in natuurlijke taal; AI vertaalt naar filters"}
        </span>
        <span className="tip">
          Verstuur met <kbd>Enter</kbd>
        </span>
      </div>
    </div>
  );
}

// ========= EXPORT =========
Object.assign(window, {
  Sidebar, Header, HistoryPanel, EmptyState,
  MessageBubble, LoadingBubble, StatsRow,
  PropertyCard, PropertyGrid, BotMessage,
  ShortlistBar, ShortlistPicker, InputForm,
  wbUtils: { formatPrice, relativeTime, useLucide }
});
