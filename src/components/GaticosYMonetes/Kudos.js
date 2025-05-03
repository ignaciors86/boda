import React, { useState, useRef, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import './Kudos.scss';

const Kudos = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const socketRef = useRef(null);
  const bubblesRef = useRef({});
  const containerRef = useRef(null);
  // Estado para controlar la onda de pulso por burbuja
  const [pulseWaves, setPulseWaves] = useState({});

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
          const bgColor = `rgba(${r},${g},${b},0.25)`;
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
        // Generar SVGs de estrellas rojas
        const radius = 38; // en porcentaje del tamaño del botón
        const size = 18; // tamaño de la estrella en px
        const stars = [];
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI) / count;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          stars.push(
            <span
              key={i}
              className="dragonball-star"
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                fontSize: '1.1vw',
                color: '#d32f2f',
                filter: 'drop-shadow(0 0 0.2vw #0008)'
              }}
            >
              ★
            </span>
          );
        }
        // Dirección y velocidad de giro aleatoria
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = Math.random() * 2 + 3; // 3s a 5s por vuelta
        balls[key] = { stars, direction, speed };
      });
    });
    return balls;
  }, [emojiLevels]);

  const handleEmojiClick = (emoji, e) => {
    setIsAnimating(true);
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
    setTimeout(() => setIsAnimating(false), 1000);

    // Onda de pulso CSS: activa la onda para esta burbuja
    const btn = e.currentTarget;
    const key = btn.getAttribute('data-level') + '-' + btn.getAttribute('data-index');
    setPulseWaves(prev => ({ ...prev, [key]: false })); // reinicia
    setTimeout(() => setPulseWaves(prev => ({ ...prev, [key]: true })), 10); // activa
    setTimeout(() => setPulseWaves(prev => ({ ...prev, [key]: false })), 800); // limpia
  };

  const renderEmojiRing = (emojis, level) => {
    return emojis.map((emoji, index) => {
      const key = `${level}-${index}`;
      const { stars, direction, speed } = dragonBallBalls[key] || { stars: [], direction: 1, speed: 4 };
      const showWave = pulseWaves[key];
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
          <span
            className="dragonball-3d"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              position: 'relative',
              transformStyle: 'preserve-3d',
              animation: `dragonball-spin-${key} ${speed}s linear infinite`,
            }}
          >
            <span className="dragonball-sphere-bg" />
            <span className="dragonball-sphere-highlight" />
            <span className="dragonball-face front" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backfaceVisibility: 'hidden',
              fontSize: '2.2vw',
              filter: 'drop-shadow(0 0 0.5vw #fff8)'
            }}>
              {emoji}
            </span>
            <span className="dragonball-face back" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'block',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}>
              <span style={{position: 'relative', width: '100%', height: '100%', display: 'block'}}>
                {stars}
              </span>
            </span>
            {showWave && <span className="pulse-wave css-pulse" />}
          </span>
        </button>
      );
    });
  };

  useEffect(() => {
    const style = document.createElement('style');
    let css = '';
    Object.entries(emojiLevels).forEach(([level, emojis]) => {
      emojis.forEach((_, index) => {
        const key = `${level}-${index}`;
        const { direction } = dragonBallBalls[key] || { direction: 1 };
        css += `@keyframes dragonball-spin-${key} {from {transform: rotateY(0deg);} to {transform: rotateY(${direction * 360}deg);}}\n`;
      });
    });
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [dragonBallBalls, emojiLevels]);

  return (
    <div className="kudos-container" ref={containerRef}>
      <div className="emoji-selector">
        {renderEmojiRing(emojiLevels.inner, 'inner')}
        {renderEmojiRing(emojiLevels.middle, 'middle')}
        {renderEmojiRing(emojiLevels.outer, 'outer')}
      </div>
    </div>
  );
};

export default Kudos; 