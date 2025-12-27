import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import './Background.scss';
import Diagonales from './components/Diagonales/Diagonales';
import { useGallery } from '../Gallery/Gallery';

const MAINCLASS = 'background';

const Background = ({ onTriggerCallbackRef, analyserRef, dataArrayRef, isInitialized, onVoiceCallbackRef, selectedTrack, showOnlyDiagonales = false, currentAudioIndex = null }) => {
  const [squares, setSquares] = useState([]);
  const squareRefs = useRef({});
  const animationTimelinesRef = useRef({});
  const lastProgressRef = useRef(0);
  const colorIndexRef = useRef(0);
  const { getNextImage, allImages, isLoading, preloadNextImages } = useGallery(selectedTrack, null, null, currentAudioIndex);
  const MAX_SQUARES = 50;
  
  // Pre-cargar imágenes próximas cuando cambian las imágenes disponibles
  useEffect(() => {
    if (!isLoading && allImages.length > 0) {
      preloadNextImages();
    }
  }, [isLoading, allImages.length, preloadNextImages]);
  
  useEffect(() => {
    if (!onTriggerCallbackRef || showOnlyDiagonales) return;
    
    const createCallback = () => {
      onTriggerCallbackRef.current = (type, data = {}) => {
      const id = `square-${Date.now()}-${Math.random()}`;
      const lgtbColors = [
        '#FF0080', '#FF8000', '#FFFF00', '#00FF00', '#0080FF', '#8000FF',
        '#00FFFF', '#FF00FF', '#FFFFFF', '#FFB347', '#FFD700', '#C0C0C0',
      ];
      
      const color1 = lgtbColors[colorIndexRef.current % lgtbColors.length];
      const color2 = lgtbColors[(colorIndexRef.current + 1) % lgtbColors.length];
      colorIndexRef.current++;
      
      const intensity = data?.intensity ?? 0.5;
      const shouldHaveBackground = data?.shouldBeSolid ?? false;
      
      // Solo obtener imagen si está lista (pre-cargada)
      let imageUrl = null;
      if (shouldHaveBackground) {
        imageUrl = getNextImage();
        console.log(`[Background] getNextImage llamado, resultado: ${imageUrl ? 'imagen obtenida' : 'null'}`);
      }
      
      // Calcular posición evitando la zona central inferior donde está el prompt
      let imagePosition = null;
      if (shouldHaveBackground && imageUrl) {
        // Zona a evitar: central inferior (donde está el prompt)
        // En landscape: bottom 10%, width 60%, left 20% (zona 20%-80% x, 0%-15% y desde abajo)
        // En portrait: bottom 4%, width 90%, left 5% (zona 5%-95% x, 0%-20% y desde abajo)
        
        // Detectar orientación
        const isPortrait = window.innerHeight > window.innerWidth;
        
        let x, y;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
          // Generar posición aleatoria
          x = 5 + Math.random() * 90; // 5% a 95%
          y = 5 + Math.random() * 90; // 5% a 95%
          
          if (isPortrait) {
            // En portrait: evitar zona 5%-95% x, 80%-100% y (últimos 20% desde abajo)
            const avoidBottomZone = y > 80;
            const avoidCenterX = x >= 5 && x <= 95;
            const inAvoidZone = avoidBottomZone && avoidCenterX;
            
            if (!inAvoidZone) break;
          } else {
            // En landscape: evitar zona 20%-80% x, 85%-100% y (últimos 15% desde abajo)
            const avoidBottomZone = y > 85;
            const avoidCenterX = x >= 20 && x <= 80;
            const inAvoidZone = avoidBottomZone && avoidCenterX;
            
            if (!inAvoidZone) break;
          }
          
          attempts++;
        } while (attempts < maxAttempts);
        
        // Si después de los intentos sigue en zona prohibida, usar posición alternativa
        if (attempts >= maxAttempts) {
          // Forzar posición en zona superior o lateral
          x = Math.random() < 0.5 ? 5 + Math.random() * 15 : 85 + Math.random() * 10; // Lados
          y = 5 + Math.random() * 70; // Zona superior (5% a 75%)
        }
        
        imagePosition = {
          x: `${x}%`,
          y: `${y}%`
        };
      }
      
      if (shouldHaveBackground && !imageUrl) {
        console.log('[Background] Cuadro sólido sin imagen (aún cargando o no disponible)');
      }
      
      // Pre-cargar próximas imágenes de forma proactiva
      if (shouldHaveBackground) {
        preloadNextImages();
      }
      
      const squareData = { 
        id, 
        type,
        data,
        timestamp: Date.now(),
        isTarget: shouldHaveBackground,
        imageUrl: imageUrl,
        imagePosition: imagePosition,
        gradient: {
          color1: color1,
          color2: color2,
          angle: Math.floor(Math.random() * 360)
        }
      };
      
      setSquares(prev => {
        let newSquares = [...prev, squareData];
        if (newSquares.length > MAX_SQUARES) {
          newSquares.sort((a, b) => b.timestamp - a.timestamp);
          const toRemove = newSquares.slice(MAX_SQUARES);
          toRemove.forEach(square => {
            if (animationTimelinesRef.current[square.id]) {
              animationTimelinesRef.current[square.id].kill();
              delete animationTimelinesRef.current[square.id];
            }
            if (squareRefs.current[square.id]) {
              const el = squareRefs.current[square.id];
              if (el) {
                const img = el.querySelector(`.${MAINCLASS}__squareImage`);
                if (img) {
                  img.src = '';
                  img.remove();
                }
              }
              delete squareRefs.current[square.id];
            }
          });
          newSquares = newSquares.slice(0, MAX_SQUARES);
        }
        return newSquares;
      });
    };
    };
    
    createCallback();
  }, [onTriggerCallbackRef, getNextImage, preloadNextImages]);

  useEffect(() => {
    console.log(`[Background] Squares effect triggered | squares count: ${squares.length} | timestamp: ${Date.now()}`);
    squares.forEach(square => {
      const el = squareRefs.current[square.id];
      const hasElement = !!el;
      const isAnimated = el && el.animated;
      console.log(`[Background] Processing square | id: ${square.id} | type: ${square.type} | hasElement: ${hasElement} | isAnimated: ${isAnimated}`);
      
      if (el && !el.animated) {
        el.animated = true;
        
        const intensity = square.data?.intensity ?? 0.5;
        const baseDuration = square.type === 'beat' ? 6 : 5; // Ajustado: más rápido que antes (8/7) pero más lento que la versión anterior (4/3.5)
        const duration = baseDuration - (intensity * 3); // Factor de intensidad ajustado
        
        try {
          const timeline = gsap.timeline();
          const isTarget = square.isTarget;
          
          animationTimelinesRef.current[square.id] = timeline;
          
          const cleanupSquare = () => {
            if (el) {
              const img = el.querySelector(`.${MAINCLASS}__squareImage`);
              if (img) {
                img.src = '';
                img.remove();
              }
            }
            delete squareRefs.current[square.id];
            delete animationTimelinesRef.current[square.id];
            setSquares(prev => prev.filter(s => s.id !== square.id));
          };
          
          if (isTarget) {
            const zStart = -600;
            const zEnd = 400;
            const zAtScale85 = 50;
            const scaleAt85 = 0.85;
            
            const zTotal = zEnd - zStart;
            const zProgressToScale85 = (zAtScale85 - zStart) / zTotal;
            
            const timeToScale85 = duration * 0.55; // Ajustado: un poco más lento que 0.5
            const fadeOutDuration = duration * 0.45; // Ajustado para balancear
            
            timeline.fromTo(el, 
              { 
                scale: 0, 
                z: zStart,
                opacity: 1
              },
              {
                scale: scaleAt85,
                z: zAtScale85,
                opacity: 1,
                duration: timeToScale85,
                ease: 'power1.out',
                force3D: true
              }
            );
            
            timeline.to(el, {
              opacity: 0,
              scale: 0.95,
              z: 100,
              duration: fadeOutDuration,
              ease: 'power2.in',
              force3D: true,
              onComplete: () => {
                // Esperar más tiempo antes de limpiar para asegurar que el fade termine completamente
                // El fadeOutDuration ya es parte de la animación, pero añadimos un pequeño delay extra
                setTimeout(cleanupSquare, 200);
              }
            });
          } else {
            const targetScale = 0.85;
            const scale1 = 1.0;
            const scaleProgressTo1 = 1.0 / targetScale;
            const fadeStartProgress = 0.6; // Ajustado: un poco más lento que 0.5 pero más rápido que 0.7
            const fadeEndProgress = 1.0;
            
            timeline.fromTo(el, 
              { 
                scale: 0, 
                z: -600,
                opacity: 1
              },
              {
                scale: targetScale,
                z: 400,
                opacity: 1,
                duration: duration,
                ease: 'none',
                force3D: true,
                onUpdate: function() {
                  const progress = this.progress();
                  
                  if (progress >= fadeStartProgress) {
                    const fadeProgress = (progress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress);
                    const newOpacity = 1 - fadeProgress;
                    gsap.set(el, { opacity: Math.max(0, newOpacity) });
                  }
                },
                onComplete: () => {
                  // Esperar más tiempo antes de limpiar para asegurar que el fade termine completamente
                  // El fade ya terminó en progress 1.0, pero añadimos un pequeño delay extra
                  setTimeout(cleanupSquare, 200);
                }
              }
            );
          }
        } catch (error) {
          console.error(`[Background] Animation error: ${error.message}`);
          if (squareRefs.current[square.id]) {
            const el = squareRefs.current[square.id];
            if (el) {
              const img = el.querySelector(`.${MAINCLASS}__squareImage`);
              if (img) {
                img.src = '';
                img.remove();
              }
            }
            delete squareRefs.current[square.id];
          }
          delete animationTimelinesRef.current[square.id];
          setSquares(prev => prev.filter(s => s.id !== square.id));
        }
      }
    });
  }, [squares]);

  useEffect(() => {
    return () => {
      Object.values(animationTimelinesRef.current).forEach(timeline => {
        if (timeline) timeline.kill();
      });
      animationTimelinesRef.current = {};
      
      Object.values(squareRefs.current).forEach(el => {
        if (el) {
          const img = el.querySelector(`.${MAINCLASS}__squareImage`);
          if (img) {
            img.src = '';
            img.remove();
          }
        }
      });
      squareRefs.current = {};
      
      setSquares([]);
    };
  }, [selectedTrack]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSquares(prev => {
        if (prev.length > MAX_SQUARES) {
          const squaresToRemoveCount = prev.length - MAX_SQUARES;
          for (let i = 0; i < squaresToRemoveCount; i++) {
            const square = prev[i];
            if (animationTimelinesRef.current[square.id]) {
              animationTimelinesRef.current[square.id].kill();
              delete animationTimelinesRef.current[square.id];
            }
            if (squareRefs.current[square.id]) {
              const el = squareRefs.current[square.id];
              if (el) {
                const img = el.querySelector(`.${MAINCLASS}__squareImage`);
                if (img) {
                  img.src = '';
                  img.remove();
                }
              }
              delete squareRefs.current[square.id];
            }
          }
          return prev.slice(squaresToRemoveCount);
        }
        return prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={MAINCLASS}>
      <Diagonales 
        squares={showOnlyDiagonales ? [] : squares}
        analyserRef={analyserRef}
        dataArrayRef={dataArrayRef}
        isInitialized={showOnlyDiagonales ? true : isInitialized}
        onVoiceCallbackRef={showOnlyDiagonales ? null : onVoiceCallbackRef}
      />
      {!showOnlyDiagonales && squares.map(square => {
        const color1 = square.gradient?.color1 || '#00ffff';
        const color2 = square.gradient?.color2 || '#00ffff';
        const angle = square.gradient?.angle || 45;
        
        return (
          <div
            key={square.id}
            ref={el => squareRefs.current[square.id] = el}
            className={`${MAINCLASS}__square ${square.isTarget ? `${MAINCLASS}__square--target` : ''}`}
            data-square-id={square.id}
            style={{ 
              '--square-color-1': color1,
              '--square-color-2': color2,
              '--square-gradient-angle': `${angle}deg`
            }}
          >
            {square.isTarget && square.imageUrl && (
              <img 
                src={square.imageUrl} 
                alt="Gallery"
                className={`${MAINCLASS}__squareImage`}
                style={{
                  left: square.imagePosition?.x ?? `${5 + Math.random() * 90}%`,
                  top: square.imagePosition?.y ?? `${5 + Math.random() * 90}%`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Background;
