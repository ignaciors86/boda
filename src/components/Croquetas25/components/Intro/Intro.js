import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef(null);

  // Animación de entrada cuando el componente se monta
  useEffect(() => {
    // Inicializar elementos con opacidad 0 y scale 0
    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: -30 });
    }
    
    buttonsRef.current.forEach((buttonRef) => {
      if (buttonRef) {
        gsap.set(buttonRef, { opacity: 0, scale: 0 });
      }
    });

    if (overlayRef.current) {
      gsap.set(overlayRef.current, { opacity: 0 });
    }

    // Crear timeline para la animación de entrada
    const tl = gsap.timeline();

    // Fade in del overlay
    if (overlayRef.current) {
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out'
      });
    }

    // Fade in del título
    if (titleRef.current) {
      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.2);
    }

    // Animación escalonada de los botones (similar a la salida pero al revés)
    buttonsRef.current.forEach((buttonRef, i) => {
      if (buttonRef) {
        tl.to(buttonRef, {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)'
        }, 0.4 + (i * 0.1)); // Stagger de 0.1s entre cada botón
      }
    });
  }, []);

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
    // El botón pulsado (index) debe ser el primero (delay 0)
    buttonsRef.current.forEach((buttonRef, i) => {
      if (buttonRef) {
        // El botón pulsado tiene delay 0, los demás tienen delays escalonados después
        let delay;
        if (i === index) {
          delay = 0; // El botón pulsado es el primero
        } else if (i < index) {
          // Botones antes del pulsado: delay basado en su posición + 0.1s después del pulsado
          delay = (i + 1) * 0.15;
        } else {
          // Botones después del pulsado: delay basado en su posición
          delay = (i - index) * 0.15;
        }
        
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
    <div className="intro-overlay" ref={overlayRef}>
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

