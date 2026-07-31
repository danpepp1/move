import React, { useEffect, useState } from 'react';
import { api, money } from '../api.js';

export default function Rooms({ onChange }) {
  const [rooms, setRooms] = useState([]);
  const [items, setItems] = useState([]);
  const [newRoom, setNewRoom] = useState('');

  const load = async () => {
    const [{ rooms }, { items }] = await Promise.all([api.rooms(), api.allItems()]);
    setRooms(rooms);
    setItems(items);
  };
  useEffect(() => { load(); }, []);

  // Reload our own lists AND the header numbers after any mutation.
  const refresh = async () => { await load(); onChange?.(); };

  const addRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    await api.addRoom(newRoom.trim());
    setNewRoom('');
    refresh();
  };

  return (
    <section>
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          items={items.filter((i) => i.room_id === room.id)}
          onChange={refresh}
        />
      ))}

      <form className="add-room" onSubmit={addRoom}>
        <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="Add a room (e.g. Balcony)" />
        <button>+ Room</button>
      </form>
    </section>
  );
}

function RoomCard({ room, items, onChange }) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const est = items.reduce((s, i) => s + (i.est_price || 0), 0);
  const bought = items.filter((i) => i.status === 'bought').length;

  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.addItem(room.id, name.trim(), price === '' ? null : Number(price));
    setName(''); setPrice('');
    onChange();
  };

  const removeRoom = async () => {
    if (!confirm(`Delete "${room.name}" and its ${items.length} item(s)?`)) return;
    await api.deleteRoom(room.id);
    onChange();
  };

  return (
    <div className="card room">
      <div className="room-head" onClick={() => setOpen((o) => !o)}>
        <div className="room-title">
          <span className="chev">{open ? '▾' : '▸'}</span>
          <strong>{room.name}</strong>
          <span className="room-sub">{bought}/{items.length} · {money(est)}</span>
        </div>
        <button className="icon danger" onClick={(e) => { e.stopPropagation(); removeRoom(); }} title="Delete room">✕</button>
      </div>

      {open && (
        <div className="room-body">
          {items.map((item) => <ItemRow key={item.id} item={item} onChange={onChange} />)}
          {items.length === 0 && <p className="muted small">No items yet.</p>}

          <form className="add-item" onSubmit={addItem}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add item" />
            <input className="price" type="number" min="0" step="1" value={price}
              onChange={(e) => setPrice(e.target.value)} placeholder="$ est" />
            <button>+</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, onChange }) {
  const bought = item.status === 'bought';
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceVal, setPriceVal] = useState('');

  const toggle = async () => {
    await api.updateItem(item.id, { status: bought ? 'need' : 'bought' });
    onChange();
  };

  const savePrice = async (field) => {
    setEditingPrice(false);
    const num = priceVal === '' ? null : Number(priceVal);
    await api.updateItem(item.id, { [field]: num });
    onChange();
  };

  const remove = async () => { await api.deleteItem(item.id); onChange(); };

  return (
    <div className={bought ? 'item done' : 'item'}>
      <button className="check" onClick={toggle} title={bought ? 'Mark as still needed' : 'Mark as bought'}>
        {bought ? '☑' : '☐'}
      </button>
      <span className="item-name">{item.name}</span>
      {editingPrice ? (
        <input className="price inline" type="number" min="0" step="1" autoFocus
          value={priceVal}
          onChange={(e) => setPriceVal(e.target.value)}
          onBlur={() => savePrice(bought ? 'actual_price' : 'est_price')}
          onKeyDown={(e) => e.key === 'Enter' && savePrice(bought ? 'actual_price' : 'est_price')} />
      ) : (
        <button
          className="price-tag"
          title={bought ? 'Actual price (tap to edit)' : 'Estimated price (tap to edit)'}
          onClick={() => { setPriceVal((bought ? item.actual_price ?? item.est_price : item.est_price) ?? ''); setEditingPrice(true); }}>
          {bought
            ? money(item.actual_price ?? item.est_price)
            : (item.est_price != null ? money(item.est_price) : '+$')}
        </button>
      )}
      <button className="icon danger" onClick={remove} title="Delete item">✕</button>
    </div>
  );
}
