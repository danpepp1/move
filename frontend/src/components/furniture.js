// Rough real-world footprints (feet) + heights so a placed item starts life at a
// believable size. Matched by keyword against the item name; first hit wins, so
// order specific → generic. [regex, width, length, height].
const FURNITURE = [
  [/(sectional)/, 8, 5, 2.8],
  [/(sofa|couch)/, 6.5, 3, 2.8],
  [/love\s?seat/, 5, 3, 2.8],
  [/king/, 6.3, 6.7, 2],
  [/(queen|bed frame|mattress|bed)/, 5, 6.7, 2],
  [/crib/, 2.5, 4.5, 3],
  [/dresser/, 5, 1.7, 2.7],
  [/nightstand/, 1.6, 1.5, 2],
  [/desk/, 4, 2, 2.5],
  [/(office chair|chair)/, 2, 2, 3.2],
  [/(tv stand|media|console)/, 4, 1.3, 1.8],
  [/(\btv\b|television)/, 4, 0.4, 2.3],
  [/monitor/, 2, 0.6, 1.6],
  [/coffee table/, 3.5, 1.8, 1.5],
  [/(dining|kitchen table)/, 5, 3, 2.5],
  [/table/, 3, 3, 2.5],
  [/rug/, 8, 5, 0.1],
  [/(book\s?shelf|bookcase|shelf)/, 3, 1, 5.5],
  [/(wardrobe|armoire)/, 4, 2, 6.5],
  [/(fridge|refrigerator)/, 3, 3, 6],
  [/(washer|dryer)/, 2.3, 2.3, 3],
  [/(microwave)/, 1.7, 1.5, 1.2],
  [/lamp/, 1.2, 1.2, 5],
  [/plant/, 1.5, 1.5, 4],
];

export function defaultFootprint(name) {
  const n = (name || '').toLowerCase();
  for (const [re, w, l, h] of FURNITURE) if (re.test(n)) return { foot_w: w, foot_l: l, height_ft: h };
  return { foot_w: 2, foot_l: 2, height_ft: 2.5 };
}

// Deterministic color per item name so 2D and 3D agree and it's stable across reloads.
const PALETTE = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf', '#fb923c', '#4ade80', '#38bdf8'];
export function colorFor(name) {
  let h = 0;
  for (const ch of name || 'x') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Footprint as it sits on the floor after rotation (90°/270° swap width & length).
export function effectiveFootprint(it) {
  const w = it.foot_w || 2;
  const l = it.foot_l || 2;
  return ((it.rotation || 0) % 180 === 0) ? [w, l] : [l, w];
}

export const round2 = (n) => Math.round(n * 100) / 100;
