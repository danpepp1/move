import React, { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, money } from './api.js';
import Rooms from './components/Rooms.jsx';
import Logistics from './components/Logistics.jsx';
import Setup from './components/Setup.jsx';

const TABS = [
  { id: 'rooms', label: 'Rooms' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'setup', label: 'Setup' },
];

export default function App() {
  const [tab, setTab] = useState('rooms');
  const [summary, setSummary] = useState(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.summary());
      setLocked(false);
      setError('');
    } catch (e) {
      if (e.code === 401) setLocked(true);
      else setError(e.message);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // iOS freezes a backgrounded PWA — refresh header numbers when it comes back.
  useEffect(() => {
    const onWake = () => { if (document.visibilityState === 'visible') loadSummary(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [loadSummary]);

  if (locked) return <Unlock onUnlock={loadSummary} />;

  return (
    <div className="app">
      <Header summary={summary} />
      {error && <p className="error">{error}</p>}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'rooms' && <Rooms onChange={loadSummary} summary={summary} />}
        {tab === 'logistics' && <Logistics onChange={loadSummary} />}
        {tab === 'setup' && <Setup onChange={loadSummary} />}
      </main>
    </div>
  );
}

function Header({ summary }) {
  const days = summary?.days_to_move;
  const b = summary?.budget;
  const tasks = summary?.tasks;
  const packing = summary?.packing;

  let countdown = 'Set your move date →';
  let countdownClass = 'count muted';
  if (typeof days === 'number') {
    if (days > 1) { countdown = `${days} days to move`; countdownClass = 'count'; }
    else if (days === 1) { countdown = 'Tomorrow!'; countdownClass = 'count soon'; }
    else if (days === 0) { countdown = "Move day 🎉"; countdownClass = 'count soon'; }
    else { countdown = `Moved ${Math.abs(days)}d ago`; countdownClass = 'count muted'; }
  }

  return (
    <header className="header">
      <div className="title-row">
        <h1>Move</h1>
        <span className={countdownClass}>{countdown}</span>
      </div>
      {b && (
        <div className="stats">
          <Stat label="Spent" value={money(b.spent_total)} />
          <Stat label="Still to buy" value={money(b.remaining_est)} accent />
          <Stat label="Est. total" value={money(b.est_total)} />
          <Stat label="Bought" value={`${b.bought_count}/${b.item_count}`} />
        </div>
      )}
      {(tasks?.total > 0 || packing?.total > 0) && (
        <div className="mini-progress">
          {packing?.total > 0 && <span>📦 Packing {packing.done}/{packing.total}</span>}
          {tasks?.total > 0 && <span>🔧 Setup {tasks.done}/{tasks.total}</span>}
        </div>
      )}
    </header>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={accent ? 'stat accent' : 'stat'}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Unlock({ onUnlock }) {
  const [val, setVal] = useState(getToken());
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToken(val.trim());
    await onUnlock();
    setBusy(false);
  };
  return (
    <div className="app unlock">
      <h1>Move</h1>
      <p className="muted">Enter your access token to continue.</p>
      <form onSubmit={submit}>
        <input type="password" value={val} onChange={(e) => setVal(e.target.value)} placeholder="access token" autoFocus />
        <button disabled={busy}>{busy ? '…' : 'Unlock'}</button>
      </form>
    </div>
  );
}
