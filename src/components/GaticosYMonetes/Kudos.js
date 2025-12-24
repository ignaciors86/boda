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
  const kudoRefs = useRef({});

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
      // Unirse a la room específica
      socketRef.current.emit('joinRoom', 'gaticos-y-monetes');
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
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const vw = window.innerWidth / 100;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const bubbleSizeVW = 6;
    const bubbleSize = bubbleSizeVW * vw;
    const marginVW = 1;
    const margin = marginVW * vw;
    const emojisData = [];

    Object.entries(emojiLevels).forEach(([level, emojis]) => {
      emojis.forEach((emoji, index) => {
        const x = Math.random() * (containerWidth - 2 * margin - bubbleSize) + margin;
        const y = Math.random() * (containerHeight - 2 * margin - bubbleSize) + margin;
        const minScale = 1.2;
        const maxScale = 2.2;
        const baseScale = Math.random() * (maxScale - minScale) + minScale;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.35 + 0.15;
        const freq = Math.random() * 0.5 + 0.2;
        const phase = Math.random() * Math.PI * 2;
        const r = Math.floor(Math.random() * 200 + 30);
        const g = Math.floor(Math.random() * 200 + 30);
        const b = Math.floor(Math.random() * 200 + 30);
        const bgColor = `rgba(${r},${g},${b},0.45)`;
        const element = document.querySelector(`[data-level="${level}"][data-index="${index}"]`);
        if (element) {
          const emojiObj = { element, x, y, baseScale, minScale, maxScale, angle, speed, freq, phase, bgColor };
          emojisData.push(emojiObj);
          gsap.set(element, { x, y, scale: baseScale, backgroundColor: bgColor });
        }
      });
    });
    bubblesRef.current = emojisData;

    function animate(time) {
      const bubbles = bubblesRef.current;
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i];
          const b = bubbles[j];
          const t = (time || 0) / 1000;
          const scaleA = a.minScale + (a.maxScale - a.minScale) * 0.5 * (1 + Math.sin(a.freq * t + a.phase));
          const scaleB = b.minScale + (b.maxScale - b.minScale) * 0.5 * (1 + Math.sin(b.freq * t + b.phase));
          const rA = (bubbleSize * scaleA) / 2;
          const rB = (bubbleSize * scaleB) / 2;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < rA + rB) {
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
      bubbles.forEach(emoji => {
        let newX = emoji.x + Math.cos(emoji.angle) * emoji.speed * 2;
        let newY = emoji.y + Math.sin(emoji.angle) * emoji.speed * 2;
        const t = (time || 0) / 1000;
        const scale = emoji.minScale + (emoji.maxScale - emoji.minScale) * 0.5 * (1 + Math.sin(emoji.freq * t + emoji.phase));
        const radio = (bubbleSize * scale) / 2;
        if (newX < radio) {
          newX = radio;
          emoji.angle = Math.PI - emoji.angle;
        } else if (newX > window.innerWidth - radio) {
          newX = window.innerWidth - radio;
          emoji.angle = Math.PI - emoji.angle;
        }
        if (newY < radio) {
          newY = radio;
          emoji.angle = -emoji.angle;
        } else if (newY > window.innerHeight - radio) {
          newY = window.innerHeight - radio;
          emoji.angle = -emoji.angle;
        }
        emoji.x = newX;
        emoji.y = newY;
        gsap.set(emoji.element, { x: emoji.x, y: emoji.y, scale, backgroundColor: emoji.bgColor });
      });
      requestAnimationFrame(animate);
    }
    animate();

    function adjustOnResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const vw = width / 100;
      const bubbleSize = 6 * vw;
      const margin = 1 * vw;
      const bubbles = bubblesRef.current;
      // Si el cambio es significativo (>20%)
      if (Math.abs(width - lastWidth) / lastWidth > 0.2 || Math.abs(height - lastHeight) / lastHeight > 0.2) {
        // Reposicionar aleatoriamente todas las bolas
        bubbles.forEach(emoji => {
          emoji.x = Math.random() * (width - 2 * margin - bubbleSize) + margin;
          emoji.y = Math.random() * (height - 2 * margin - bubbleSize) + margin;
          gsap.set(emoji.element, { x: emoji.x, y: emoji.y });
        });
        lastWidth = width;
        lastHeight = height;
      } else {
        // Solo ajustar si están fuera
        bubbles.forEach(emoji => {
          const t = Date.now() / 1000;
          const scale = emoji.minScale + (emoji.maxScale - emoji.minScale) * 0.5 * (1 + Math.sin(emoji.freq * t + emoji.phase));
          const radio = (bubbleSize * scale) / 2;
          let changed = false;
          if (emoji.x < radio) { emoji.x = radio; changed = true; }
          if (emoji.x > width - radio) { emoji.x = width - radio; changed = true; }
          if (emoji.y < radio) { emoji.y = radio; changed = true; }
          if (emoji.y > height - radio) { emoji.y = height - radio; changed = true; }
          if (changed && emoji.element) {
            gsap.set(emoji.element, { x: emoji.x, y: emoji.y });
          }
        });
      }
    }
    window.addEventListener('resize', adjustOnResize);
    return () => {
      window.removeEventListener('resize', adjustOnResize);
    };
  }, [emojiLevels]);

  // Generar datos de bolas de dragón para cada emoji solo una vez
  const dragonBallBalls = useMemo(() => {
    const balls = {};
    Object.entries(emojiLevels).forEach(([level, emojis]) => {
      emojis.forEach((emoji, index) => {
        const key = `${level}-${index}`;
        const count = index + 1; // 1 a 7 estrellas, según la bola
        const radius = 35;
        const emojiElements = [];
        const emojisInCircle = count === 6 || count === 7 ? count - 1 : count;
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
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = Math.random() * 2 + 3;
        balls[key] = { emojiElements, direction, speed, mainEmoji: emoji, count };
      });
    });
    return balls;
  }, []);

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
  }, []);

  const handleEmojiClick = (emoji, e) => {
    const level = e.currentTarget.getAttribute('data-level');
    const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
    const key = `${level}-${index}`;
    const count = dragonBallBalls[key]?.count || (index + 1);
    const kudo = {
      id: Date.now(),
      emoji: emoji,
      stars: count,
      timestamp: Date.now(),
      room: 'gaticos-y-monetes' // Añadido para que el backend lo emita solo a la sala correcta
    };
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('kudo', kudo);
    } else {
      console.error('Socket.IO no está conectado');
    }
    // Onda de pulso CSS local
    const btn = e.currentTarget;
    const waveElement = btn.querySelector('.pulse-wave');
    if (waveElement) {
      waveElement.style.animation = 'none';
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
        // Solo mostrar kudos si estamos en la ruta correcta
        if (window.location.pathname !== '/gaticos-y-monetes') return;
        // Aparecer en el centro de la ventana SIEMPRE
        const bubbleSize = 6 * (window.innerWidth / 100); // 6vw
        const x = window.innerWidth / 2 - bubbleSize / 2;
        const y = window.innerHeight / 2 - bubbleSize / 2;
        // Dirección aleatoria 360º
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
        setTimeout(() => {
          setActiveKudos(prev => prev.filter(k => k.id !== kudo.id));
          kudosDataRef.current = kudosDataRef.current.filter(k => k.id !== kudo.id);
        }, 10000);
      });
    }
  }, []);

  // Animación de kudos recibidos
  useEffect(() => {
    function animateKudos(time) {
      const bubbleSize = 6 * (window.innerWidth / 100);
      kudosDataRef.current.forEach(kudo => {
        if (!kudo.element) return;
        let newX = kudo.x + Math.cos(kudo.angle) * kudo.speed * 2;
        let newY = kudo.y + Math.sin(kudo.angle) * kudo.speed * 2;
        const t = (time || 0) / 1000;
        const scale = kudo.minScale + (kudo.maxScale - kudo.minScale) * 0.5 * (1 + Math.sin(kudo.freq * t + kudo.phase));
        const radio = (bubbleSize * scale) / 2;
        // Rebote en los bordes usando el tamaño de la ventana
        if (newX < radio) {
          newX = radio;
          kudo.angle = Math.PI - kudo.angle;
        } else if (newX > window.innerWidth - radio) {
          newX = window.innerWidth - radio;
          kudo.angle = Math.PI - kudo.angle;
        }
        if (newY < radio) {
          newY = radio;
          kudo.angle = -kudo.angle;
        } else if (newY > window.innerHeight - radio) {
          newY = window.innerHeight - radio;
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
    // Ajustar posiciones tras resize para que no queden fuera
    function adjustKudosOnResize() {
      const bubbleSize = 6 * (window.innerWidth / 100);
      kudosDataRef.current.forEach(kudo => {
        const t = Date.now() / 1000;
        const scale = kudo.minScale + (kudo.maxScale - kudo.minScale) * 0.5 * (1 + Math.sin(kudo.freq * t + kudo.phase));
        const radio = (bubbleSize * scale) / 2;
        let changed = false;
        if (kudo.x < radio) { kudo.x = radio; changed = true; }
        if (kudo.x > window.innerWidth - radio) { kudo.x = window.innerWidth - radio; changed = true; }
        if (kudo.y < radio) { kudo.y = radio; changed = true; }
        if (kudo.y > window.innerHeight - radio) { kudo.y = window.innerHeight - radio; changed = true; }
        if (changed && kudo.element) {
          gsap.set(kudo.element, { x: kudo.x, y: kudo.y });
        }
      });
    }
    window.addEventListener('resize', adjustKudosOnResize);
    return () => {
      window.removeEventListener('resize', adjustKudosOnResize);
    };
  }, []);

  const renderDragonBallStars = (count) => {
    if (!count || count < 1) count = 1;
    const stars = [];
    const radius = 22; // % del círculo
    if (count === 1) {
      stars.push(
        <span key={0} className="star" style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '2.7vw',
          color: '#d32f2f',
          zIndex: 1,
          filter: 'drop-shadow(0 0 0.3vw #0008)'
        }}>★</span>
      );
    } else {
      const angleOffset = count === 2 ? Math.PI / 2 : 0;
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count + angleOffset;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        stars.push(
          <span key={i} className="star" style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: '2.7vw',
            color: '#d32f2f',
            zIndex: 1,
            filter: 'drop-shadow(0 0 0.3vw #0008)'
          }}>★</span>
        );
      }
    }
    return stars;
  };

  const renderActiveKudos = () => {
    return activeKudos.map((kudo) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const speed = Math.random() * 2 + 3;
      return (
        <div
          key={kudo.id}
          ref={el => {
            if (el) {
              kudoRefs.current[kudo.id] = el;
              if (!kudo.element) {
                kudo.element = el;
                // Animación de aparición (igual que antes)
                const tl = gsap.timeline({
                  onComplete: () => {
                    kudo.velocityX = Math.cos(kudo.angle) * kudo.speed;
                    kudo.velocityY = Math.sin(kudo.angle) * kudo.speed;
                  }
                });
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
            } else {
              // Limpiar el ref si el elemento desaparece
              delete kudoRefs.current[kudo.id];
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
            <span className="dragonball-face front" style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: 0,
              top: 0
            }}>
              <span style={{
                width: '70%',
                height: '70%',
                background: 'white',
                borderRadius: '50%',
                border: '4px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px #0004',
                fontSize: '3vw',
                color: '#222',
                fontWeight: 'bold',
                textShadow: '0 1px 0 #fff, 0 2px 8px #0002'
              }}>
                {kudo.emoji}
              </span>
            </span>
            <span className="dragonball-face back" style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: 0,
              top: 0
            }}>
              <span style={{
                width: '70%',
                height: '70%',
                background: 'white',
                borderRadius: '50%',
                border: '4px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px #0004',
                position: 'relative'
              }}>
                {renderDragonBallStars(kudo.stars)}
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