import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import './Background.scss';
import Diagonales from './components/Diagonales/Diagonales';
import { useGallery } from '../Gallery/Gallery';

// Helper para convertir hex a RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 255, 255';
};

const Background = ({ onTriggerCallbackRef, analyserRef, dataArrayRef, isInitialized, onVoiceCallbackRef }) => {
  const [squares, setSquares] = useState([]);
  const squareRefs = useRef({});
  const lastProgressRef = useRef(0);
  const colorIndexRef = useRef(0);
  const squaresWithBackgroundRef = useRef(0); // Contador de cuadros con fondo
  const FADE_OUT_PERCENTAGE = 40; // Porcentaje de scale/avance para iniciar fade out (más temprano)
  const { getRandomImage, allImages, isLoading } = useGallery(); // Hook para obtener imágenes de la galería
  const allImagesRef = useRef([]); // Ref para mantener las imágenes disponibles
  
  // Función helper para obtener imagen aleatoria
  const getRandomImageFromRef = () => {
    if (allImagesRef.current.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allImagesRef.current.length);
    return allImagesRef.current[randomIndex];
  };
  
  // Mantener ref actualizado y actualizar cuadros cuando las imágenes se carguen
  useEffect(() => {
    if (!isLoading && allImages.length > 0) {
      allImagesRef.current = allImages;
      console.log('[Background] Imágenes cargadas:', allImages.length);
      
      // Actualizar cuadros sólidos que no tienen imagen
      setSquares(prev => {
        const squaresToUpdate = prev.filter(square => square.isTarget && !square.imageUrl);
        if (squaresToUpdate.length === 0) return prev;
        
        console.log('[Background] Actualizando', squaresToUpdate.length, 'cuadros sin imagen');
        return prev.map(square => {
          if (square.isTarget && !square.imageUrl) {
            const newImageUrl = getRandomImageFromRef();
            if (newImageUrl) {
              // Asignar posición aleatoria también
              const imagePosition = {
                x: `${25 + Math.random() * 50}%`,
                y: `${25 + Math.random() * 50}%`
              };
              console.log('[Background] Asignando imagen a cuadro:', square.id);
              return { ...square, imageUrl: newImageUrl, imagePosition };
            }
          }
          return square;
        });
      });
    }
  }, [isLoading, allImages.length]);

  // Recrear el callback cuando las imágenes se carguen para asegurar que funcione
  useEffect(() => {
    if (!onTriggerCallbackRef) return;
    
    // Función para crear el callback con acceso a las imágenes actuales
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
      // Determinar si debe tener fondo sólido basado en análisis musical de frecuencias agudas
      // shouldBeSolid viene del análisis de picos en frecuencias treble/presence
      const shouldHaveBackground = data?.shouldBeSolid ?? false;
      
      // Obtener imagen aleatoria si es un cuadro sólido
      const imageUrl = shouldHaveBackground ? getRandomImageFromRef() : null;
      // Calcular posición aleatoria para la imagen (en porcentaje, centrada)
      // Usamos valores entre 25% y 75% para asegurar que no sobresalga
      const imagePosition = shouldHaveBackground && imageUrl ? {
        x: `${25 + Math.random() * 50}%`, // Entre 25% y 75%
        y: `${25 + Math.random() * 50}%`  // Entre 25% y 75%
      } : null;
      
      if (shouldHaveBackground && !imageUrl) {
        console.log('[Background] Cuadro sólido sin imagen (aún cargando)');
      }
      
      const squareData = { 
        id, 
        type,
        data,
        timestamp: Date.now(),
        isTarget: shouldHaveBackground,
        imageUrl: imageUrl, // Imagen para cuadros sólidos
        imagePosition: imagePosition, // Posición aleatoria de la imagen
        gradient: {
          color1: color1,
          color2: color2,
          angle: Math.floor(Math.random() * 360)
        }
      };
      
      setSquares(prev => [...prev, squareData]);
    };
    };
    
    // Crear el callback inicial
    createCallback();
    
    // Recrear el callback cuando las imágenes se carguen
    if (!isLoading && allImagesRef.current.length > 0) {
      createCallback();
      console.log('[Background] Callback recreado con imágenes disponibles');
    }
  }, [onTriggerCallbackRef, isLoading, allImages.length]);

  useEffect(() => {
    console.log(`[Background] Squares effect triggered | squares count: ${squares.length} | timestamp: ${Date.now()}`);
    squares.forEach(square => {
      const el = squareRefs.current[square.id];
      const hasElement = !!el;
      const isAnimated = el && el.animated;
      console.log(`[Background] Processing square | id: ${square.id} | type: ${square.type} | hasElement: ${hasElement} | isAnimated: ${isAnimated}`);
      
      if (el && !el.animated) {
        el.animated = true;
        
        // Duración basada en el tipo de trigger y la intensidad de la música
        // Intensidad va de 0 (baja) a 1 (alta)
        // Con más intensidad, movimiento más rápido (duración menor)
        // Con menos intensidad, movimiento más lento (duración mayor)
        const intensity = square.data?.intensity ?? 0.5; // Default 0.5 si no hay intensidad
        
        // Duración base más lenta (aumentada)
        // Rango: 8 segundos (intensidad baja) a 4 segundos (intensidad alta)
        const baseDuration = square.type === 'beat' ? 8 : 7;
        const duration = baseDuration - (intensity * 4); // De 8s a 4s según intensidad
        
        try {
          const timeline = gsap.timeline();
          const isTarget = square.isTarget;
          
          // Cuadros target (con fondo): crecen hasta 85% con parón, luego desaparecen
          if (isTarget) {
            // Cuadros con fondo: crecen hasta 85% y luego desaparecen
            const zStart = -600;
            const zEnd = 400;
            const zAtScale85 = 50; // z cuando scale debe ser 0.85 (85% del tamaño visible)
            const scaleAt85 = 0.85; // Scale cuando el tamaño visible es 85%
            
            const zTotal = zEnd - zStart; // 1000
            const zProgressToScale85 = (zAtScale85 - zStart) / zTotal; // 0.65 (65%)
            
            // Tiempo hasta scale 0.85: 60% de la duración
            const timeToScale85 = duration * 0.6;
            // Parón en scale 0.85: 10% de la duración
            const pauseDuration = duration * 0.1;
            // Fade out después del parón: 30% de la duración
            const fadeOutDuration = duration * 0.3;
            
            // Animación hasta scale 0.85
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
            
            // Parón en scale 0.85
            timeline.to(el, {
              scale: scaleAt85,
              z: zAtScale85,
              opacity: 1,
              duration: pauseDuration,
              ease: 'none',
              force3D: true
            });
            
            // Fade out después del parón
            timeline.to(el, {
              opacity: 0,
              scale: 0.95,
              z: 100,
              duration: fadeOutDuration,
              ease: 'power2.in',
              force3D: true,
              onComplete: () => {
                setSquares(prev => prev.filter(s => s.id !== square.id));
              }
            });
          } else {
            // Cuadros normales (sin fondo): movimiento continuo y constante
            // La opacidad desaparece progresivamente según avanzan al scale 1
            const targetScale = 0.85;
            const scale1 = 1.0; // Scale objetivo donde deben desaparecer completamente
            
            // Calcular el progreso donde comienza el fade out (cuando scale alcanza 1.0)
            // scale va de 0 a targetScale (0.85), necesitamos saber cuándo sería 1.0
            const scaleProgressTo1 = 1.0 / targetScale; // Progreso donde scale sería 1.0 (1.0/0.85 ≈ 1.176)
            // Pero como el scale máximo es 0.85, nunca alcanzará 1.0
            // En su lugar, hacemos que el fade out comience cuando scale se acerca a targetScale
            // Fade out comienza al 80% del progreso (cuando scale ≈ 0.68) y termina al 100% (scale = 0.85)
            const fadeStartProgress = 0.7; // Comienza fade out al 70% del progreso
            const fadeEndProgress = 1.0; // Termina al 100% (scale = 0.85)
            
            // Animación continua: scale y z se mueven de forma constante y lineal
            // Opacidad disminuye progresivamente según avanzan hacia scale 1
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
                ease: 'none', // Linear, velocidad constante
                force3D: true,
                onUpdate: function() {
                  // Calcular progreso actual (0 a 1)
                  const progress = this.progress();
                  
                  // Si estamos en la zona de fade out, reducir opacidad progresivamente
                  if (progress >= fadeStartProgress) {
                    const fadeProgress = (progress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress);
                    const newOpacity = 1 - fadeProgress; // De 1 a 0
                    gsap.set(el, { opacity: Math.max(0, newOpacity) });
                  }
                },
                onComplete: () => {
                  setSquares(prev => prev.filter(s => s.id !== square.id));
                }
              }
            );
          }
        } catch (error) {
          console.error(`[Background] Animation error: ${error.message}`);
        }
      }
    });
  }, [squares]);

  return (
    <div className="background">
      <Diagonales 
        squares={squares}
        analyserRef={analyserRef}
        dataArrayRef={dataArrayRef}
        isInitialized={isInitialized}
        onVoiceCallbackRef={onVoiceCallbackRef}
      />
      {squares.map(square => {
        const color1 = square.gradient?.color1 || '#00ffff';
        const color2 = square.gradient?.color2 || '#00ffff';
        const angle = square.gradient?.angle || 45;
        
        // Ya no se usa glassColor, los cuadros normales son transparentes
        
        return (
          <div
            key={square.id}
            ref={el => squareRefs.current[square.id] = el}
            className={`square ${square.isTarget ? 'square--target' : ''}`}
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
                className="square-image"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  position: 'absolute',
                  // Posición aleatoria dentro del cuadro, sin sobresalir
                  left: square.imagePosition?.x ?? `${25 + Math.random() * 50}%`,
                  top: square.imagePosition?.y ?? `${25 + Math.random() * 50}%`,
                  transform: `translate(-50%, -50%)`,
                  // Asegurar que no sobresalga usando max constraints
                  boxSizing: 'border-box'
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

