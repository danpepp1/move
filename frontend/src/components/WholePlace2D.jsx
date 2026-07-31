import React, { useRef, useState } from 'react';
import { colorFor, effectiveFootprint } from './furniture.js';

// Top-down view of the WHOLE apartment: every room at its origin, furniture
// inside. Drag a room to arrange the place to match your floor plan; a plain
// tap (no drag) opens that room's furniture editor. `canvas` (the fixed {w,l}
// drawing area in feet) is passed in so the scale is stable while dragging and
// big enough to hold the whole layout.
export default function WholePlace2D({ rooms, itemsByRoom, canvas, onMoveRoom, onOpenRoom }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, x, y, moved }

  const feetPerPixel = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r && r.width ? canvas.w / r.width : 1;
  };

  const onDown = (e, room) => {
    e.stopPropagation();
    const fpp = feetPerPixel();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget._d = { cx: e.clientX, cy: e.clientY, ox: room.origin_x || 0, oy: room.origin_y || 0, fpp };
    setDrag({ id: room.id, x: room.origin_x || 0, y: room.origin_y || 0, moved: false });
  };
  const onMove = (e, room) => {
    const d = e.currentTarget._d;
    if (!d) return;
    const x = Math.max(0, Math.min(d.ox + (e.clientX - d.cx) * d.fpp, Math.max(0, canvas.w - (room.width_ft || 12))));
    const y = Math.max(0, Math.min(d.oy + (e.clientY - d.cy) * d.fpp, Math.max(0, canvas.l - (room.length_ft || 12))));
    const moved = Math.abs(x - d.ox) > 0.1 || Math.abs(y - d.oy) > 0.1;
    setDrag({ id: room.id, x, y, moved });
  };
  const onUp = (e, room) => {
    const d = e.currentTarget._d;
    e.currentTarget._d = null;
    if (drag && drag.id === room.id) {
      if (drag.moved) onMoveRoom(room.id, { origin_x: Math.round(drag.x * 100) / 100, origin_y: Math.round(drag.y * 100) / 100 });
      else onOpenRoom(room.id);
    }
    setDrag(null);
  };

  return (
    <svg ref={svgRef} className="planner2d" viewBox={`-0.3 -0.3 ${canvas.w + 0.6} ${canvas.l + 0.6}`}>
      {rooms.map((room) => {
        const isDragging = drag?.id === room.id;
        const ox = isDragging ? drag.x : (room.origin_x || 0);
        const oy = isDragging ? drag.y : (room.origin_y || 0);
        const w = room.width_ft || 12;
        const l = room.length_ft || 12;
        const labelSize = Math.min(0.8, w / Math.max(5, room.name.length * 0.6));
        return (
          <g key={room.id} style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={(e) => onDown(e, room)} onPointerMove={(e) => onMove(e, room)} onPointerUp={(e) => onUp(e, room)}>
            <rect x={ox} y={oy} width={w} height={l} className="room-floor" />
            <rect x={ox} y={oy} width={w} height={l} className="room-wall" vectorEffect="non-scaling-stroke" />
            {(itemsByRoom[room.id] || []).map((it) => {
              const [ew, el] = effectiveFootprint(it);
              return (
                <rect key={it.id} x={ox + (it.pos_x || 0)} y={oy + (it.pos_y || 0)} width={ew} height={el} rx={0.08}
                  fill={colorFor(it.name)} fillOpacity={0.82} stroke="#0f172a" strokeWidth={0.03} vectorEffect="non-scaling-stroke" />
              );
            })}
            <text x={ox + w / 2} y={oy + 0.9} fontSize={labelSize} className="room-name-label"
              textAnchor="middle" dominantBaseline="middle">{room.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
