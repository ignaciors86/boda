import React, { useRef, useState, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import Croqueta from '../Croqueta/Croqueta';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect, selectedTrackId = null, isDirectUri = false }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef(null);
  const [croquetasUnlocked, setCroquetasUnlocked] = useState(false);
  const rotationTimelinesRef = useRef([]);

  // Resetear estado de desbloqueo cuando cambia selectedTrackId
  useEffect(() => {
    setCroquetasUnlocked(false);
  }, [selectedTrackId]);
  
  // Animación de entrada cuando el componente se monta
  useEffect(() => {
    // Inicializar elementos con opacidad 0 y scale 0
    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: -30 });
    }
    
    buttonsRef.current.forEach((buttonRef) => {
      if (buttonRef) {
        gsap.set(buttonRef, { opacity: 0, scale: 0, rotation: 0 });
      }
    });

    if (overlayRef.current) {
      gsap.set(overlayRef.current, { opacity: 0 });
    }

    // Crear timeline para la animación de entrada
    const tl = gsap.timeline();

    // Fade in del overlay con efecto glass elegante
    if (overlayRef.current) {
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out'
      });
    }

    // Fade in del título - asegurar que se muestre
    if (titleRef.current) {
      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: 'power2.out',
        onComplete: () => {
          // Asegurar que el título esté visible incluso si hay algún problema
          if (titleRef.current) {
            gsap.set(titleRef.current, { opacity: 1, y: 0 });
          }
        }
      }, '-=0.5');
    }

    // Animación escalonada de los botones
    buttonsRef.current.forEach((buttonRef, i) => {
      if (buttonRef) {
        tl.to(buttonRef, {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)'
        }, 0.4 + (i * 0.1));
      }
    });
  }, []);

  // Iniciar rotación suave continua para cada croqueta
  useEffect(() => {
    // Limpiar timelines anteriores
    rotationTimelinesRef.current.forEach(tl => {
      if (tl) tl.kill();
    });
    rotationTimelinesRef.current = [];

    buttonsRef.current.forEach((buttonRef, index) => {
      if (!buttonRef) return;

      // Rotación suave y continua
      const rotationSpeed = 20 + Math.random() * 10; // Entre 20 y 30 segundos por rotación completa
      const direction = Math.random() > 0.5 ? 1 : -1; // Dirección aleatoria
      
      const tl = gsap.to(buttonRef, {
        rotation: `+=${360 * direction}`,
        duration: rotationSpeed,
        ease: 'none',
        repeat: -1
      });

      rotationTimelinesRef.current[index] = tl;
    });

    return () => {
      rotationTimelinesRef.current.forEach(tl => {
        if (tl) tl.kill();
      });
      rotationTimelinesRef.current = [];
    };
  }, [tracks]);

  const handleTrackSelect = (track, index) => {
    if (isAnimating) return;
    
    // Si hay una croqueta activa por URI y se hace clic en ella, desbloquear todas
    if (isDirectUri && selectedTrackId && track && (
      track.id === selectedTrackId || 
      (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
    )) {
      setCroquetasUnlocked(true);
    }
    
    // Si las croquetas están bloqueadas y no es la activa, no hacer nada
    if (isDirectUri && !croquetasUnlocked && selectedTrackId && track && !(
      track.id === selectedTrackId || 
      (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
    )) {
      return;
    }
    
    setIsAnimating(true);

    // Detener rotaciones
    rotationTimelinesRef.current.forEach(tl => {
      if (tl) tl.kill();
    });

    // Crear timeline para la animación de salida
    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        if (onTrackSelect) {
          onTrackSelect(track);
        }
      }
    });

    // Fade out del título
    if (titleRef.current) {
      tl.to(titleRef.current, {
        opacity: 0,
        y: -30,
        duration: 1.2,
        ease: 'power2.in'
      });
    }

    // Animación de salida de los botones (el pulsado primero)
    buttonsRef.current.forEach((buttonRef, i) => {
      if (!buttonRef) return;
      
      // El botón pulsado desaparece primero (delay 0)
      // Los demás con delay relativo
      const delay = i === index ? 0 : Math.abs(i - index) * 0.1;
      
      tl.to(buttonRef, {
        scale: 0,
        opacity: 0,
        rotation: `+=${i === index ? 180 : 0}`,
        duration: 0.8,
        ease: 'power2.in',
        transformOrigin: 'center center'
      }, delay);
    });
  };

  // Memoizar el renderizado para evitar guiños
  const memoizedTracks = useMemo(() => tracks, [tracks]);

  return (
    <div 
      className="intro-overlay" 
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          e.preventDefault();
        }
      }}
    >
      <div className="intro">
        <h2 ref={titleRef} className="intro__title">Coge una croqueta</h2>
        
        {/* Croqueta activa en absolute, centrada */}
        {memoizedTracks.map((track, index) => {
          const isMainCroqueta = selectedTrackId && track && (
            track.id === selectedTrackId || 
            (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
          );
          
          if (!isMainCroqueta) return null;
          
          const isLocked = isDirectUri && !croquetasUnlocked && !isMainCroqueta;
          
          const getCroquetaSize = () => {
            if (isDirectUri) {
              return {
                width: '28vw',
                height: '28vw',
                minWidth: '25vw',
                minHeight: '25vw',
                maxWidth: '32vw',
                maxHeight: '32vw',
              };
            } else {
              return {
                width: '25vw',
                height: '25vw',
                minWidth: '22vw',
                minHeight: '22vw',
                maxWidth: '28vw',
                maxHeight: '28vw',
              };
            }
          };
          
          return (
            <Croqueta
              key={track.id}
              index={index}
              text={track.name}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleTrackSelect(track, index);
              }}
              rotation={0}
              className={`intro__button main-croqueta ${isDirectUri ? 'croqueta-active-uri' : ''} ${isLocked ? 'croqueta-locked' : ''}`}
              style={{
                ...getCroquetaSize(),
                pointerEvents: isLocked ? 'none' : 'auto',
              }}
              ref={el => {
                if (el) {
                  buttonsRef.current[index] = el;
                } else {
                  const idx = buttonsRef.current.indexOf(el);
                  if (idx !== -1) {
                    buttonsRef.current[idx] = null;
                  }
                }
              }}
            />
          );
        })}
        
        {/* Resto de croquetas en flexbox */}
        <div className="intro__buttons">
          {memoizedTracks.map((track, index) => {
            const isMainCroqueta = selectedTrackId && track && (
              track.id === selectedTrackId || 
              (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
            );
            
            // Saltar la croqueta activa (ya está renderizada arriba)
            if (isMainCroqueta) return null;
            
            const isLocked = isDirectUri && !croquetasUnlocked && !isMainCroqueta;
            
            return (
              <Croqueta
                key={track.id}
                index={index}
                text={track.name}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTrackSelect(track, index);
                }}
                rotation={0}
                className={`intro__button ${isLocked ? 'croqueta-locked' : ''}`}
                style={{
                  width: '15vw',
                  height: '15vw',
                  minWidth: '12vw',
                  minHeight: '12vw',
                  maxWidth: '20vw',
                  maxHeight: '20vw',
                  pointerEvents: isLocked ? 'none' : 'auto',
                }}
                ref={el => {
                  if (el) {
                    buttonsRef.current[index] = el;
                  } else {
                    const idx = buttonsRef.current.indexOf(el);
                    if (idx !== -1) {
                      buttonsRef.current[idx] = null;
                    }
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Intro;
