import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Logistics({ onChange }) {
  const [moveDate, setMoveDate] = useState('');
  const [dates, setDates] = useState([]);
  const [packing, setPacking] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newPack, setNewPack] = useState('');
  const [newPackWhen, setNewPackWhen] = useState('');

  const load = async () => {
    const [{ move_date }, { dates }, { packing }] = await Promise.all([
      api.settings(), api.dates(), api.packing(),
    ]);
    setMoveDate(move_date || '');
    setDates(dates);
    setPacking(packing);
  };
  useEffect(() => { load(); }, []);
  const refresh = async () => { await load(); onChange?.(); };

  const saveMoveDate = async (v) => {
    setMoveDate(v);
    await api.setMoveDate(v);
    onChange?.();
  };

  const addDate = async (e) => {
    e.preventDefault();
    if (!newDate.trim()) return;
    await api.addDate(newDate.trim());
    setNewDate('');
    refresh();
  };

  const addPack = async (e) => {
    e.preventDefault();
    if (!newPack.trim()) return;
    await api.addPacking(newPack.trim(), newPackWhen.trim() || null);
    setNewPack(''); setNewPackWhen('');
    refresh();
  };

  return (
    <section>
      <div className="card">
        <label className="field-label">Move day</label>
        <input type="date" value={moveDate} onChange={(e) => saveMoveDate(e.target.value)} />
        <p className="muted small">Drives the countdown at the top.</p>
      </div>

      <h3 className="section-h">Key dates</h3>
      <div className="card">
        {dates.map((d) => (
          <div className="date-row" key={d.id}>
            <input className="date-label" defaultValue={d.label}
              onBlur={(e) => e.target.value !== d.label && api.updateDate(d.id, { label: e.target.value }).then(refresh)} />
            <input type="date" value={d.date || ''}
              onChange={(e) => api.updateDate(d.id, { date: e.target.value }).then(refresh)} />
            <button className="icon danger" onClick={() => api.deleteDate(d.id).then(refresh)} title="Delete">✕</button>
          </div>
        ))}
        <form className="add-item" onSubmit={addDate}>
          <input value={newDate} onChange={(e) => setNewDate(e.target.value)} placeholder="Add a date (e.g. Deposit due)" />
          <button>+</button>
        </form>
      </div>

      <h3 className="section-h">Packing timeline</h3>
      <div className="card">
        {packing.map((p) => (
          <div className={p.done ? 'item done' : 'item'} key={p.id}>
            <button className="check" onClick={() => api.updatePacking(p.id, { done: p.done ? 0 : 1 }).then(refresh)}>
              {p.done ? '☑' : '☐'}
            </button>
            <span className="item-name">{p.label}</span>
            {p.timing && <span className="when">{p.timing}</span>}
            <button className="icon danger" onClick={() => api.deletePacking(p.id).then(refresh)} title="Delete">✕</button>
          </div>
        ))}
        <form className="add-item" onSubmit={addPack}>
          <input value={newPack} onChange={(e) => setNewPack(e.target.value)} placeholder="Add packing step" />
          <input className="when-input" value={newPackWhen} onChange={(e) => setNewPackWhen(e.target.value)} placeholder="when" />
          <button>+</button>
        </form>
      </div>
    </section>
  );
}
