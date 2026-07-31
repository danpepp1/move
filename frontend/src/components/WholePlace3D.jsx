import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { colorFor, effectiveFootprint } from './furniture.js';

// The whole apartment in 3D: each room a floor tile, furniture as labeled boxes,
// all positioned by the room origins. Orbit/pan/zoom around the entire place.
export default function WholePlace3D({ rooms, itemsByRoom }) {
  const extX = Math.max(1, ...rooms.map((r) => (r.origin_x || 0) + (r.width_ft || 12)));
  const extY = Math.max(1, ...rooms.map((r) => (r.origin_y || 0) + (r.length_ft || 12)));
  const span = Math.max(extX, extY);

  return (
    <div className="planner3d">
      <Canvas camera={{ position: [span * 0.15, span * 1.15, span * 1.15], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={['#0b1220']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[span, span * 1.6, span]} intensity={0.85} />

        {rooms.map((room) => {
          const w = room.width_ft || 12;
          const l = room.length_ft || 12;
          const ox = room.origin_x || 0;
          const oy = room.origin_y || 0;
          const cx = ox + w / 2 - extX / 2;
          const cz = oy + l / 2 - extY / 2;
          return (
            <group key={room.id}>
              {/* room floor tile */}
              <mesh position={[cx, 0.05, cz]}>
                <boxGeometry args={[w, 0.1, l]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
              <Text position={[cx, 0.2, cz - l / 2 + 0.8]} fontSize={0.7} color="#94a3b8"
                anchorX="center" anchorY="middle" rotation={[-Math.PI / 2, 0, 0]}>
                {room.name}
              </Text>
              {/* furniture */}
              {(itemsByRoom[room.id] || []).map((it) => {
                const [ew, el] = effectiveFootprint(it);
                const h = it.height_ft || 2.5;
                const fx = ox + (it.pos_x || 0) + ew / 2 - extX / 2;
                const fz = oy + (it.pos_y || 0) + el / 2 - extY / 2;
                return (
                  <mesh key={it.id} position={[fx, 0.1 + h / 2, fz]}>
                    <boxGeometry args={[ew, h, el]} />
                    <meshStandardMaterial color={colorFor(it.name)} />
                  </mesh>
                );
              })}
            </group>
          );
        })}

        <OrbitControls makeDefault enablePan target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
