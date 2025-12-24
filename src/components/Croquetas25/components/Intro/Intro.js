import React, { useRef, useState, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import Croqueta from '../Croqueta/Croqueta';
import './Intro.scss';

const Intro = ({ tracks, onTrackSelect, selectedTrackId = null, isDirectUri = false }) => {
  const titleRef = useRef(null);
  const buttonsRef = useRef([]);
  const buttonsContainerRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef(null);
  const croquetasDataRef = useRef([]);
  const animationFrameRef = useRef(null);
  const [croquetasUnlocked, setCroquetasUnlocked] = useState(false);

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
        gsap.set(buttonRef, { opacity: 0, scale: 0, rotation: 0, x: 0, y: 0 });
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

    // Fade in del título
    if (titleRef.current) {
      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: 'power2.out'
      }, '-=0.5');
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

          // Obtener el track correspondiente a este botón
          const track = tracks[index];
          const isMainCroqueta = selectedTrackId && track && (
            track.id === selectedTrackId || 
            (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
          );
          
          // Distribución uniforme: todas las croquetas se distribuyen, pero la principal va al centro
          const totalButtons = buttonsRef.current.length;
          const otherButtons = totalButtons - (isMainCroqueta ? 1 : 0);
          
          let x, y, baseScale, minScale, maxScale;
          
          if (isMainCroqueta) {
            // Croqueta principal siempre en el centro exacto
            x = containerWidth / 2;
            y = containerHeight / 2;
            // Si es activa por URI, hacerla un poco más grande
            if (isDirectUri) {
              minScale = 1.8;
              maxScale = 2.0;
              baseScale = 1.9; // Un poco más grande cuando es activa por URI
            } else {
              minScale = 1.6;
              maxScale = 1.8;
              baseScale = 1.7; // 1.5 veces mayor que las otras
            }
          } else {
            // Distribución uniforme para las demás en una cuadrícula, evitando el centro
            const cols = Math.ceil(Math.sqrt(otherButtons + 1)); // +1 para espacio de la principal
            const rows = Math.ceil((otherButtons + 1) / cols);
            const cellWidth = (containerWidth - 2 * margin) / cols;
            const cellHeight = (containerHeight - 2 * margin) / rows;
            
            // Calcular índice relativo (excluyendo la principal)
            let relativeIndex = 0;
            const mainIndex = tracks.findIndex(t => 
              t && selectedTrackId && (
                t.id === selectedTrackId || 
                (t.name && t.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
              )
            );
            
            for (let i = 0; i < tracks.length; i++) {
              if (i === mainIndex) continue; // Saltar la principal
              if (i === index) break; // Llegamos a la actual
              relativeIndex++;
            }
            
            // Ajustar para evitar el centro (donde está la principal)
            const centerCol = Math.floor(cols / 2);
            const centerRow = Math.floor(rows / 2);
            
            let col = relativeIndex % cols;
            let row = Math.floor(relativeIndex / cols);
            
            // Si está en el centro, desplazarlo
            if (col === centerCol && row === centerRow) {
              // Mover a una posición adyacente
              if (relativeIndex % 2 === 0) {
                col = centerCol - 1;
              } else {
                col = centerCol + 1;
              }
            }
            
            // Posición base en el centro de la celda
            const baseX = margin + col * cellWidth + cellWidth / 2;
            const baseY = margin + row * cellHeight + cellHeight / 2;
            
            // Añadir variación aleatoria más pequeña para evitar que se pisen
            const variationX = (Math.random() - 0.5) * cellWidth * 0.2;
            const variationY = (Math.random() - 0.5) * cellHeight * 0.2;
            
            // Asegurar que no se salgan de los márgenes y que no se acerquen demasiado al centro
            const minDistanceFromCenter = Math.min(containerWidth, containerHeight) * 0.25; // 25% del tamaño menor
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            
            let finalX = baseX + variationX;
            let finalY = baseY + variationY;
            
            // Asegurar distancia mínima del centro
            const distFromCenter = Math.sqrt(Math.pow(finalX - centerX, 2) + Math.pow(finalY - centerY, 2));
            if (distFromCenter < minDistanceFromCenter) {
              const angle = Math.atan2(finalY - centerY, finalX - centerX);
              finalX = centerX + Math.cos(angle) * minDistanceFromCenter;
              finalY = centerY + Math.sin(angle) * minDistanceFromCenter;
            }
            
            x = Math.max(margin + svgWidth / 2, Math.min(containerWidth - margin - svgWidth / 2, finalX));
            y = Math.max(margin + svgHeight / 2, Math.min(containerHeight - margin - svgHeight / 2, finalY));

            minScale = 1.0;
            maxScale = 1.3;
            baseScale = Math.random() * (maxScale - minScale) + minScale;
          }
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
            isMainCroqueta, // Guardar si es la principal
          };
          croquetasData.push(croquetaObj);
          
          // Aplicar opacidad reducida si está bloqueada
          const isLocked = isDirectUri && !croquetasUnlocked && !isMainCroqueta;
          const opacity = isLocked ? 0.3 : 1;
          
          // Posicionar relativo al contenedor (GSAP usa coordenadas absolutas)
          gsap.set(buttonRef, { x: containerLeft + x, y: containerTop + y, scale: baseScale, opacity });
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

        // Sistema de repulsión suave entre croquetas
        // Aplicar fuerza de repulsión continua y suave para evitar mezclarse
        const REPULSION_RANGE = 2.0; // Distancia a la que empieza la repulsión (múltiplo del radio)
        const REPULSION_STRENGTH = 0.15; // Fuerza de repulsión (ajustable para suavidad)
        const REPULSION_SMOOTHING = 0.1; // Factor de suavizado para evitar saltos bruscos
        
        for (let i = 0; i < croquetas.length; i++) {
          const a = croquetas[i];
          if (!a.element || !a.element.parentNode) continue;
          
          const t = (time || 0) / 1000;
          const scaleA = a.minScale + (a.maxScale - a.minScale) * 0.5 * (1 + Math.sin(a.freq * t + a.phase));
          const rA = (Math.max(a.svgWidth * scaleA, a.svgHeight * scaleA) / 2);
          
          // Acumulador de fuerzas de repulsión
          let forceX = 0;
          let forceY = 0;
          
          for (let j = 0; j < croquetas.length; j++) {
            if (i === j) continue;
            
            const b = croquetas[j];
            if (!b.element || !b.element.parentNode) continue;
            
            const scaleB = b.minScale + (b.maxScale - b.minScale) * 0.5 * (1 + Math.sin(b.freq * t + b.phase));
            const rB = (Math.max(b.svgWidth * scaleB, b.svgHeight * scaleB) / 2);
            
            // Calcular distancia entre centros
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (rA + rB) * REPULSION_RANGE;
            
            // Si están dentro del rango de repulsión
            if (dist < minDist && dist > 0) {
              // Normalizar dirección
              const nx = dx / dist;
              const ny = dy / dist;
              
              // Calcular fuerza de repulsión (más fuerte cuanto más cerca)
              // Usar una función suave que aumenta gradualmente
              const closeness = 1 - (dist / minDist); // 0 cuando están lejos, 1 cuando están muy cerca
              const force = closeness * closeness * REPULSION_STRENGTH; // Cuadrático para suavidad
              
              // Acumular fuerza
              forceX += nx * force;
              forceY += ny * force;
            }
          }
          
          // Aplicar fuerza de repulsión suavemente (interpolación)
          if (forceX !== 0 || forceY !== 0) {
            // Ajustar dirección del movimiento suavemente hacia la dirección de repulsión
            const currentVelX = Math.cos(a.angle) * a.speed;
            const currentVelY = Math.sin(a.angle) * a.speed;
            
            // Combinar velocidad actual con fuerza de repulsión
            const newVelX = currentVelX + forceX * REPULSION_SMOOTHING;
            const newVelY = currentVelY + forceY * REPULSION_SMOOTHING;
            
            // Calcular nuevo ángulo basado en la velocidad resultante
            const newAngle = Math.atan2(newVelY, newVelX);
            
            // Interpolar suavemente el ángulo para evitar saltos bruscos
            const angleDiff = ((newAngle - a.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
            a.angle += angleDiff * REPULSION_SMOOTHING;
            
            // Normalizar ángulo
            a.angle = ((a.angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            
            // Aplicar desplazamiento suave adicional para separación inmediata
            const separationForce = Math.sqrt(forceX * forceX + forceY * forceY) * 0.5;
            if (separationForce > 0) {
              a.x += (forceX / separationForce) * separationForce * REPULSION_SMOOTHING;
              a.y += (forceY / separationForce) * separationForce * REPULSION_SMOOTHING;
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

          // Repulsión suave con el título
          if (titleRect) {
            const REPULSION_RANGE_TITLE = 1.8;
            const REPULSION_STRENGTH_TITLE = 0.2;
            const REPULSION_SMOOTHING_TITLE = 0.15;
            const croquetaRadius = maxRadius * REPULSION_RANGE_TITLE;
            
            // Calcular el centro del título
            const titleCenterX = titleRect.left + titleRect.width / 2;
            const titleCenterY = titleRect.top + titleRect.height / 2;
            const titleHalfWidth = titleRect.width / 2;
            const titleHalfHeight = titleRect.height / 2;
            
            // Calcular distancia desde el centro de la croqueta al punto más cercano del título
            const closestX = Math.max(titleRect.left, Math.min(newX, titleRect.right));
            const closestY = Math.max(titleRect.top, Math.min(newY, titleRect.bottom));
            
            const dx = newX - closestX;
            const dy = newY - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < croquetaRadius && dist > 0) {
              // Aplicar repulsión suave con el título
              const nx = dx / dist;
              const ny = dy / dist;
              
              // Calcular fuerza de repulsión (más fuerte cuanto más cerca)
              const closeness = 1 - (dist / croquetaRadius);
              const force = closeness * closeness * REPULSION_STRENGTH_TITLE;
              
              // Ajustar dirección del movimiento suavemente
              const currentVelX = Math.cos(croqueta.angle) * croqueta.speed;
              const currentVelY = Math.sin(croqueta.angle) * croqueta.speed;
              
              const newVelX = currentVelX + nx * force * REPULSION_SMOOTHING_TITLE;
              const newVelY = currentVelY + ny * force * REPULSION_SMOOTHING_TITLE;
              
              const newAngle = Math.atan2(newVelY, newVelX);
              const angleDiff = ((newAngle - croqueta.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
              croqueta.angle += angleDiff * REPULSION_SMOOTHING_TITLE;
              
              // Aplicar desplazamiento suave
              newX += nx * force * REPULSION_SMOOTHING_TITLE * 2;
              newY += ny * force * REPULSION_SMOOTHING_TITLE * 2;
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
          // Aplicar opacidad reducida si está bloqueada
          const isLocked = isDirectUri && !croquetasUnlocked && !croqueta.isMainCroqueta;
          const opacity = isLocked ? 0.3 : 1;
          
          gsap.set(croqueta.element, { 
            x: currentContainerLeft + croqueta.x, 
            y: currentContainerTop + croqueta.y, 
            scale,
            rotation: rotationDeg,
            transformOrigin: 'center center',
            opacity
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
    }, [tracks, selectedTrackId, croquetasUnlocked, isDirectUri]);
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
      return; // Bloquear el clic
    }
    
    // Asegurarse de que el evento no se propague y se maneje correctamente
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

  // Memoizar el renderizado para evitar guiños
  const memoizedTracks = useMemo(() => tracks, [tracks]);

  return (
    <div 
      className="intro-overlay" 
      ref={overlayRef}
      onClick={(e) => {
        // Solo prevenir el comportamiento por defecto si se hace click directamente en el overlay
        // Las croquetas tienen pointer-events: auto y z-index alto, así que capturarán sus propios clicks
        if (e.target === overlayRef.current) {
          e.preventDefault();
        }
      }}
    >
      <div className="intro">
        <h2 ref={titleRef} className="intro__title">Coge una croqueta</h2>
        <div className="intro__buttons" ref={buttonsContainerRef}>
          {memoizedTracks.map((track, index) => {
            const isMainCroqueta = selectedTrackId && track && (
              track.id === selectedTrackId || 
              (track.name && selectedTrackId && track.name.toLowerCase().replace(/\s+/g, '-') === selectedTrackId.toLowerCase().replace(/\s+/g, '-'))
            );
            
            // Determinar si esta croqueta está bloqueada
            const isLocked = isDirectUri && !croquetasUnlocked && !isMainCroqueta;
            
            // Tamaño de la croqueta activa por URI (un poco más grande)
            const getCroquetaSize = () => {
              if (isMainCroqueta && isDirectUri) {
                return {
                  width: '24vw',
                  height: '24vw',
                  minWidth: '22vw',
                  minHeight: '22vw',
                  maxWidth: '26vw',
                  maxHeight: '26vw',
                };
              } else if (isMainCroqueta) {
                return {
                  width: '22.5vw',
                  height: '22.5vw',
                  minWidth: '20vw',
                  minHeight: '20vw',
                  maxWidth: '25vw',
                  maxHeight: '25vw',
                };
              } else {
                return {
                  width: '15vw',
                  height: '15vw',
                  minWidth: '12vw',
                  minHeight: '12vw',
                  maxWidth: '20vw',
                  maxHeight: '20vw',
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
                className={`intro__button ${isMainCroqueta ? 'main-croqueta' : ''} ${isLocked ? 'croqueta-locked' : ''}`}
                style={{
                  ...getCroquetaSize(),
                  pointerEvents: isLocked ? 'none' : 'auto',
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

