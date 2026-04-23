/* global React, ReactDOM */
// Costa Select Woningbot — Main app

const { useState, useEffect, useRef, useCallback } = React;

function App() {
  // ========= Tweaks =========
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "startState": "results",
    "showHistory": false,
    "loadingDemo": false,
    "messageCount": "full",
    "bubbleStyle": "soft",
    "showMatchScore": true,
    "accentForSelected": "sun",
    "density": "cozy"
  }/*EDITMODE-END*/;

  const [tweaks, setTweaks] = (window.useTweaks || defaultUseTweaks)(TWEAKS);

  // ========= State =========
  const startState = tweaks.startState; // empty | results | mid-conversation
  const D = window.WB_DATA;

  const buildInitialMessages = (state) => {
    if (state === "empty") return [];
    if (state === "mid-conversation") {
      return [
        { id: "m1", role: "user", content: "Villa in Estepona, budget max 800k, 3 slaapkamers, zwembad en liefst zeezicht." },
        { id: "m2", role: "bot",
          content: D.DEMO_RESPONSE.text,
          stats: D.DEMO_RESPONSE.stats,
          properties: D.DEMO_RESPONSE.properties },
        { id: "m3", role: "user", content: "Kan je de eerste twee vergelijken op onderhoudskosten?" },
        { id: "m4", role: "bot",
          content: "Villa Mirador heeft energielabel B (~€ 280/maand). Casa del Pino heeft energielabel A na renovatie (~€ 190/maand). Over 10 jaar scheelt dat ongeveer € 10.800.\n\nMirador heeft wel een private tuin van 720 m² — dat is extra onderhoud (~€ 2.400/jaar) dat Pino niet heeft. Onder de streep komen ze binnen € 500/jaar van elkaar uit."
        }
      ];
    }
    // default: results
    return [
      { id: "m1", role: "user", content: "Villa in Estepona, budget max 800k, 3 slaapkamers, zwembad en liefst zeezicht." },
      { id: "m2", role: "bot",
        content: D.DEMO_RESPONSE.text,
        stats: D.DEMO_RESPONSE.stats,
        properties: D.DEMO_RESPONSE.properties }
    ];
  };

  const [messages, setMessages] = useState(() => buildInitialMessages(startState));
  const [sessionId, setSessionId] = useState(startState !== "empty" ? "sess-demo" : null);
  const [chatId, setChatId] = useState(startState !== "empty" ? "h1" : null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(tweaks.loadingDemo);
  const [historyOpen, setHistoryOpen] = useState(tweaks.showHistory);
  const [history, setHistory] = useState(D.SAMPLE_HISTORY);

  // Pre-select first 2 properties in results state to showcase shortlist bar
  const [selectedProps, setSelectedProps] = useState(() => {
    if (startState === "results") return new Set(["p1", "p2"]);
    return new Set();
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset messages when startState tweak changes
  useEffect(() => {
    setMessages(buildInitialMessages(startState));
    setSelectedProps(startState === "results" ? new Set(["p1", "p2"]) : new Set());
    setSessionId(startState !== "empty" ? "sess-demo" : null);
    setChatId(startState !== "empty" ? "h1" : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startState]);

  useEffect(() => { setLoading(tweaks.loadingDemo); }, [tweaks.loadingDemo]);
  useEffect(() => { setHistoryOpen(tweaks.showHistory); }, [tweaks.showHistory]);

  // ========= Auto-scroll =========
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  // ========= Actions =========
  const toggleProp = useCallback((id) => {
    setSelectedProps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedProps(new Set());

  const newChat = () => {
    setMessages([]);
    setSelectedProps(new Set());
    setSessionId(null);
    setChatId(null);
    setHistoryOpen(false);
    setInput("");
    window.__wb_input_ref?.current?.focus();
  };

  const pickSuggestion = (text) => {
    setInput(text);
    window.__wb_input_ref?.current?.focus();
  };

  const pickHistory = (item) => {
    // Demo: load scripted messages
    setMessages(buildInitialMessages("results"));
    setChatId(item.id);
    setSessionId(item.session_id);
    setSelectedProps(new Set(["p1"]));
    setHistoryOpen(false);
  };

  const deleteHistory = (id) => {
    setHistory(h => h.filter(x => x.id !== id));
    if (chatId === id) newChat();
  };

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { id: "m" + Date.now(), role: "user", content: text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // Simulated bot response (demo)
    setTimeout(() => {
      const botMsg = {
        id: "m" + (Date.now() + 1),
        role: "bot",
        content: D.DEMO_RESPONSE.text,
        stats: D.DEMO_RESPONSE.stats,
        properties: D.DEMO_RESPONSE.properties
      };
      setMessages(m => [...m, botMsg]);
      setSessionId("sess-" + Math.random().toString(36).slice(2, 8));
      setLoading(false);
    }, 1800);
  };

  const openPicker = () => setPickerOpen(true);
  const closePicker = () => setPickerOpen(false);
  const saveShortlist = (customer) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setPickerOpen(false);
      clearSelection();
      // A subtle confirmation toast would go here in production
      alert(`${selectedProps.size} woningen toegevoegd aan shortlist van ${customer.name}.`);
    }, 650);
  };

  // ========= Derived =========
  const isRefining = !!sessionId && messages.length > 0;
  const hasSelection = selectedProps.size > 0;

  return (
    <div className={`app density-${tweaks.density || "cozy"}`}>
      <Sidebar />
      <main className="woningbot">
        <Header
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen(v => !v)}
          historyCount={history.length}
          onNewChat={newChat}
        />
        {historyOpen && (
          <HistoryPanel
            items={history}
            activeId={chatId}
            onPick={pickHistory}
            onDelete={deleteHistory}
          />
        )}
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-inner">
            {messages.length === 0 && !loading ? (
              <EmptyState
                suggestions={D.SUGGESTIONS}
                onPickSuggestion={pickSuggestion}
              />
            ) : (
              messages.map(m => (
                m.role === "bot" ? (
                  <BotMessage
                    key={m.id}
                    msg={m}
                    selected={selectedProps}
                    onToggle={toggleProp}
                  />
                ) : (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                )
              ))
            )}
            {loading && <LoadingBubble />}
          </div>
        </div>

        {hasSelection && (
          <ShortlistBar
            count={selectedProps.size}
            onClear={clearSelection}
            onAdd={openPicker}
          />
        )}

        <div className="picker-wrap">
          {pickerOpen && (
            <ShortlistPicker
              customers={D.SAMPLE_CUSTOMERS}
              saving={saving}
              onPick={saveShortlist}
              onCancel={closePicker}
            />
          )}
          <InputForm
            value={input}
            onChange={setInput}
            onSubmit={submit}
            isRefining={isRefining}
            disabled={loading}
          />
        </div>
      </main>

      {/* Tweaks panel */}
      <WoningbotTweaks tweaks={tweaks} setTweaks={setTweaks} />
    </div>
  );
}

// Fallback useTweaks if tweaks-panel.jsx hasn't loaded yet
function defaultUseTweaks(defaults) {
  const [state, setState] = useState(defaults);
  return [state, (patch) => setState(s => ({...s, ...patch}))];
}

// ========= TWEAKS PANEL =========
function WoningbotTweaks({ tweaks, setTweaks }) {
  if (!window.TweaksPanel) return null;
  const { TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Flow">
        <TweakRadio
          label="Startscherm"
          value={tweaks.startState}
          onChange={v => setTweaks({ startState: v })}
          options={[
            { value: "empty", label: "Leeg (nieuwe chat)" },
            { value: "results", label: "Resultaten" },
            { value: "mid-conversation", label: "Mid-gesprek" }
          ]}
        />
        <TweakToggle
          label="Geschiedenis open"
          value={tweaks.showHistory}
          onChange={v => setTweaks({ showHistory: v })}
        />
        <TweakToggle
          label="Loading-state demo"
          value={tweaks.loadingDemo}
          onChange={v => setTweaks({ loadingDemo: v })}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ========= MOUNT =========
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
