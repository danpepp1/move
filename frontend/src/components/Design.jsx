import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Planner2D from './Planner2D.jsx';
import { defaultFootprint, effectiveFootprint, round2 } from './furniture.js';

const Planner3D = React.lazy(() => import('./Planner3D.jsx'));

function fitReport(placed, W, L) {
  const boxes = placed.map((it) => {
    const [w, l] = effectiveFootprint(it);
    return { x: it.pos_x || 0, y: it.pos_y || 0, w, l };
  });
  let oob = 0;
  let overlap = 0;
  let area = 0;
  boxes.forEach((b) => {
    area += b.w * b.l;
    if (b.x < -0.01 || b.y < -0.01 || b.x + b.w > W + 0.01 || b.y + b.l > L + 0.01) oob++;
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x < b.x + b.w - 0.02 && a.x + a.w > b.x + 0.02 && a.y < b.y + b.l - 0.02 && a.y + a.l > b.y + 0.02) overlap++;
    }
  }
  return { oob, overlap, coverage: W && L ? Math.round((area / (W * L)) * 100) : 0 };
}

export default function Design() {
  const [rooms, setRooms] = useState([]);
  const [items, setItems] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [view, setView] = useState('2d');
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const [{ rooms }, { items }] = await Promise.all([api.rooms(), api.allItems()]);
    setRooms(rooms);
    setItems(items);
    setRoomId((cur) => cur ?? rooms[0]?.id ?? null);
  };
  useEffect(() => { load(); }, []);

  const room = rooms.find((r) => r.id === roomId) || null;
  const W = room?.width_ft || 12;
  const L = room?.length_ft || 12;
  const roomItems = items.filter((i) => i.room_id === roomId);
  const placed = roomItems.filter((i) => i.placed);
  const tray = roomItems.filter((i) => !i.placed);
  const selected = placed.find((i) => i.id === selectedId) || null;
  const report = useMemo(() => fitReport(placed, W, L), [placed, W, L]);

  const patchItem = (id, patch) => {
    setItems((xs) => xs.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    api.updateItem(id, patch).catch(() => {});
  };
  const patchRoom = (id, patch) => {
    setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    api.updateRoom(id, patch).catch(() => {});
  };

  const setDim = (field, val) => {
    const n = val === '' ? null : Math.max(2, Math.min(60, Number(val)));
    patchRoom(roomId, { [field]: n });
  };

  const place = (it) => {
    const has = it.foot_w && it.foot_l;
    const fp = has
      ? { foot_w: it.foot_w, foot_l: it.foot_l, height_ft: it.height_ft || defaultFootprint(it.name).height_ft }
      : defaultFootprint(it.name);
    patchItem(it.id, {
      placed: 1,
      ...fp,
      pos_x: round2(Math.max(0, (W - fp.foot_w) / 2)),
      pos_y: round2(Math.max(0, (L - fp.foot_l) / 2)),
    });
    setSelectedId(it.id);
  };

  const clampPos = (it, extra = {}) => {
    const merged = { ...it, ...extra };
    const [ew, el] = effectiveFootprint(merged);
    return {
      pos_x: round2(Math.max(0, Math.min(merged.pos_x || 0, Math.max(0, W - ew)))),
      pos_y: round2(Math.max(0, Math.min(merged.pos_y || 0, Math.max(0, L - el)))),
    };
  };

  const rotate = (it) => {
    const rotation = ((it.rotation || 0) + 90) % 360;
    patchItem(it.id, { rotation, ...clampPos(it, { rotation }) });
  };
  const resize = (it, field, val) => {
    const n = Math.max(0.3, Math.min(40, Number(val) || 0.3));
    patchItem(it.id, { [field]: n, ...clampPos(it, { [field]: n }) });
  };
  const removeFromPlan = (it) => { patchItem(it.id, { placed: 0 }); setSelectedId(null); };

  if (!room) return <section><p className="muted small">Add a room on the Rooms tab first.</p></section>;

  return (
    <section className="design">
      <div className="room-pills">
        {rooms.map((r) => (
          <button key={r.id} className={r.id === roomId ? 'pill active' : 'pill'}
            onClick={() => { setRoomId(r.id); setSelectedId(null); }}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="design-toolbar">
        <div className="dims">
          <input type="number" min="2" max="60" step="0.5" value={room.width_ft ?? ''}
            placeholder="12" onChange={(e) => setDim('width_ft', e.target.value)} />
          <span className="muted">×</span>
          <input type="number" min="2" max="60" step="0.5" value={room.length_ft ?? ''}
            placeholder="12" onChange={(e) => setDim('length_ft', e.target.value)} />
          <span className="muted small">ft</span>
        </div>
        <div className="view-toggle">
          <button className={view === '2d' ? 'seg active' : 'seg'} onClick={() => setView('2d')}>2D</button>
          <button className={view === '3d' ? 'seg active' : 'seg'} onClick={() => setView('3d')}>3D</button>
        </div>
      </div>

      <div className="planner-stage">
        {view === '2d'
          ? <Planner2D room={room} items={placed} selectedId={selectedId} onSelect={setSelectedId} onUpdate={patchItem} />
          : <Suspense fallback={<div className="planner3d muted small" style={{ display: 'grid', placeItems: 'center' }}>Loading 3D…</div>}>
              <Planner3D room={room} items={placed} />
            </Suspense>}
      </div>

      <div className="fit-status">
        <span>{room.name} · {W}′ × {L}′</span>
        <span className="muted">{report.coverage}% floor used</span>
        {report.oob > 0 && <span className="warn">⚠ {report.oob} outside walls</span>}
        {report.overlap > 0 && <span className="warn">⚠ {report.overlap} overlap</span>}
        {report.oob === 0 && report.overlap === 0 && placed.length > 0 && <span className="ok">✓ fits</span>}
      </div>

      {view === '2d' && selected && (
        <div className="card sel-panel">
          <div className="sel-head">
            <strong>{selected.name}</strong>
            <button className="icon danger" onClick={() => removeFromPlan(selected)} title="Remove from plan">remove</button>
          </div>
          <div className="sel-fields">
            <label>W<input type="number" min="0.3" step="0.5" value={selected.foot_w ?? ''} onChange={(e) => resize(selected, 'foot_w', e.target.value)} /></label>
            <label>L<input type="number" min="0.3" step="0.5" value={selected.foot_l ?? ''} onChange={(e) => resize(selected, 'foot_l', e.target.value)} /></label>
            <label>H<input type="number" min="0.3" step="0.5" value={selected.height_ft ?? ''} onChange={(e) => resize(selected, 'height_ft', e.target.value)} /></label>
            <button className="ghost" onClick={() => rotate(selected)}>⟳ rotate</button>
          </div>
        </div>
      )}

      <div className="tray">
        <div className="field-label">Drag into the room{tray.length ? '' : ' — everything’s placed'}</div>
        <div className="chips">
          {tray.map((it) => (
            <button key={it.id} className="chip place" onClick={() => place(it)}>+ {it.name}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
