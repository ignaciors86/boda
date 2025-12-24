import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTrackSelect = (track, index) => {
    if (isAnimating) return; // Prevenir múltiples clics durante la animación
    
    setIsAnimating(true);
    
    // Crear timeline para la animación de salida
    const tl = gsap.timeline({
      onComplete: () => {
        // Llamar al callback después de que termine la animación
        onTrackSelect(track);
      }
    });

    // Fade out del título - más lento y suave
    if (titleRef.current) {
      tl.to(titleRef.current, {
        opacity: 0,
        duration: 1.2,
        ease: 'power1.out'
      }, 0);
    }

    // Animar todos los botones a scale 0 con delays escalonados - más lento
    buttonsRef.current.forEach((buttonRef, i) => {
      if (buttonRef) {
        const delay = i * 0.15; // Delay escalonado de 0.15s entre cada botón
        
        // Capturar la posición actual del botón (incluyendo el translateY de la flotación)
        const computedStyle = window.getComputedStyle(buttonRef);
        const matrix = new DOMMatrix(computedStyle.transform);
        const currentTranslateY = matrix.m42; // m42 es el translateY en la matriz
        
        // Pausar la animación CSS de flotación
        gsap.set(buttonRef, { animation: 'none' });
        
        // Establecer la posición actual antes de animar
        gsap.set(buttonRef, { 
          y: currentTranslateY,
          transformOrigin: 'center center'
        });
        
        // Animar desde la posición actual
        tl.to(buttonRef, {
          scale: 0,
          opacity: 0,
          y: currentTranslateY, // Mantener el Y actual durante la animación
          duration: 0.8,
          ease: 'power2.in',
          transformOrigin: 'center center'
        }, delay);
      }
    });
  };

  return (
    <div className="intro-overlay">
      <div className="intro">
        <h2 ref={titleRef} className="intro__title">Selecciona una canción</h2>
        <div className="intro__buttons">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              ref={el => buttonsRef.current[index] = el}
              className="intro__button"
              onClick={(e) => {
                e.stopPropagation();
                handleTrackSelect(track, index);
              }}
            >
              <span className="intro__button-text">{track.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Intro;

