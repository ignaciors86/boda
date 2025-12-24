import React, { useRef, useEffect } from 'react';
import './Sphere.scss';

const Sphere = ({ children, speed = 4, direction = 1 }) => {
  const sphereRef = useRef(null);

  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;

    let animationFrame;
    let rotation = { 
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2
    };
    
    const speedX = (Math.random() * 0.01 + 0.005) * direction;
    const speedY = (Math.random() * 0.01 + 0.005) * direction;

    const animate = () => {
      rotation.x += speedX;
      rotation.y += speedY;
      
      sphere.style.transform = `
        rotateX(${rotation.x}rad)
        rotateY(${rotation.y}rad)
        translateZ(0)
      `;
      
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [direction, speed]);

  // Crear las caras de la esfera
  const faces = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const x = Math.cos(angle) * 50;
    const y = Math.sin(angle) * 50;
    
    return (
      <div
        key={i}
        className="sphere-face"
        style={{
          transform: `translateZ(50px) rotateY(${angle}rad)`,
          background: `radial-gradient(circle at ${x}% ${y}%, #fff7 0%, #ffb300 60%, #ff9800 85%, #c77600 98%, transparent 100%)`
        }}
      />
    );
  });

  return (
    <div className="sphere-container" ref={sphereRef}>
      <div className="sphere">
        {faces}
        <div className="sphere-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Sphere; 