import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import './Background.scss';

const Background = ({ onBeatCallbackRef }) => {
  const [squares, setSquares] = useState([]);
  const squareRefs = useRef({});

  useEffect(() => {
    if (onBeatCallbackRef) {
      onBeatCallbackRef.current = () => {
        setSquares(prev => [...prev, { id: `square-${Date.now()}` }]);
      };
    }
  }, [onBeatCallbackRef]);

  useEffect(() => {
    squares.forEach(square => {
      const el = squareRefs.current[square.id];
      if (el && !el.animated) {
        el.animated = true;
        gsap.fromTo(el, 
          { scale: 0, z: -600 },
          {
            scale: 1,
            z: 400,
            duration: 3,
            ease: 'power2.out',
            onComplete: () => setSquares(prev => prev.filter(s => s.id !== square.id))
          }
        );
      }
    });
  }, [squares]);

  return (
    <div className="background">
      <div className="line-diagonal-1" />
      <div className="line-diagonal-2" />
      {squares.map(square => (
        <div
          key={square.id}
          ref={el => squareRefs.current[square.id] = el}
          className="square"
        />
      ))}
    </div>
  );
};

export default Background;

