import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import Croqueta from '../Croqueta/Croqueta';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const buttonsContainerRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef(null);
  const croquetasDataRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Animación de entrada cuando el componente se monta
  useEffect(() => {
    // Inicializar elementos con opacidad 0 y scale 0
    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: -30 });
    }
    
    buttonsRef.current.forEach((buttonRef) => {
      if (buttonRef) {
        gsap.set(buttonRef, { opacity: 0, scale: 0, rotation: 0, x: 0, y: 0 });
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

  // Inicializar sistema de física después de que los botones se rendericen
  useEffect(() => {
    // Limpiar animación anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Limpiar datos anteriores
    croquetasDataRef.current = [];
    
    if (buttonsRef.current.length === 0) return;
    
    // Pequeño delay para asegurar que los elementos están renderizados
    const timer = setTimeout(() => {
      initPhysics();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [tracks]);
  
  // Ajustar tamaño de croquetas en resize con transición suave
  useEffect(() => {
    const handleResize = () => {
      if (croquetasDataRef.current.length === 0) return;
      
      // Recalcular tamaños basados en viewport
      const vw = window.innerWidth / 100;
      const baseSize = Math.max(12 * vw, Math.min(20 * vw, 15 * vw));
      
      croquetasDataRef.current.forEach(croqueta => {
        if (croqueta.element) {
          // Animar el cambio de tamaño suavemente
          gsap.to(croqueta.element, {
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Factor de velocidad ajustable (reducir para hacer más lentas)
  const SPEED_FACTOR = 0.3; // Factor global de velocidad (ajustable)

  // Inicializar sistema de física
  const initPhysics = () => {
    if (buttonsRef.current.length === 0) return;

    const container = buttonsContainerRef.current;
    if (!container) return;

    // Esperar a que los elementos se rendericen
    requestAnimationFrame(() => {
      // Usar window.innerWidth/Height para que funcione en portrait y landscape
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      // Corrección del offset del contenedor en unidades relativas
      const offsetVW = 8; // Aproximadamente 150px en una pantalla de 1920px
      const vw = window.innerWidth / 100;
      const offsetPx = offsetVW * vw;
      const containerRect = container.getBoundingClientRect();
      const containerLeft = containerRect.left - offsetPx;
      const containerTop = containerRect.top - offsetPx;
      const marginVW = 2;
      const margin = marginVW * vw;

      const croquetasData = [];
      buttonsRef.current.forEach((buttonRef, index) => {
        if (buttonRef && buttonRef.parentNode) {
          // Obtener el SVG dentro del botón
          const svgElement = buttonRef.querySelector('.croqueta__svg');
          if (!svgElement) return;

          // Obtener el bounding box del SVG (los trazos)
          const svgRect = svgElement.getBoundingClientRect();
          const svgWidth = svgRect.width;
          const svgHeight = svgRect.height;
          const svgSize = Math.max(svgWidth, svgHeight);

          // Distribución uniforme en una cuadrícula
          const totalButtons = buttonsRef.current.length;
          const cols = Math.ceil(Math.sqrt(totalButtons));
          const rows = Math.ceil(totalButtons / cols);
          const cellWidth = (containerWidth - 2 * margin) / cols;
          const cellHeight = (containerHeight - 2 * margin) / rows;
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          // Posición base en el centro de la celda
          const baseX = margin + col * cellWidth + cellWidth / 2;
          const baseY = margin + row * cellHeight + cellHeight / 2;
          
          // Añadir variación aleatoria pequeña para que no estén perfectamente alineadas
          const variationX = (Math.random() - 0.5) * cellWidth * 0.3;
          const variationY = (Math.random() - 0.5) * cellHeight * 0.3;
          
          // Asegurar que no se salgan de los márgenes
          const x = Math.max(margin + svgWidth / 2, Math.min(containerWidth - margin - svgWidth / 2, baseX + variationX));
          const y = Math.max(margin + svgHeight / 2, Math.min(containerHeight - margin - svgHeight / 2, baseY + variationY));

          const minScale = 1.2;
          const maxScale = 1.5;
          const baseScale = Math.random() * (maxScale - minScale) + minScale;
          const angle = Math.random() * Math.PI * 2;
          const speed = (Math.random() * 0.2 + 0.1) * SPEED_FACTOR; // Velocidad más lenta con factor
          const freq = Math.random() * 0.5 + 0.2;
          const phase = Math.random() * Math.PI * 2;

          const croquetaObj = {
            element: buttonRef,
            svgElement: svgElement,
            x,
            y,
            baseScale,
            minScale,
            maxScale,
            angle,
            speed,
            freq,
            phase,
            svgWidth,
            svgHeight,
            svgSize,
            containerLeft, // Guardar offset del contenedor
            containerTop,
          };
          croquetasData.push(croquetaObj);
          // Posicionar relativo al contenedor (GSAP usa coordenadas absolutas)
          gsap.set(buttonRef, { x: containerLeft + x, y: containerTop + y, scale: baseScale });
        }
      });
      croquetasDataRef.current = croquetasData;

      // Función de animación con física y colisiones
      function animate(time) {
        const croquetas = croquetasDataRef.current;
        if (!croquetas || croquetas.length === 0) {
          animationFrameRef.current = null;
          return;
        }
        
        // Verificar que todos los elementos aún existen
        const validCroquetas = croquetas.filter(c => c.element && c.element.parentNode);
        if (validCroquetas.length !== croquetas.length) {
          // Si algunos elementos fueron removidos, actualizar la referencia
          croquetasDataRef.current = validCroquetas;
          if (validCroquetas.length === 0) {
            animationFrameRef.current = null;
            return;
          }
        }

        // Obtener el tamaño del contenedor (usar window para asegurar que funcione en landscape)
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        
        // Recalcular offset en cada frame por si cambia el tamaño de la ventana
        const currentVw = window.innerWidth / 100;
        const currentOffsetPx = offsetVW * currentVw;

        // Obtener dimensiones del título para colisiones
        let titleRect = null;
        if (titleRef.current) {
          const titleBoundingRect = titleRef.current.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          // Convertir a coordenadas relativas al contenedor
          titleRect = {
            left: titleBoundingRect.left - containerRect.left + currentOffsetPx,
            top: titleBoundingRect.top - containerRect.top + currentOffsetPx,
            right: titleBoundingRect.right - containerRect.left + currentOffsetPx,
            bottom: titleBoundingRect.bottom - containerRect.top + currentOffsetPx,
            width: titleBoundingRect.width,
            height: titleBoundingRect.height
          };
        }

        // Detectar colisiones entre croquetas usando el tamaño del SVG con repulsión suave
        for (let i = 0; i < croquetas.length; i++) {
          for (let j = i + 1; j < croquetas.length; j++) {
            const a = croquetas[i];
            const b = croquetas[j];
            
            // Verificar que ambos elementos existen
            if (!a.element || !b.element || !a.element.parentNode || !b.element.parentNode) continue;
            
            const t = (time || 0) / 1000;
            const scaleA = a.minScale + (a.maxScale - a.minScale) * 0.5 * (1 + Math.sin(a.freq * t + a.phase));
            const scaleB = b.minScale + (b.maxScale - b.minScale) * 0.5 * (1 + Math.sin(b.freq * t + b.phase));

            // Usar el tamaño del SVG escalado para las colisiones con factor de separación
            const COLLISION_FACTOR = 0.95; // Factor para que reboten antes (menor = rebotan más temprano)
            const REPULSION_DISTANCE = 1.5; // Distancia adicional para repulsión suave (aumentado)
            const widthA = a.svgWidth * scaleA;
            const heightA = a.svgHeight * scaleA;
            const widthB = b.svgWidth * scaleB;
            const heightB = b.svgHeight * scaleB;
            const rA = (Math.max(widthA, heightA) / 2) * COLLISION_FACTOR;
            const rB = (Math.max(widthB, heightB) / 2) * COLLISION_FACTOR;
            const minDist = (rA + rB) * REPULSION_DISTANCE;

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist && dist > 0) {
              // Calcular fuerza de repulsión suave pero más fuerte
              const nx = dx / dist;
              const ny = dy / dist;
              
              // Fuerza proporcional a la cercanía (más cerca = más fuerza) - aumentada
              const overlap = minDist - dist;
              const repulsionForce = overlap * 0.4; // Factor de suavidad aumentado
              
              // Aplicar repulsión a ambas croquetas
              a.x += nx * repulsionForce;
              a.y += ny * repulsionForce;
              b.x -= nx * repulsionForce;
              b.y -= ny * repulsionForce;
              
              // Cambiar dirección más agresivamente para evitar mezclarse
              const dotA = Math.cos(a.angle) * nx + Math.sin(a.angle) * ny;
              const dotB = Math.cos(b.angle) * (-nx) + Math.sin(b.angle) * (-ny);
              
              // Reflejar ángulos más agresivamente
              a.angle = a.angle - 2 * dotA * Math.atan2(ny, nx) * 0.6;
              b.angle = b.angle - 2 * dotB * Math.atan2(-ny, -nx) * 0.6;
              
              // Normalizar ángulos
              a.angle = ((a.angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
              b.angle = ((b.angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            }
          }
        }

        // Mover cada croqueta
        croquetas.forEach(croqueta => {
          // Verificar que el elemento aún existe y está en el DOM
          if (!croqueta.element || !croqueta.element.parentNode) return;
          
          // Actualizar offset del contenedor en caso de resize (con corrección relativa)
          const currentContainerRect = container.getBoundingClientRect();
          const currentVw = window.innerWidth / 100;
          const currentOffsetPx = offsetVW * currentVw;
          const currentContainerLeft = currentContainerRect.left - currentOffsetPx;
          const currentContainerTop = currentContainerRect.top - currentOffsetPx;
          croqueta.containerLeft = currentContainerLeft;
          croqueta.containerTop = currentContainerTop;

          // Movimiento con factor de velocidad
          let newX = croqueta.x + Math.cos(croqueta.angle) * croqueta.speed;
          let newY = croqueta.y + Math.sin(croqueta.angle) * croqueta.speed;
          const t = (time || 0) / 1000;
          const scale = croqueta.minScale + (croqueta.maxScale - croqueta.minScale) * 0.5 * (1 + Math.sin(croqueta.freq * t + croqueta.phase));

          // Obtener el tamaño actual del SVG escalado
          const currentWidth = croqueta.svgWidth * scale;
          const currentHeight = croqueta.svgHeight * scale;
          const halfWidth = currentWidth / 2;
          const halfHeight = currentHeight / 2;
          const maxRadius = Math.max(halfWidth, halfHeight);

          // Detectar colisión con el título
          if (titleRect) {
            const COLLISION_FACTOR = 0.95;
            const REPULSION_DISTANCE_TITLE = 1.4;
            const croquetaRadius = maxRadius * COLLISION_FACTOR * REPULSION_DISTANCE_TITLE;
            
            // Calcular el centro del título
            const titleCenterX = titleRect.left + titleRect.width / 2;
            const titleCenterY = titleRect.top + titleRect.height / 2;
            const titleHalfWidth = titleRect.width / 2;
            const titleHalfHeight = titleRect.height / 2;
            
            // Verificar si la croqueta colisiona con el título (usando AABB con margen)
            const closestX = Math.max(titleRect.left - croquetaRadius, Math.min(newX, titleRect.right + croquetaRadius));
            const closestY = Math.max(titleRect.top - croquetaRadius, Math.min(newY, titleRect.bottom + croquetaRadius));
            
            const dx = newX - closestX;
            const dy = newY - closestY;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < croquetaRadius * croquetaRadius) {
              // Colisión con el título: rebotar con más fuerza
              const dist = Math.sqrt(distSq);
              if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;
                // Reflejar el ángulo más agresivamente
                const dot = Math.cos(croqueta.angle) * nx + Math.sin(croqueta.angle) * ny;
                croqueta.angle = croqueta.angle - 2 * dot * Math.atan2(ny, nx) * 0.8;
                // Separar la croqueta del título con más fuerza
                const overlap = croquetaRadius - dist;
                newX += nx * overlap * 1.5;
                newY += ny * overlap * 1.5;
              }
            }
          }

          // Rebote en los bordes de la ventana (no del contenedor) basado en el tamaño del SVG
          if (newX < maxRadius) {
            newX = maxRadius;
            croqueta.angle = Math.PI - croqueta.angle;
          } else if (newX > containerWidth - maxRadius) {
            newX = containerWidth - maxRadius;
            croqueta.angle = Math.PI - croqueta.angle;
          }
          if (newY < maxRadius) {
            newY = maxRadius;
            croqueta.angle = -croqueta.angle;
          } else if (newY > containerHeight - maxRadius) {
            newY = containerHeight - maxRadius;
            croqueta.angle = -croqueta.angle;
          }

          croqueta.x = newX;
          croqueta.y = newY;
          // Calcular rotación en grados desde el ángulo
          const rotationDeg = croqueta.angle * 180 / Math.PI;
          // Aplicar posición absoluta sumando el offset del contenedor, con rotación suave
          gsap.set(croqueta.element, { 
            x: currentContainerLeft + croqueta.x, 
            y: currentContainerTop + croqueta.y, 
            scale,
            rotation: rotationDeg,
            transformOrigin: 'center center'
          });
          
          // Actualizar rotación del texto también, manteniendo el centrado
          const textElement = croqueta.element?.querySelector('.croqueta__text');
          if (textElement) {
            // Aplicar rotación manteniendo el translate para centrado
            // Usar xPercent e yPercent para mantener el centrado mientras rotamos
            gsap.set(textElement, {
              rotation: rotationDeg,
              xPercent: -50,
              yPercent: -50,
              transformOrigin: 'center center'
            });
          }
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate();

      // Ajustar posiciones tras resize
      function adjustOnResize() {
        // Usar window para que funcione en portrait y landscape
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        const offsetVW = 8; // Factor de corrección en vw
        const resizeVw = window.innerWidth / 100;
        const resizeOffsetPx = offsetVW * resizeVw;
        const resizeContainerRect = container.getBoundingClientRect();
        const containerLeft = resizeContainerRect.left - resizeOffsetPx;
        const containerTop = resizeContainerRect.top - resizeOffsetPx;
        const croquetas = croquetasDataRef.current;

        croquetas.forEach(croqueta => {
          if (!croqueta.element) return;
          const t = Date.now() / 1000;
          const scale = croqueta.minScale + (croqueta.maxScale - croqueta.minScale) * 0.5 * (1 + Math.sin(croqueta.freq * t + croqueta.phase));
          const currentWidth = croqueta.svgWidth * scale;
          const currentHeight = croqueta.svgHeight * scale;
          const maxRadius = Math.max(currentWidth, currentHeight) / 2;

          let changed = false;
          if (croqueta.x < maxRadius) { croqueta.x = maxRadius; changed = true; }
          if (croqueta.x > containerWidth - maxRadius) { croqueta.x = containerWidth - maxRadius; changed = true; }
          if (croqueta.y < maxRadius) { croqueta.y = maxRadius; changed = true; }
          if (croqueta.y > containerHeight - maxRadius) { croqueta.y = containerHeight - maxRadius; changed = true; }
          if (changed && croqueta.element) {
            // Aplicar posición absoluta sumando el offset del contenedor
            gsap.set(croqueta.element, { x: containerLeft + croqueta.x, y: containerTop + croqueta.y });
          }
        });
      }

      window.addEventListener('resize', adjustOnResize);

      // Retornar función de cleanup
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener('resize', adjustOnResize);
      };
    });
  };

  // Cleanup del sistema de física
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);


  const handleTrackSelect = (track, index) => {
    if (isAnimating) return; // Prevenir múltiples clics durante la animación
    
    setIsAnimating(true);

    // Detener animación de física
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
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
        
        // Capturar posición actual (incluyendo transformaciones GSAP)
        const computedStyle = window.getComputedStyle(buttonRef);
        const matrix = new DOMMatrix(computedStyle.transform);
        const currentX = matrix.m41; // translateX
        const currentY = matrix.m42; // translateY
        const currentRotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
        
        // Establecer la posición actual antes de animar
        gsap.set(buttonRef, { 
          x: currentX,
          y: currentY,
          rotation: currentRotation,
          transformOrigin: 'center center'
        });
        
        // Animar desde la posición actual
        tl.to(buttonRef, {
          scale: 0,
          opacity: 0,
          x: currentX,
          y: currentY,
          rotation: currentRotation + (i === index ? 180 : 0), // Rotar más el botón pulsado
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
        <h2 ref={titleRef} className="intro__title">Coge una croqueta</h2>
        <div className="intro__buttons" ref={buttonsContainerRef}>
          {tracks.map((track, index) => {
            return (
              <Croqueta
                key={track.id}
                index={index}
                text={track.name}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackSelect(track, index);
                }}
                rotation={0}
                className="intro__button"
                style={{
                  width: '20vw',
                  height: '20vw',
                  minWidth: '18vw',
                  minHeight: '18vw',
                  maxWidth: '25vw',
                  maxHeight: '25vw',
                }}
                ref={el => {
                  // Usar callback ref más robusto
                  if (el) {
                    buttonsRef.current[index] = el;
                  } else {
                    // Si el elemento se desmonta, limpiar el ref
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

