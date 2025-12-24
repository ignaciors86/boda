import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

function RotatingSphere({ children }) {
  const mesh = useRef();
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.01;
      mesh.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 64, 64]} />
      {/* Esfera naranja puro, sin luces */}
      <meshBasicMaterial color="#ff9800" />
      <Html center style={{ pointerEvents: 'none' }}>
        {children}
      </Html>
    </mesh>
  );
}

export default function Sphere3D({ children, style }) {
  return (
    <div style={{ width: '100%', height: '100%', ...style }}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <RotatingSphere>{children}</RotatingSphere>
      </Canvas>
    </div>
  );
} 