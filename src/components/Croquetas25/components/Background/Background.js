import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import './Background.scss';

const Background = ({ onTriggerCallbackRef }) => {
  const [squares, setSquares] = useState([]);
  const squareRefs = useRef({});
  const lastProgressRef = useRef(0);

  useEffect(() => {
    console.log(`[Background] Setting up trigger callback | onTriggerCallbackRef exists: ${!!onTriggerCallbackRef} | timestamp: ${Date.now()}`);
    if (onTriggerCallbackRef) {
      onTriggerCallbackRef.current = (type, data = {}) => {
        const id = `square-${Date.now()}-${Math.random()}`;
        const timestamp = Date.now();
        const squareData = { 
          id, 
          type, // 'beat' | 'progress' | 'custom'
          data,
          timestamp
        };
        console.log(`[Background] Trigger callback called | type: ${type} | data: ${JSON.stringify(data)} | id: ${id} | timestamp: ${timestamp}`);
        try {
          setSquares(prev => {
            const newSquares = [...prev, squareData];
            console.log(`[Background] Square added | new squares count: ${newSquares.length} | square id: ${id}`);
            return newSquares;
          });
        } catch (error) {
          console.error(`[Background] ERROR adding square: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })}`);
        }
      };
      console.log(`[Background] Trigger callback set successfully`);
    } else {
      console.warn(`[Background] onTriggerCallbackRef is null, cannot set callback`);
    }
  }, [onTriggerCallbackRef]);

  useEffect(() => {
    console.log(`[Background] Squares effect triggered | squares count: ${squares.length} | timestamp: ${Date.now()}`);
    squares.forEach(square => {
      const el = squareRefs.current[square.id];
      const hasElement = !!el;
      const isAnimated = el && el.animated;
      console.log(`[Background] Processing square | id: ${square.id} | type: ${square.type} | hasElement: ${hasElement} | isAnimated: ${isAnimated}`);
      
      if (el && !el.animated) {
        el.animated = true;
        
        // Duración basada en el tipo de trigger
        // Los beats pueden tener duración diferente a los de progreso
        const duration = square.type === 'beat' ? 3 : 2.5;
        
        console.log(`[Background] Starting GSAP animation | square id: ${square.id} | type: ${square.type} | duration: ${duration} | ease: ${square.type === 'beat' ? 'power2.out' : 'power1.out'}`);
        
        try {
          gsap.fromTo(el, 
            { scale: 0, z: -600 },
            {
              scale: 1,
              z: 400,
              duration: duration,
              ease: square.type === 'beat' ? 'power2.out' : 'power1.out',
              onComplete: () => {
                console.log(`[Background] GSAP animation complete | square id: ${square.id}`);
                setSquares(prev => prev.filter(s => s.id !== square.id));
              }
            }
          );
          console.log(`[Background] GSAP animation started successfully | square id: ${square.id}`);
        } catch (error) {
          console.error(`[Background] ERROR starting GSAP animation: ${error.message} | stack: ${error.stack} | error object: ${JSON.stringify({ name: error.name, message: error.message })} | square id: ${square.id}`);
        }
      } else if (!el) {
        console.warn(`[Background] Square element not found in refs | square id: ${square.id} | available refs: ${Object.keys(squareRefs.current).join(', ')}`);
      } else if (isAnimated) {
        console.log(`[Background] Square already animated, skipping | square id: ${square.id}`);
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

