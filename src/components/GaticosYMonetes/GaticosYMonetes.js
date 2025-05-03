import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import GaleriaLoader from './GaleriaLoader';
import './GaticosYMonetes.scss';

const GaticosYMonetes = () => {
  const [receivedKudos, setReceivedKudos] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [borderColor, setBorderColor] = useState('#00ff00');
  const [backgroundFormat, setBackgroundFormat] = useState('polygons');
  const socketRef = useRef(null);
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

    socketRef.current.on('kudo', (kudo) => {
      console.log('GaticosYMonetes: Nuevo kudo recibido:', kudo);
      setReceivedKudos(prevKudos => [...prevKudos, kudo]);
      
      // Eliminar el kudo después de 5 segundos
      setTimeout(() => {
        setReceivedKudos(prevKudos => prevKudos.filter(k => k.id !== kudo.id));
      }, 5000);
    });

    socketRef.current.on('disconnect', () => {
      console.log('GaticosYMonetes: Desconectado del servidor Socket.IO');
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

  const getClipPath = () => {
    if (backgroundFormat === 'polygons') {
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    }
    return 'circle(50% at 50% 50%)';
  };

  return (
    <div className="gaticos-y-monetes-container">
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
              filter: 'brightness(1.2)'
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
      
      {/* Renderizar los kudos recibidos */}
      {receivedKudos.map(kudo => (
        <div
          key={kudo.id}
          className="floating-kudo"
          style={{
            left: `${kudo.x}%`,
            top: `${kudo.y}%`,
            transform: `scale(${kudo.scale}) rotate(${kudo.rotation}deg)`
          }}
        >
          {kudo.emoji}
        </div>
      ))}
    </div>
  );
};

export default GaticosYMonetes; 