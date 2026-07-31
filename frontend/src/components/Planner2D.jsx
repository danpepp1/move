import React, { useRef, useState } from 'react';
import { colorFor, effectiveFootprint } from './furniture.js';

// Top-down, to-scale floor plan. SVG viewBox is in FEET, so everything is drawn
// in real units and the browser scales it to fit. Drag a piece to move it.
export default function Planner2D({ room, items, selectedId, onSelect, onUpdate }) {
  const W = room.width_ft || 12;
  const L = room.length_ft || 12;
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, x, y } during a drag

  const feetPerPixel = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r && r.width ? W / r.width : 1;
  };

  const onPointerDown = (e, it) => {
    e.stopPropagation();
    onSelect(it.id);
    const fpp = feetPerPixel();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget._d = { cx: e.clientX, cy: e.clientY, ox: it.pos_x || 0, oy: it.pos_y || 0, fpp };
    setDrag({ id: it.id, x: it.pos_x || 0, y: it.pos_y || 0 });
  };

  const onPointerMove = (e, it) => {
    const d = e.currentTarget._d;
    if (!d) return;
    const [ew, el] = effectiveFootprint(it);
    let x = d.ox + (e.clientX - d.cx) * d.fpp;
    let y = d.oy + (e.clientY - d.cy) * d.fpp;
    x = Math.max(0, Math.min(x, Math.max(0, W - ew)));
    y = Math.max(0, Math.min(y, Math.max(0, L - el)));
    setDrag({ id: it.id, x, y });
  };

  const onPointerUp = (e, it) => {
    const d = e.currentTarget._d;
    e.currentTarget._d = null;
    if (d && drag && drag.id === it.id) {
      onUpdate(it.id, { pos_x: Math.round(drag.x * 100) / 100, pos_y: Math.round(drag.y * 100) / 100 });
    }
    setDrag(null);
  };

  // 1-ft grid lines.
  const grid = [];
  for (let x = 1; x < W; x++) grid.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={L} className="grid-line" />);
  for (let y = 1; y < L; y++) grid.push(<line key={`hy${y}`} x1={0} y1={y} x2={W} y2={y} className="grid-line" />);

  return (
    <svg
      ref={svgRef}
      className="planner2d"
      viewBox={`-0.3 -0.3 ${W + 0.6} ${L + 0.6}`}
      onPointerDown={() => onSelect(null)}
    >
      <rect x={0} y={0} width={W} height={L} className="room-floor" />
      <g>{grid}</g>
      <rect x={0} y={0} width={W} height={L} className="room-wall" vectorEffect="non-scaling-stroke" />

      {items.map((it) => {
        const [ew, el] = effectiveFootprint(it);
        const isDragging = drag?.id === it.id;
        const x = isDragging ? drag.x : (it.pos_x || 0);
        const y = isDragging ? drag.y : (it.pos_y || 0);
        const outOfBounds = x < -0.01 || y < -0.01 || x + ew > W + 0.01 || y + el > L + 0.01;
        const cls = `furn${selectedId === it.id ? ' selected' : ''}${outOfBounds ? ' oob' : ''}`;
        const fontSize = Math.min(0.6, ew / Math.max(4, it.name.length * 0.62), el / 1.5);
        return (
          <g
            key={it.id}
            className={cls}
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={(e) => onPointerDown(e, it)}
            onPointerMove={(e) => onPointerMove(e, it)}
            onPointerUp={(e) => onPointerUp(e, it)}
          >
            <rect x={x} y={y} width={ew} height={el} rx={0.1} fill={colorFor(it.name)} fillOpacity={0.82}
              stroke="#0f172a" strokeWidth={0.04} vectorEffect="non-scaling-stroke" />
            <text x={x + ew / 2} y={y + el / 2} fontSize={fontSize} className="furn-label"
              textAnchor="middle" dominantBaseline="central">
              {it.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
