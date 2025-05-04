import React, { useState, useRef, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import Sphere from './Sphere';
import './Kudos.scss';

const Kudos = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeKudos, setActiveKudos] = useState([]);
  const socketRef = useRef(null);
  const bubblesRef = useRef({});
  const containerRef = useRef(null);
  const pulseWavesRef = useRef({});
  const animationRefs = useRef({});
  const elementsRef = useRef({});
  const kudosDataRef = useRef([]);

  // Emojis organizados por niveles
  const emojiLevels = {
    inner: ['💑', '💒', '💐', '💍', '💎', '💝', '❤️'],
    middle: ['💃', '🕺', '👰', '🤵', '🥂', '🎭', '🎪'],
    outer: ['🎊', '✨', '🎵', '🎶', '🌟', '🎉', '🎼']
  };

  useEffect(() => {
    // Detectar si estamos en localhost basado en la URL
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isDevelopment 
      ? 'http://localhost:1337' 
      : 'https://boda-strapi-production.up.railway.app';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      forceNew: true,
      timeout: 20000
    });
    
    socketRef.current.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Error de conexión Socket.IO:', error);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Desconectado del servidor Socket.IO');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const bubbleSizeVW = 6; // 6vw ~ 80px en 1366px de ancho
      const bubbleSize = bubbleSizeVW * vw;
      const marginVW = 1; // 1vw
      const margin = marginVW * vw;
      const emojisData = [];

      // Inicializar datos de cada emoji
      Object.entries(emojiLevels).forEach(([level, emojis]) => {
        emojis.forEach((emoji, index) => {
          const x = Math.random() * (containerWidth - 2 * margin - bubbleSize) + margin;
          const y = Math.random() * (containerHeight - 2 * margin - bubbleSize) + margin;
          const minScale = 1.2;
          const maxScale = 2.2;
          const baseScale = Math.random() * (maxScale - minScale) + minScale;
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 0.35 + 0.15; // px por frame (más lento)
          const freq = Math.random() * 0.5 + 0.2; // frecuencia de oscilación
          const phase = Math.random() * Math.PI * 2; // fase inicial
          // Color aleatorio translúcido
          const r = Math.floor(Math.random() * 200 + 30);
          const g = Math.floor(Math.random() * 200 + 30);
          const b = Math.floor(Math.random() * 200 + 30);
          const bgColor = `rgba(${r},${g},${b},0.45)`;
          const element = document.querySelector(`[data-level="${level}"][data-index="${index}"]`);
          if (element) {
            emojisData.push({ element, x, y, baseScale, minScale, maxScale, angle, speed, freq, phase, bgColor });
            gsap.set(element, { x, y, scale: baseScale, backgroundColor: bgColor });
          }
        });
      });

      // Animación continua con rebote y oscilación de tamaño y colisiones
      function animate(time) {
        // Colisiones entre burbujas
        for (let i = 0; i < emojisData.length; i++) {
          for (let j = i + 1; j < emojisData.length; j++) {
            const a = emojisData[i];
            const b = emojisData[j];
            // Calcular escala actual
            const t = (time || 0) / 1000;
            const scaleA = a.minScale + (a.maxScale - a.minScale) * 0.5 * (1 + Math.sin(a.freq * t + a.phase));
            const scaleB = b.minScale + (b.maxScale - b.minScale) * 0.5 * (1 + Math.sin(b.freq * t + b.phase));
            const rA = (bubbleSize * scaleA) / 2;
            const rB = (bubbleSize * scaleB) / 2;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < rA + rB) {
              // Intercambiar ángulos (rebote simple)
              const temp = a.angle;
              a.angle = b.angle;
              b.angle = temp;
              // Separar burbujas para evitar que se queden pegadas
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

        emojisData.forEach(emoji => {
          // Calcular nueva posición
          let newX = emoji.x + Math.cos(emoji.angle) * emoji.speed * 2;
          let newY = emoji.y + Math.sin(emoji.angle) * emoji.speed * 2;

          // Oscilación de tamaño
          const t = (time || 0) / 1000;
          const scale = emoji.minScale + (emoji.maxScale - emoji.minScale) * 0.5 * (1 + Math.sin(emoji.freq * t + emoji.phase));
          const radio = (bubbleSize * scale) / 2;

          // Rebote en los bordes usando el radio actual
          if (newX < radio) {
            newX = radio;
            emoji.angle = Math.PI - emoji.angle;
          } else if (newX > containerWidth - radio) {
            newX = containerWidth - radio;
            emoji.angle = Math.PI - emoji.angle;
          }
          if (newY < radio) {
            newY = radio;
            emoji.angle = -emoji.angle;
          } else if (newY > containerHeight - radio) {
            newY = containerHeight - radio;
            emoji.angle = -emoji.angle;
          }

          emoji.x = newX;
          emoji.y = newY;

          gsap.set(emoji.element, { x: emoji.x, y: emoji.y, scale, backgroundColor: emoji.bgColor });
        });
        requestAnimationFrame(animate);
      }
      animate();
    }
  }, []);

  // Generar datos de bolas de dragón para cada emoji solo una vez
  const dragonBallBalls = useMemo(() => {
    const balls = {};
    Object.entries(emojiLevels).forEach(([level, emojis]) => {
      emojis.forEach((emoji, index) => {
        const key = `${level}-${index}`;
        const count = Math.floor(Math.random() * 7) + 1;
        const radius = 35;
        const size = 14;
        const emojiElements = [];
        
        // Si hay 6 o 7 emojis, uno va en el centro
        const emojisInCircle = count === 6 || count === 7 ? count - 1 : count;
        
        // Generar emojis en círculo
        for (let i = 0; i < emojisInCircle; i++) {
          const angle = (i * 2 * Math.PI) / emojisInCircle;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          emojiElements.push(
            <span
              key={i}
              className="dragonball-emoji"
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                fontSize: '1.2vw',
                color: '#d32f2f',
                filter: 'drop-shadow(0 0 0.2vw #0008)',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ 
                position: 'absolute',
                fontSize: '2vw',
                color: '#d32f2f',
                zIndex: 1,
                filter: 'drop-shadow(0 0 0.3vw #0008)'
              }}>★</span>
              <span style={{ 
                position: 'absolute',
                fontSize: '0.8vw',
                zIndex: 2,
                filter: 'drop-shadow(0 0 0.1vw #000)'
              }}>{emoji}</span>
            </span>
          );
        }

        // Añadir emoji central si hay 6 o 7 emojis
        if (count === 6 || count === 7) {
          emojiElements.push(
            <span
              key="center"
              className="dragonball-emoji"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                fontSize: '1.2vw',
                color: '#d32f2f',
                filter: 'drop-shadow(0 0 0.2vw #0008)',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ 
                position: 'absolute',
                fontSize: '2vw',
                color: '#d32f2f',
                zIndex: 1,
                filter: 'drop-shadow(0 0 0.3vw #0008)'
              }}>★</span>
              <span style={{ 
                position: 'absolute',
                fontSize: '0.8vw',
                zIndex: 2,
                filter: 'drop-shadow(0 0 0.1vw #000)'
              }}>{emoji}</span>
            </span>
          );
        }

        // Dirección y velocidad de giro aleatoria
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = Math.random() * 2 + 3; // 3s a 5s por vuelta
        balls[key] = { emojiElements, direction, speed, mainEmoji: emoji };
      });
    });
    return balls;
  }, [emojiLevels]);

  // Efecto para inicializar las animaciones
  useEffect(() => {
    Object.entries(emojiLevels).forEach(([level, emojis]) => {
      emojis.forEach((_, index) => {
        const key = `${level}-${index}`;
        const { direction, speed } = dragonBallBalls[key] || { direction: 1, speed: 4 };
        
        if (!animationRefs.current[key]) {
          const element = document.querySelector(`[data-animation-key="${key}"] .dragonball-3d`);
          if (element) {
            animationRefs.current[key] = gsap.to(element, {
              rotationY: direction * 360,
              duration: speed,
              repeat: -1,
              ease: "none"
            });
          }
        }
      });
    });

    return () => {
      // Limpiar animaciones al desmontar
      Object.values(animationRefs.current).forEach(animation => {
        if (animation) animation.kill();
      });
    };
  }, [dragonBallBalls, emojiLevels]);

  const handleEmojiClick = (emoji, e) => {
    const kudo = {
      id: Date.now(),
      emoji: emoji,
      timestamp: Date.now()
    };
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('kudo', kudo);
    } else {
      console.error('Socket.IO no está conectado');
    }

    // Onda de pulso CSS: activa la onda para esta burbuja
    const btn = e.currentTarget;
    const waveElement = btn.querySelector('.pulse-wave');
    
    if (waveElement) {
      waveElement.style.animation = 'none';
      // Forzar reflow de manera correcta
      void waveElement.offsetHeight;
      waveElement.style.animation = 'pulse-wave-anim 0.7s cubic-bezier(0.4,0.2,0.2,1) forwards';
    }
  };

  const renderEmojiRing = (emojis, level) => {
    return emojis.map((emoji, index) => {
      const key = `${level}-${index}`;
      const { emojiElements, direction, speed, mainEmoji } = dragonBallBalls[key] || { 
        emojiElements: [], 
        direction: 1, 
        speed: 4,
        mainEmoji: emoji 
      };

      return (
        <button
          key={key}
          data-level={level}
          data-index={index}
          className="emoji-option dragonball"
          onClick={(e) => handleEmojiClick(emoji, e)}
          style={{
            background: 'none',
            perspective: '600px',
            overflow: 'visible',
            position: 'absolute',
            left: `var(--x, 0px)`,
            top: `var(--y, 0px)`,
            width: '6vw',
            height: '6vw',
            minWidth: 48,
            minHeight: 48,
            maxWidth: 120,
            maxHeight: 120,
            transform: `scale(var(--scale, 1))`,
          }}
        >
          <Sphere speed={speed} direction={direction}>
            <span className="dragonball-face front" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backfaceVisibility: 'hidden',
              fontSize: '4.2vw',
              filter: 'drop-shadow(0 0 0.5vw #fff8)'
            }}>
              {mainEmoji}
            </span>
            <span className="dragonball-face back" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'block',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}>
              <span style={{position: 'relative', width: '100%', height: '100%', display: 'block'}}>
                {emojiElements}
              </span>
            </span>
          </Sphere>
          <span className="pulse-wave css-pulse" style={{ opacity: 0 }} />
        </button>
      );
    });
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on('kudo', (kudo) => {
        // Generar posición inicial aleatoria
        const container = containerRef.current;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const bubbleSize = 6 * (window.innerWidth / 100); // 6vw
        const margin = 1 * (window.innerWidth / 100); // 1vw

        const x = Math.random() * (containerWidth - 2 * margin - bubbleSize) + margin;
        const y = Math.random() * (containerHeight - 2 * margin - bubbleSize) + margin;
        
        // Generar propiedades de animación
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.35 + 0.15;
        const freq = Math.random() * 0.5 + 0.2;
        const phase = Math.random() * Math.PI * 2;
        const minScale = 1.2;
        const maxScale = 2.2;
        const baseScale = Math.random() * (maxScale - minScale) + minScale;
        
        // Color aleatorio translúcido
        const r = Math.floor(Math.random() * 200 + 30);
        const g = Math.floor(Math.random() * 200 + 30);
        const b = Math.floor(Math.random() * 200 + 30);
        const bgColor = `rgba(${r},${g},${b},0.45)`;

        const kudoData = {
          ...kudo,
          x,
          y,
          angle,
          speed,
          freq,
          phase,
          minScale,
          maxScale,
          baseScale,
          bgColor,
          element: null
        };

        setActiveKudos(prev => [...prev, kudoData]);
        kudosDataRef.current.push(kudoData);

        // Programar desaparición después de 10 segundos
        setTimeout(() => {
          setActiveKudos(prev => prev.filter(k => k.id !== kudo.id));
          kudosDataRef.current = kudosDataRef.current.filter(k => k.id !== kudo.id);
        }, 10000);
      });
    }
  }, []);

  // Animación de kudos recibidos
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const bubbleSize = 6 * (window.innerWidth / 100);

      function animateKudos(time) {
        kudosDataRef.current.forEach(kudo => {
          if (!kudo.element) return;

          // Calcular nueva posición
          let newX = kudo.x + Math.cos(kudo.angle) * kudo.speed * 2;
          let newY = kudo.y + Math.sin(kudo.angle) * kudo.speed * 2;

          // Oscilación de tamaño
          const t = (time || 0) / 1000;
          const scale = kudo.minScale + (kudo.maxScale - kudo.minScale) * 0.5 * (1 + Math.sin(kudo.freq * t + kudo.phase));
          const radio = (bubbleSize * scale) / 2;

          // Rebote en los bordes
          if (newX < radio) {
            newX = radio;
            kudo.angle = Math.PI - kudo.angle;
          } else if (newX > containerWidth - radio) {
            newX = containerWidth - radio;
            kudo.angle = Math.PI - kudo.angle;
          }
          if (newY < radio) {
            newY = radio;
            kudo.angle = -kudo.angle;
          } else if (newY > containerHeight - radio) {
            newY = containerHeight - radio;
            kudo.angle = -kudo.angle;
          }

          kudo.x = newX;
          kudo.y = newY;

          gsap.set(kudo.element, { 
            x: kudo.x, 
            y: kudo.y, 
            scale, 
            backgroundColor: kudo.bgColor 
          });
        });

        requestAnimationFrame(animateKudos);
      }

      animateKudos();
    }
  }, []);

  const renderActiveKudos = () => {
    return activeKudos.map((kudo) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const speed = Math.random() * 2 + 3;

      return (
        <div
          key={kudo.id}
          ref={el => {
            if (el && !kudo.element) {
              kudo.element = el;
              
              // Crear timeline para la animación inicial
              const tl = gsap.timeline({
                onComplete: () => {
                  // Una vez completada la animación inicial, empezar el movimiento
                  kudo.velocityX = Math.cos(kudo.angle) * kudo.speed;
                  kudo.velocityY = Math.sin(kudo.angle) * kudo.speed;
                }
              });

              // Animación de aparición desde otra dimensión
              tl.fromTo(el, 
                { 
                  scale: 0,
                  opacity: 0,
                  rotationY: 180,
                  rotationX: 180,
                  x: kudo.x,
                  y: kudo.y,
                  z: -1000,
                  filter: "blur(20px) brightness(2)",
                  transformOrigin: "center center"
                },
                { 
                  scale: kudo.baseScale,
                  opacity: 1,
                  rotationY: 0,
                  rotationX: 0,
                  z: 0,
                  filter: "blur(0px) brightness(1)",
                  duration: 1.2,
                  ease: "power4.out"
                }
              )
              .to(el, {
                scale: kudo.baseScale * 1.1,
                duration: 0.2,
                ease: "power2.inOut"
              })
              .to(el, {
                scale: kudo.baseScale,
                duration: 0.3,
                ease: "elastic.out(1, 0.5)"
              });
            }
          }}
          className="emoji-option dragonball"
          style={{
            left: `${kudo.x}px`,
            top: `${kudo.y}px`,
            transform: `scale(${kudo.baseScale})`,
            backgroundColor: kudo.bgColor
          }}
        >
          <Sphere speed={speed} direction={direction}>
            <span className="dragonball-face front">
              {kudo.emoji}
            </span>
            <span className="dragonball-face back">
              <span className="dragonball-emoji">
                <span className="star">★</span>
                <span className="emoji">{kudo.emoji}</span>
              </span>
            </span>
          </Sphere>
        </div>
      );
    });
  };

  return (
    <div className="kudos-container" ref={containerRef}>
      <div className="emoji-selector">
        {renderEmojiRing(emojiLevels.inner, 'inner')}
        {renderEmojiRing(emojiLevels.middle, 'middle')}
        {renderEmojiRing(emojiLevels.outer, 'outer')}
      </div>
      {renderActiveKudos()}
    </div>
  );
};

export default Kudos; 