import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import './Intro.scss';

// Función para generar diferentes formas de croquetas
const getCroquetaSVG = (index) => {
  const variations = [
    // Croqueta 1 - Forma más alargada
    <svg 
      key={`croqueta-${index}-1`}
      className="intro__button-croqueta" 
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 20 60 
           Q 15 40, 20 25 
           Q 25 15, 40 18 
           Q 60 22, 80 20 
           Q 100 18, 120 25 
           Q 140 32, 155 40 
           Q 170 48, 175 60 
           Q 180 72, 175 85 
           Q 170 98, 160 100 
           Q 150 102, 140 100 
           Q 130 98, 120 95 
           Q 110 92, 100 88 
           Q 90 84, 80 80 
           Q 70 76, 60 72 
           Q 50 68, 40 65 
           Q 30 62, 22 60 
           Q 20 60, 20 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 50 30 Q 47 28, 50 26 Q 53 28, 50 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 90 25 Q 87 23, 90 21 Q 93 23, 90 25" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 130 35 Q 127 33, 130 31 Q 133 33, 130 35" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 70 75 Q 67 73, 70 71 Q 73 73, 70 75" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 110 80 Q 107 78, 110 76 Q 113 78, 110 80" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>,
    
    // Croqueta 2 - Forma más redondeada
    <svg 
      key={`croqueta-${index}-2`}
      className="intro__button-croqueta" 
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 30 60 
           Q 25 35, 35 20 
           Q 45 10, 65 15 
           Q 85 20, 100 18 
           Q 115 16, 130 22 
           Q 145 28, 160 35 
           Q 175 42, 170 60 
           Q 165 78, 155 90 
           Q 145 102, 130 100 
           Q 115 98, 100 95 
           Q 85 92, 70 88 
           Q 55 84, 45 75 
           Q 35 66, 30 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 55 28 Q 52 26, 55 24 Q 58 26, 55 28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 85 22 Q 82 20, 85 18 Q 88 20, 85 22" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 115 30 Q 112 28, 115 26 Q 118 28, 115 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 145 40 Q 142 38, 145 36 Q 148 38, 145 40" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 65 72 Q 62 70, 65 68 Q 68 70, 65 72" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 95 78 Q 92 76, 95 74 Q 98 76, 95 78" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 125 82 Q 122 80, 125 78 Q 128 80, 125 82" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>,
    
    // Croqueta 3 - Forma más irregular
    <svg 
      key={`croqueta-${index}-3`}
      className="intro__button-croqueta" 
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 25 60 
           Q 20 42, 28 28 
           Q 38 16, 52 18 
           Q 68 20, 82 16 
           Q 96 12, 110 20 
           Q 124 28, 138 32 
           Q 152 36, 165 45 
           Q 178 54, 172 68 
           Q 166 82, 155 92 
           Q 144 102, 130 98 
           Q 116 94, 102 90 
           Q 88 86, 74 82 
           Q 60 78, 48 72 
           Q 36 66, 28 62 
           Q 25 60, 25 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 48 32 Q 45 30, 48 28 Q 51 30, 48 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 78 24 Q 75 22, 78 20 Q 81 22, 78 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 108 28 Q 105 26, 108 24 Q 111 26, 108 28" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 138 38 Q 135 36, 138 34 Q 141 36, 138 38" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 58 70 Q 55 68, 58 66 Q 61 68, 58 70" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 88 76 Q 85 74, 88 72 Q 91 74, 88 76" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 118 80 Q 115 78, 118 76 Q 121 78, 118 80" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 148 74 Q 145 72, 148 70 Q 151 72, 148 74" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>,
    
    // Croqueta 4 - Forma más compacta
    <svg 
      key={`croqueta-${index}-4`}
      className="intro__button-croqueta" 
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 35 60 
           Q 30 45, 38 30 
           Q 46 18, 60 20 
           Q 75 22, 90 19 
           Q 105 16, 120 24 
           Q 135 32, 145 42 
           Q 155 52, 150 65 
           Q 145 78, 135 88 
           Q 125 98, 110 96 
           Q 95 94, 80 90 
           Q 65 86, 55 78 
           Q 45 70, 38 65 
           Q 35 60, 35 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 60 32 Q 57 30, 60 28 Q 63 30, 60 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 90 26 Q 87 24, 90 22 Q 93 24, 90 26" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 120 34 Q 117 32, 120 30 Q 123 32, 120 34" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 70 74 Q 67 72, 70 70 Q 73 72, 70 74" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 100 80 Q 97 78, 100 76 Q 103 78, 100 80" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 130 76 Q 127 74, 130 72 Q 133 74, 130 76" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>,
    
    // Croqueta 5 - Forma más asimétrica
    <svg 
      key={`croqueta-${index}-5`}
      className="intro__button-croqueta" 
      viewBox="0 0 200 120" 
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 28 60 
           Q 22 38, 32 24 
           Q 42 12, 58 16 
           Q 74 20, 88 17 
           Q 102 14, 116 23 
           Q 130 32, 142 40 
           Q 154 48, 162 60 
           Q 170 72, 165 86 
           Q 160 100, 148 102 
           Q 136 104, 124 100 
           Q 112 96, 100 91 
           Q 88 86, 76 81 
           Q 64 76, 54 70 
           Q 44 64, 36 62 
           Q 28 60, 28 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 52 30 Q 49 28, 52 26 Q 55 28, 52 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 82 22 Q 79 20, 82 18 Q 85 20, 82 22" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 112 30 Q 109 28, 112 26 Q 115 28, 112 30" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 142 44 Q 139 42, 142 40 Q 145 42, 142 44" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 62 72 Q 59 70, 62 68 Q 65 70, 62 72" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 92 78 Q 89 76, 92 74 Q 95 76, 92 78" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 122 84 Q 119 82, 122 80 Q 125 82, 122 84" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M 152 78 Q 149 76, 152 74 Q 155 76, 152 78" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ];
  
  return variations[index % variations.length];
};

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
    if (buttonsRef.current.length === 0) return;
    initPhysics();
  }, [tracks]);

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
        if (buttonRef) {
          // Obtener el SVG dentro del botón
          const svgElement = buttonRef.querySelector('.intro__button-croqueta');
          if (!svgElement) return;

          // Obtener el bounding box del SVG (los trazos)
          const svgRect = svgElement.getBoundingClientRect();
          const svgWidth = svgRect.width;
          const svgHeight = svgRect.height;
          const svgSize = Math.max(svgWidth, svgHeight);

          // Posición inicial aleatoria dentro del contenedor (relativa al contenedor)
          const x = margin + Math.random() * (containerWidth - 2 * margin - svgWidth);
          const y = margin + Math.random() * (containerHeight - 2 * margin - svgHeight);

          const minScale = 1.0;
          const maxScale = 1.3;
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
        if (!croquetas || croquetas.length === 0) return;

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

        // Detectar colisiones entre croquetas usando el tamaño del SVG
        for (let i = 0; i < croquetas.length; i++) {
          for (let j = i + 1; j < croquetas.length; j++) {
            const a = croquetas[i];
            const b = croquetas[j];
            const t = (time || 0) / 1000;
            const scaleA = a.minScale + (a.maxScale - a.minScale) * 0.5 * (1 + Math.sin(a.freq * t + a.phase));
            const scaleB = b.minScale + (b.maxScale - b.minScale) * 0.5 * (1 + Math.sin(b.freq * t + b.phase));

            // Usar el tamaño del SVG escalado para las colisiones con factor de separación
            const COLLISION_FACTOR = 0.85; // Factor para que reboten antes (menor = rebotan más temprano)
            const widthA = a.svgWidth * scaleA;
            const heightA = a.svgHeight * scaleA;
            const widthB = b.svgWidth * scaleB;
            const heightB = b.svgHeight * scaleB;
            const rA = (Math.max(widthA, heightA) / 2) * COLLISION_FACTOR;
            const rB = (Math.max(widthB, heightB) / 2) * COLLISION_FACTOR;

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < rA + rB && dist > 0) {
              // Colisión: intercambiar ángulos y separar
              const temp = a.angle;
              a.angle = b.angle;
              b.angle = temp;
              const overlap = rA + rB - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x += nx * (overlap / 2);
              a.y += ny * (overlap / 2);
              b.x -= nx * (overlap / 2);
              b.y -= ny * (overlap / 2);
            }
          }
        }

        // Mover cada croqueta
        croquetas.forEach(croqueta => {
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
            const COLLISION_FACTOR = 0.85;
            const croquetaRadius = maxRadius * COLLISION_FACTOR;
            
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
              // Colisión con el título: rebotar
              const dist = Math.sqrt(distSq);
              if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;
                // Reflejar el ángulo
                const dot = Math.cos(croqueta.angle) * nx + Math.sin(croqueta.angle) * ny;
                croqueta.angle = croqueta.angle - 2 * dot * Math.atan2(ny, nx);
                // Separar la croqueta del título
                const overlap = croquetaRadius - dist;
                newX += nx * overlap;
                newY += ny * overlap;
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
          // Aplicar posición absoluta sumando el offset del contenedor
          gsap.set(croqueta.element, { x: currentContainerLeft + croqueta.x, y: currentContainerTop + croqueta.y, scale });
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
        <h2 ref={titleRef} className="intro__title">Selecciona una canción</h2>
        <div className="intro__buttons" ref={buttonsContainerRef}>
          {tracks.map((track, index) => (
            <button
              key={track.id}
              ref={el => buttonsRef.current[index] = el}
              className="intro__button"
              data-croqueta-index={index}
              onClick={(e) => {
                e.stopPropagation();
                handleTrackSelect(track, index);
              }}
            >
              {getCroquetaSVG(index)}
              <span className="intro__button-text">{track.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Intro;

