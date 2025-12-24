import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import GaleriaLoader from './GaleriaLoader';
import Sphere from './Sphere';
import './GaticosYMonetes.scss';
import './Sphere.scss';

const GaticosYMonetes = () => {
  const [receivedKudos, setReceivedKudos] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [borderColor, setBorderColor] = useState('#00ff00');
  const [backgroundFormat, setBackgroundFormat] = useState('polygons');
  const [sensitiveMode, setSensitiveMode] = useState(() => {
    const savedMode = localStorage.getItem('sensitiveMode');
    return savedMode === 'true';
  });
  const [imageBgColor, setImageBgColor] = useState('transparent');
  const [dynamicBgColor, setDynamicBgColor] = useState(false);
  const [dynamicColor, setDynamicColor] = useState('#ff00ff');
  const [wrapperBgColor, setWrapperBgColor] = useState('transparent');
  const [dynamicWrapperBgColor, setDynamicWrapperBgColor] = useState(false);
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const kudosDataRef = useRef([]);
  const elementsRef = useRef({});
  const galerias = GaleriaLoader();

  useEffect(() => {
    // Inicializar Socket.IO
    const socketUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:1337' 
      : 'https://boda-strapi-production.up.railway.app';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      forceNew: true
    });
    
    socketRef.current.on('connect', () => {
      console.log('GaticosYMonetes: Conectado al servidor Socket.IO');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('GaticosYMonetes: Error de conexión Socket.IO:', error);
    });

    socketRef.current.on('background-format-change', (data) => {
      setBackgroundFormat(data.format);
    });

    socketRef.current.on('sensitive-mode-change', (data) => {
      console.log('GaticosYMonetes: Recibido cambio de modo sensible:', data);
      setSensitiveMode(data.enabled);
      localStorage.setItem('sensitiveMode', data.enabled);
    });

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
        element: null,
        id: Date.now()
      };

      setReceivedKudos(prev => [...prev, kudoData]);
      kudosDataRef.current.push(kudoData);

      // Programar desaparición después de 10 segundos
      setTimeout(() => {
        setReceivedKudos(prev => prev.filter(k => k.id !== kudoData.id));
        kudosDataRef.current = kudosDataRef.current.filter(k => k.id !== kudoData.id);
        if (elementsRef.current[kudoData.id]) {
          delete elementsRef.current[kudoData.id];
        }
      }, 10000);
    });

    socketRef.current.on('disconnect', () => {
      console.log('GaticosYMonetes: Desconectado del servidor Socket.IO');
    });

    socketRef.current.on('galerias', (data) => {
      if (typeof data.imageBgColor !== 'undefined') {
        if (dynamicBgColor || data.dynamicBgColor) {
          setImageBgColor(data.imageBgColor);
        } else if (!dynamicBgColor) {
          setImageBgColor(data.imageBgColor);
        }
      }
      if (typeof data.dynamicBgColor !== 'undefined') {
        setDynamicBgColor(data.dynamicBgColor);
        console.log('GaticosYMonetes: Recibido dynamicBgColor', data.dynamicBgColor);
      }
      if (typeof data.dynamicColor !== 'undefined') {
        setDynamicColor(data.dynamicColor);
        console.log('GaticosYMonetes: Recibido dynamicColor', data.dynamicColor);
      }
      if (typeof data.wrapperBgColor !== 'undefined') setWrapperBgColor(data.wrapperBgColor);
      if (typeof data.dynamicWrapperBgColor !== 'undefined') setDynamicWrapperBgColor(data.dynamicWrapperBgColor);
    });

    // Intervalo para cambiar imágenes
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => {
        const newIndex = (prevIndex + 1) % Object.values(galerias)[0]?.imagenes.length;
        
        // Cambiar el color del borde
        const neonColors = [
          '#00ff00', // verde
          '#ff00ff', // magenta
          '#00ffff', // cyan
          '#ffff00', // amarillo
          '#ff00ff', // rosa
          '#00ff00', // verde
          '#ff0000', // rojo
          '#0000ff'  // azul
        ];
        const randomColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        setBorderColor(randomColor);
        
        return newIndex;
      });
    }, 3000); // Cambiar cada 3 segundos

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(interval);
    };
  }, [galerias]);

  // Animación de kudos recibidos
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const bubbleSize = 6 * (window.innerWidth / 100);

      function animateKudos(time) {
        kudosDataRef.current.forEach(kudo => {
          const element = elementsRef.current[kudo.id];
          if (!element) return;

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

          gsap.set(element, { 
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

  const getClipPath = () => {
    if (backgroundFormat === 'polygons') {
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    }
    return 'circle(50% at 50% 50%)';
  };

  const renderActiveKudos = () => {
    return receivedKudos.map((kudo) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const speed = Math.random() * 2 + 3;

      return (
        <div
          key={kudo.id}
          ref={el => {
            if (el && !elementsRef.current[kudo.id]) {
              elementsRef.current[kudo.id] = el;
            }
          }}
          className="emoji-option dragonball"
          style={{
            background: 'none',
            perspective: '600px',
            overflow: 'visible',
            position: 'absolute',
            left: `${kudo.x}px`,
            top: `${kudo.y}px`,
            width: '6vw',
            height: '6vw',
            minWidth: 48,
            minHeight: 48,
            maxWidth: 120,
            maxHeight: 120,
            transform: `scale(${kudo.baseScale})`,
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
              {kudo.emoji}
            </span>
            <span className="dragonball-face back" style={{
              position: 'absolute',
              left: 0, top: 0, width: '100%', height: '100%',
              display: 'block',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}>
              <span style={{position: 'relative', width: '100%', height: '100%', display: 'block'}}>
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
                }}>{kudo.emoji}</span>
              </span>
            </span>
          </Sphere>
        </div>
      );
    });
  };

  return (
    <div className="gaticos-y-monetes-container" ref={containerRef} style={{
      background: imageBgColor !== 'transparent' ? imageBgColor : undefined,
      transition: 'background 0.7s',
    }}>
      <div className="drum-hero">
        <div 
          className="image-container"
          style={{
            clipPath: getClipPath(),
            WebkitClipPath: getClipPath()
          }}
        >
          <div 
            className="image-wrapper"
            style={{
              border: `3px solid ${borderColor}`,
              boxShadow: `0 0 10px ${borderColor}, 0 0 20px ${borderColor}`,
              filter: 'brightness(1.2)',
              background: wrapperBgColor !== 'transparent' ? wrapperBgColor : undefined
            }}
          >
            {Object.values(galerias)[0]?.imagenes[currentImageIndex] && (
              <img 
                src={Object.values(galerias)[0].imagenes[currentImageIndex]} 
                alt="Galería"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            )}
          </div>
        </div>
      </div>
      {renderActiveKudos()}
    </div>
  );
};

export default GaticosYMonetes; 