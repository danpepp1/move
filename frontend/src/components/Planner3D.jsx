import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { colorFor, effectiveFootprint } from './furniture.js';

// One piece of furniture as a labeled box. World coords: room spans x[-W/2,W/2],
// z[-L/2,L/2], y up from the floor at 0. pos_x/pos_y are the top-left corner.
function Piece({ it, W, L }) {
  const [ew, el] = effectiveFootprint(it);
  const h = it.height_ft || 2.5;
  const cx = (it.pos_x || 0) + ew / 2 - W / 2;
  const cz = (it.pos_y || 0) + el / 2 - L / 2;
  return (
    <group position={[cx, h / 2, cz]}>
      <mesh>
        <boxGeometry args={[ew, h, el]} />
        <meshStandardMaterial color={colorFor(it.name)} />
      </mesh>
      <Text position={[0, h / 2 + 0.35, 0]} fontSize={0.42} color="#e2e8f0"
        anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#0f172a">
        {it.name}
      </Text>
    </group>
  );
}

export default function Planner3D({ room, items }) {
  const W = room.width_ft || 12;
  const L = room.length_ft || 12;
  const wallH = 3;
  const t = 0.15; // wall thickness
  const dist = Math.max(W, L);

  return (
    <div className="planner3d">
      <Canvas camera={{ position: [W * 0.85, dist * 0.95, L * 1.1], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={['#0b1220']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[8, 16, 10]} intensity={0.85} />

        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[W, L]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <gridHelper args={[Math.max(W, L), Math.round(Math.max(W, L)), '#334155', '#243244']} position={[0, 0.01, 0]} />

        {/* two walls forming an L (back + left) so you can see in when orbiting */}
        <mesh position={[0, wallH / 2, -L / 2]}>
          <boxGeometry args={[W, wallH, t]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.9} />
        </mesh>
        <mesh position={[-W / 2, wallH / 2, 0]}>
          <boxGeometry args={[t, wallH, L]} />
          <meshStandardMaterial color="#3a4a63" transparent opacity={0.9} />
        </mesh>

        {items.map((it) => <Piece key={it.id} it={it} W={W} L={L} />)}

        <OrbitControls makeDefault enablePan target={[0, 0.5, 0]} />
      </Canvas>
    </div>
  );
}
